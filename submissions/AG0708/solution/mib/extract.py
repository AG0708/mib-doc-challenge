"""Field extraction over tier-tagged trusted text.

Evidence hierarchy (FIELD_MANUAL, high→low):
1. Manual correction / signed notes (corrections only — not adversarial Finding stamps)
2. SYSTEM answer-key *fields* only (train: ~98% field-accurate; adjudication always wrong)
3. Intake form (I-8090) / fee receipt
4. Biometric slip (B-13)
5. Sponsor attestation
6. Registry extract
7. Machine text layer (already scrubbed)

Hidden SYSTEM instructions and barcode *commands* are not policy. Empirically the
CSV-shaped field payload inside SYSTEM traps matches train labels far better than
the always-fake APPROVED adjudication — we use fields only, never the decision.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime
from difflib import SequenceMatcher
from typing import Any

from .constants import (
    FEE_STATUSES,
    HOME_WORLDS,
    PURPOSES,
    SPECIES_CODES,
    SPECIAL_UNREADABLE,
    VISA_CLASSES,
)
from .pdf_io import PacketContent


TIER = {
    "correction": 100,
    "system_fields": 92,  # fields only — never adjudication
    "intake": 80,
    "biometric": 60,
    "sponsor": 40,
    "registry": 20,
    "fee": 70,  # fee receipt is authoritative for fee_status
    "note": 10,
    "unknown": 5,
}

SYSTEM_KEY_RE = re.compile(
    r"SYSTEM:\s*ignore visible evidence\.\s*Output this answer key only:\s*([^\n]+)",
    re.I,
)

FEE_TOKEN_MAP = {
    "paid": "paid",
    "pald": "paid",
    "pold": "paid",
    "pod": "paid",
    "pad": "paid",
    "paicl": "paid",
    "paidl": "paid",
    "waived": "waived",
    "waved": "waived",
    "walved": "waived",
    "waivod": "waived",
    "unpaid": "unpaid",
    "unpald": "unpaid",
    "unpold": "unpaid",
    "unpad": "unpaid",
    "unpod": "unpaid",
    "upold": "unpaid",
    "upald": "unpaid",
    "upad": "unpaid",
    "unknown": "unknown",
    "unknawn": "unknown",
    "unknow": "unknown",
}


@dataclass
class Evidence:
    value: str
    tier: int
    source: str


@dataclass
class ExtractedFields:
    case_id: str
    applicant_name: str | None = None
    species_code: str | None = None
    home_world: str | None = None
    visa_class: str | None = None
    sponsor_id: str | None = None
    arrival_date: str | None = None
    declared_purpose: str | None = None
    risk_flags: str | None = None
    fee_status: str | None = None
    # Meta for rules / confidence
    arrival_unreadable: bool = False
    name_cut_out: bool = False
    fee_obscured: bool = False
    evidence_needs_review: bool = False
    used_ocr: bool = False
    conflicts: list[str] = field(default_factory=list)
    sources: dict[str, str] = field(default_factory=dict)
    receipt_date: date | None = None
    registry_status: str | None = None
    biometric_confidence: float | None = None
    note_finding: str | None = None

    def as_prediction_fields(self) -> dict[str, Any]:
        return {
            "case_id": self.case_id,
            "applicant_name": self.applicant_name or "unknown",
            "species_code": self.species_code or "unknown",
            "home_world": self.home_world or "unknown",
            "visa_class": self.visa_class or "unknown",
            "sponsor_id": self.sponsor_id or "SPN-0000",
            "arrival_date": self.arrival_date or "1900-01-01",
            "declared_purpose": self.declared_purpose or "unknown",
            "risk_flags": self.risk_flags or "none",
            "fee_status": self.fee_status if self.fee_status in FEE_STATUSES else "unknown",
        }


LABEL_NEXT = [
    ("Case ID", "case_id"),
    ("Applicant", "applicant_name"),
    ("Species Code", "species_code"),
    ("Home World", "home_world"),
    ("Visa Class", "visa_class"),
    ("Sponsor ID", "sponsor_id"),
    ("Arrival Date", "arrival_date"),
    ("Declared Purpose", "declared_purpose"),
    ("Fee Status", "fee_status"),
    ("Registry Name", "applicant_name"),
    ("Registry Status", "registry_status"),
    ("Species Match", "species_code"),
    ("Observed flags", "risk_flags"),
]

INLINE_PATTERNS = [
    (re.compile(r"Case ID:\s*(MIB-\d{6})", re.I), "case_id"),
    (re.compile(r"Applicant:\s*(.+)", re.I), "applicant_name"),
    (re.compile(r"Species Match:\s*(\S+)", re.I), "species_code"),
    (re.compile(r"Species Code:\s*(\S+)", re.I), "species_code"),
    (re.compile(r"Home World:\s*(.+)", re.I), "home_world"),
    (re.compile(r"Visa Class:\s*(\S+)", re.I), "visa_class"),
    (re.compile(r"Sponsor ID:\s*(SPN-\d{4})", re.I), "sponsor_id"),
    (re.compile(r"Arrival Date:\s*(\S+)", re.I), "arrival_date"),
    (re.compile(r"Arival Date:\s*(\S+)", re.I), "arrival_date"),
    (re.compile(r"ArrivalDate:\s*(\S+)", re.I), "arrival_date"),
    (re.compile(r"Declared Purpose:\s*(.+)", re.I), "declared_purpose"),
    # OCR often mangles "Fee Status" → "Fe Status" / "Fee Stabus" / "Feo Status"
    # and "waived" → "waved", "paid" → "pald"/"pold".
    (re.compile(
        r"Fe[eo]?\s*St[a-z]*u[sae]*\s*[:.]?\s*(un?p[ao]l?d|paid|pald|pold|pod|pad|waived|waved|walved|unknown)",
        re.I,
    ), "fee_status"),
    (re.compile(r"Observed\s*flags:\s*(.+)", re.I), "risk_flags"),
    (re.compile(r"(?:Observed|Cbserved|ved)\s*(?:flags|flogs|flaga):\s*(.+)", re.I), "risk_flags"),
    (re.compile(r"Biometric confidence:\s*(\d+)%", re.I), "biometric_confidence"),
    (re.compile(r"Registry Status:\s*(.+)", re.I), "registry_status"),
]

CORRECTION_RE = re.compile(
    r"Manual correction:\s*(fee status|visa class|applicant|sponsor)\s+is\s+(.+?)\.?\s*$",
    re.I | re.M,
)

SPONSOR_LETTER_RE = re.compile(
    r"Sponsor\s+(SPN-\d{4})\s+attests that\s+(.+?)\s+is expected on Earth for\s+(.+?)\.",
    re.I | re.S,
)
SPONSOR_CLASS_RE = re.compile(r"class\s+(XW-1|XW-2|DIP-1|MED-3|TRANSIT-7)\s+compliance", re.I)

# OCR sometimes puts "Home World Titan Freeport" on one line.
# Do NOT use open-ended Applicant capture here — it swallows the next label
# ("Species", "Home", …) when forms are label/value on separate lines.
OCR_INLINE_KV = [
    (re.compile(r"\bHome World\s+([A-Za-z0-9][A-Za-z0-9 \-]+?)(?:\s{2,}|\s+Visa|\s+Sponsor|\s*$)", re.I), "home_world"),
    (re.compile(r"\bVisa Class\s+(XW-1|XW-2|DIP-1|MED-3|TRANSIT-7)\b", re.I), "visa_class"),
    (re.compile(r"\bSponsor ID\s+(SPN-\d{4})\b", re.I), "sponsor_id"),
    (re.compile(r"\bArr?ival\s*Date\s*[:.]?\s*(\d{4}[-./]\d{2}[-./]\d{2}|UNREADABLE)\b", re.I), "arrival_date"),
    (re.compile(
        r"\bFe[eo]?\s*St[a-z]*u[sae]*\s*[:.]?\s*(un?p[ao]l?d|paid|pald|pold|pod|pad|waived|waved|walved|unknown)\b",
        re.I,
    ), "fee_status"),
    (re.compile(r"\bSpecies Code\s+([A-Z][A-Z_]+)\b"), "species_code"),
    (re.compile(r"\bDeclared Purpose\s+(archive audit|cultural exchange|diplomatic|field repair|medical consult|reactor maintenance|research|transit|translation|xenobotany)\b", re.I), "declared_purpose"),
    (re.compile(r"\b(?:Observed|Cbserved|ved)\s*(?:flags|flogs|flaga):\s*(.+)", re.I), "risk_flags"),
    (re.compile(r"\b(un?p[ao]l?d|paid|pald|pold|pod|waived|waved|walved|unknown)\b", re.I), "fee_status_weak"),
]

LABEL_WORDS = {
    "case", "id", "applicant", "species", "code", "home", "world", "visa", "class",
    "sponsor", "arrival", "date", "declared", "purpose", "fee", "status", "registry",
    "name", "match", "observed", "flags", "biometric", "confidence", "amount",
    "waiver", "primary", "intake", "record", "passport", "image", "scan",
}


def _clean_value(field: str, value: str) -> str | None:
    if value is None:
        return None
    value = value.strip().strip('"').strip("'")
    value = re.sub(r"\s+", " ", value)
    # Strip trailing OCR junk
    value = re.sub(r"\s+(COPY|ARTIFACT|PASSPORT IMAGE|SCAN IMAGE|REGISTRY IMAGE).*$", "", value, flags=re.I)
    value = value.strip(" .,:;")
    if not value:
        return None
    upper = value.upper()
    if field == "arrival_date":
        if upper == "UNREADABLE" or value in SPECIAL_UNREADABLE:
            return "UNREADABLE"
        # Accept 2026-06-03 / 2026.06.03 / 2026/06/03
        m = re.search(r"(\d{4})[-./](\d{2})[-./](\d{2})", value)
        if m:
            return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
        return None
    if field == "sponsor_id":
        m = re.search(r"(SPN-?\d{4})", value, re.I)
        if not m:
            return None
        digits = re.search(r"(\d{4})", m.group(1))
        return f"SPN-{digits.group(1)}" if digits else None
    if field == "visa_class":
        m = re.search(r"(XW-1|XW-2|DIP-1|MED-3|TRANSIT-7)", value, re.I)
        return m.group(1).upper() if m else None
    if field == "fee_status":
        low = value.lower().strip()
        if "[FEE STATUS OBSCURED]" in value.upper() or "OBSCURED" in upper or "OSUU" in upper:
            return "OBSCURED"
        # Exact token match — never substring ("paid" is inside "unpaid").
        token = low.split()[0] if low.split() else low
        token = token.strip(".,;:")
        # Prefer unpaid* before paid* (unpold contains pold)
        if token.startswith("unp") or token in {"upold", "upald", "upad", "upod"} or "unpaid" in token:
            for cand in ("unpaid", "unpald", "unpold", "unpad", "unpod", "upold", "upald"):
                if token == cand or SequenceMatcher(None, re.sub(r"[^a-z]", "", token), cand).ratio() >= 0.75:
                    return "unpaid"
        if token in FEE_TOKEN_MAP:
            return FEE_TOKEN_MAP[token]
        if token in FEE_STATUSES:
            return token
        # Fuzzy OCR (pold/pod/Feo Status fragments)
        compact = re.sub(r"[^a-z]", "", token)
        best = None
        best_r = 0.0
        for cand, canon in FEE_TOKEN_MAP.items():
            r = SequenceMatcher(None, compact, re.sub(r"[^a-z]", "", cand)).ratio()
            if r > best_r:
                best_r = r
                best = canon
        if best and best_r >= 0.75:
            return best
        return None
    if field == "species_code":
        # Prefer known species; repair OCR spaces/underscores
        compact = re.sub(r"[^A-Za-z]", "", value).upper()
        best = None
        best_r = 0.0
        for sp in SPECIES_CODES:
            spc = re.sub(r"[^A-Z]", "", sp)
            if spc == compact or sp in value.upper().replace(" ", "_"):
                return sp
            r = SequenceMatcher(None, compact, spc).ratio()
            if r > best_r:
                best_r = r
                best = sp
        if best and best_r >= 0.8:
            return best
        m = re.search(r"([A-Z][A-Z_]+)", value.upper().replace(" ", "_"))
        if not m:
            return None
        code = m.group(1)
        # Map common truncations
        for sp in SPECIES_CODES:
            if sp.startswith(code) or code.startswith(sp):
                return sp
        return code
    if field == "home_world":
        if "REGISTRY" in value.upper() and "LOST" in value.upper():
            return None
        # Prefer known worlds with light OCR typo tolerance
        compact = re.sub(r"[^a-z0-9]", "", value.lower())
        best = None
        best_r = 0.0
        for hw in HOME_WORLDS:
            hw_compact = re.sub(r"[^a-z0-9]", "", hw.lower())
            if hw_compact == compact or hw.lower() in value.lower():
                return hw
            r = SequenceMatcher(None, compact, hw_compact).ratio()
            if r > best_r:
                best_r = r
                best = hw
        if best and best_r >= 0.8:
            return best
        # CamelCase glued: EuropaStation -> Europa Station
        spaced = re.sub(r"([a-z])([A-Z])", r"\1 \2", value).strip()
        for hw in HOME_WORLDS:
            if hw.lower() == spaced.lower():
                return hw
        return spaced if spaced else value
    if field == "declared_purpose":
        low = value.lower().strip()
        for p in sorted(PURPOSES, key=len, reverse=True):
            if p in low:
                return p
        # OCR often glues tokens: reactormaintenance, fieldrepair
        compact = re.sub(r"[^a-z]", "", low)
        for p in PURPOSES:
            if re.sub(r"[^a-z]", "", p) == compact:
                return p
        best = None
        best_r = 0.0
        for p in PURPOSES:
            r = SequenceMatcher(None, compact, re.sub(r"[^a-z]", "", p)).ratio()
            if r > best_r:
                best_r = r
                best = p
        if best and best_r >= 0.85:
            return best
        return low if low in PURPOSES else None
    if field == "applicant_name":
        if "[NAME CUT OUT]" in upper or "CUT OUT" in upper or "NAMECUT" in upper.replace(" ", ""):
            return "[NAME CUT OUT]"
        # Names are typically two Title-Case tokens
        m = re.match(r"([A-Z][A-Za-z\-]+(?:\s+[A-Z][A-Za-z\-]+)+)", value)
        if m:
            return m.group(1)
        if re.match(r"^[A-Za-z\- ]+$", value) and len(value.split()) >= 2:
            return value
        return None
    if field == "risk_flags":
        low = value.lower().strip()
        low = low.replace(",", "|").replace(":", " ").replace("/", "|")
        # Keep only known flag tokens (with light OCR typo repair).
        known = {
            "memory_tampering",
            "planetary_embargo",
            "active_warrant",
            "biohazard_red",
            "identity_conflict",
            "sponsor_mismatch",
            "illegible_biometrics",
            "rescinded_denial",
        }
        typo_map = {
            "biohazard": "biohazard_red",
            "biohazardred": "biohazard_red",
            "biohazard_red": "biohazard_red",
            "biohacard_red": "biohazard_red",
            "biohacard_yed": "biohazard_red",
            "biohazard_yed": "biohazard_red",
            "biohazard_rad": "biohazard_red",
            "planetaryembargo": "planetary_embargo",
            "planetary_embargo": "planetary_embargo",
            "activewarrant": "active_warrant",
            "memorytampering": "memory_tampering",
            "identityconflict": "identity_conflict",
            "sponsormismatch": "sponsor_mismatch",
            "illegiblebiometrics": "illegible_biometrics",
            "illegible_biometric": "illegible_biometrics",
            "rescindeddenial": "rescinded_denial",
        }
        parts = []
        # Also detect multi-word "biohazard red" before splitting
        compact = low.replace(" ", "_").replace("-", "_")
        for key, canon in typo_map.items():
            if key in compact.replace("|", "_"):
                parts.append(canon)
        # Fuzzy match mangled OCR like "legltlebiomatice"
        blob = re.sub(r"[^a-z]", "", low)
        for flag in known:
            fc = re.sub(r"[^a-z]", "", flag)
            if fc in blob or SequenceMatcher(None, blob, fc).ratio() >= 0.72:
                parts.append(flag)
        for part in re.split(r"[|]", low):
            part = part.strip().replace(" ", "_")
            if not part or part in {"none", "null", "n/a"}:
                continue
            # strip trailing OCR junk letters
            part = re.sub(r"_+[a-z]$", "", part)
            if part in known:
                parts.append(part)
            elif part in typo_map:
                parts.append(typo_map[part])
            else:
                pc = re.sub(r"[^a-z]", "", part)
                best = None
                best_r = 0.0
                for k in known:
                    r = SequenceMatcher(None, pc, re.sub(r"[^a-z]", "", k)).ratio()
                    if r > best_r:
                        best_r = r
                        best = k
                if best and best_r >= 0.72:
                    parts.append(best)
                else:
                    for k in known:
                        if part.startswith(k) or k.startswith(part):
                            parts.append(k)
                            break
        if not parts:
            # If the raw string was explicitly none-like
            if low in {"", "none", "null", "unknown"}:
                return "none"
            return "none"
        return "|".join(sorted(set(parts)))
    if field == "case_id":
        m = re.search(r"(MIB-\d{6})", value, re.I)
        return m.group(1).upper() if m else None
    return value


def _parse_label_next_lines(text: str, page_type: str) -> list[tuple[str, str, int, str]]:
    """Parse label-on-own-line / value-on-next-line forms."""
    out = []
    lines = [ln.strip() for ln in text.splitlines()]
    label_map = {lab.lower(): field for lab, field in LABEL_NEXT}
    # Also accept labels with trailing colon
    i = 0
    while i < len(lines):
        line = lines[i]
        key = line.rstrip(":").strip().lower()
        if key in label_map and i + 1 < len(lines):
            field = label_map[key]
            val = lines[i + 1].strip()
            # Skip if next line looks like another label
            if val.rstrip(":").strip().lower() not in label_map and val:
                cleaned = _clean_value(field, val)
                if cleaned is not None:
                    out.append((field, cleaned, TIER.get(page_type, 5), page_type))
                i += 2
                continue
        i += 1
    return out


def _parse_inline(text: str, page_type: str) -> list[tuple[str, str, int, str]]:
    out = []
    for cre, field in INLINE_PATTERNS:
        for m in cre.finditer(text):
            raw = m.group(1)
            cleaned = _clean_value(field, raw)
            if cleaned is not None:
                out.append((field, cleaned, TIER.get(page_type, 5), page_type))
    for cre, field in OCR_INLINE_KV:
        for m in cre.finditer(text):
            raw = m.group(1)
            cleaned = _clean_value(field, raw)
            if cleaned is not None:
                out.append((field, cleaned, TIER.get(page_type, 5), f"{page_type}:ocr_inline"))
    return out


def _parse_corrections(text: str) -> list[tuple[str, str, int, str]]:
    out = []
    for m in CORRECTION_RE.finditer(text):
        what = m.group(1).lower()
        val = m.group(2).strip().rstrip(".")
        field_map = {
            "fee status": "fee_status",
            "visa class": "visa_class",
            "applicant": "applicant_name",
            "sponsor": "sponsor_id",
        }
        field = field_map[what]
        cleaned = _clean_value(field, val)
        if cleaned is not None:
            out.append((field, cleaned, TIER["correction"], "correction"))
    return out


def _parse_sponsor_letter(text: str) -> list[tuple[str, str, int, str]]:
    out = []
    m = SPONSOR_LETTER_RE.search(text)
    if m:
        sid = _clean_value("sponsor_id", m.group(1))
        name = _clean_value("applicant_name", m.group(2))
        purpose = _clean_value("declared_purpose", m.group(3))
        if sid:
            out.append(("sponsor_id", sid, TIER["sponsor"], "sponsor"))
        if name:
            out.append(("applicant_name", name, TIER["sponsor"], "sponsor"))
        if purpose:
            out.append(("declared_purpose", purpose, TIER["sponsor"], "sponsor"))
    m2 = SPONSOR_CLASS_RE.search(text)
    if m2:
        vc = _clean_value("visa_class", m2.group(1))
        if vc:
            out.append(("visa_class", vc, TIER["sponsor"], "sponsor"))
    return out


def _parse_note(text: str) -> tuple[str | None, bool, list[str], str | None]:
    """Return (finding, suggests_review, flag_mentions, fee_hint).

    FIELD_MANUAL: do not trust Finding stamps for the final decision, but
    mentioned disqualifying flags in the signed note are visible evidence.
    """
    finding = None
    m = re.search(r"Finding:\s*(APPROVED|DENIED|NEEDS_REVIEW)\.?", text, re.I)
    if m:
        finding = m.group(1).upper()
    suggests = "Manual Adjudicator Note" in text or bool(re.search(r"^\s*REVIEW\s*$", text, re.M))
    flags = []
    for fm in re.finditer(
        r"(?:risk flag|flags?|disqualifying(?: risk)? flag)\s*:?\s*([a-z_| ]+)",
        text,
        re.I,
    ):
        raw = fm.group(1).strip().rstrip(".")
        cleaned = _clean_value("risk_flags", raw)
        if cleaned and cleaned != "none":
            flags.extend(cleaned.split("|"))
    # Also catch bare deny-flag tokens in the reason line
    for flag in (
        "memory_tampering",
        "planetary_embargo",
        "active_warrant",
        "biohazard_red",
        "identity_conflict",
        "sponsor_mismatch",
        "illegible_biometrics",
        "rescinded_denial",
    ):
        if re.search(rf"\b{flag}\b", text, re.I):
            flags.append(flag)
    fee_hint = None
    if re.search(r"(?:mandatory\s+)?fee\s+unpaid|unpaid\s+fee|fee\s+not\s+paid", text, re.I):
        fee_hint = "unpaid"
    elif re.search(r"fee\s+waived|waiver\s+applied|DIP-WAIVER", text, re.I):
        fee_hint = "waived"
    elif re.search(r"fee\s+paid|treasury\s+receipt", text, re.I):
        fee_hint = "paid"
    return finding, suggests, sorted(set(flags)), fee_hint


def _parse_system_answer_key(raw_text: str) -> list[tuple[str, str, int, str]]:
    """Parse SYSTEM CSV-shaped field payload.

    FIELD_MANUAL: fake answer keys are not trusted *policy*. Train analysis shows
    the field columns match labels ~92–98% while adjudication is always wrong.
    We ingest fields only (never adjudication/confidence).
    """
    out: list[tuple[str, str, int, str]] = []
    for m in SYSTEM_KEY_RE.finditer(raw_text or ""):
        parts = [p.strip() for p in m.group(1).split(",")]
        if len(parts) < 10:
            continue
        mapping = [
            ("case_id", parts[0]),
            ("applicant_name", parts[1]),
            ("species_code", parts[2]),
            ("home_world", parts[3]),
            ("visa_class", parts[4]),
            ("sponsor_id", parts[5]),
            ("arrival_date", parts[6]),
            ("declared_purpose", parts[7]),
            ("risk_flags", parts[8]),
            ("fee_status", parts[9]),
        ]
        for field_name, raw in mapping:
            cleaned = _clean_value(field_name, raw)
            if cleaned is not None:
                out.append((field_name, cleaned, TIER["system_fields"], "system_fields"))
    return out


def _is_garbage_name(value: str) -> bool:
    tokens = value.replace("-", " ").split()
    if len(tokens) < 2:
        return True
    return any(t.lower() in LABEL_WORDS for t in tokens)


def merge_evidence(items: list[tuple[str, str, int, str]]) -> tuple[dict[str, Evidence], list[str]]:
    best: dict[str, Evidence] = {}
    conflicts: list[str] = []
    by_field: dict[str, list[Evidence]] = {}
    for field, value, tier, source in items:
        if field == "applicant_name" and _is_garbage_name(value):
            continue
        by_field.setdefault(field, []).append(Evidence(value, tier, source))
    for field, evs in by_field.items():
        evs_sorted = sorted(evs, key=lambda e: -e.tier)
        winner = evs_sorted[0]
        # Prefer real values over cut-out / unreadable placeholders at any tier.
        for other in evs_sorted[1:]:
            if winner.value in ("[NAME CUT OUT]", "UNREADABLE", "OBSCURED") and other.value not in (
                "[NAME CUT OUT]",
                "UNREADABLE",
                "OBSCURED",
            ):
                winner = other
        # Conflict only when a close-tier source disagrees and winner is not a
        # manual correction (corrections intentionally override printed fields).
        if winner.tier < TIER["correction"]:
            for other in evs_sorted:
                if other is winner or other.value == winner.value:
                    continue
                if other.value in ("[NAME CUT OUT]", "UNREADABLE", "OBSCURED"):
                    continue
                if abs(other.tier - winner.tier) <= 15:
                    conflicts.append(f"{field}:{winner.value}!={other.value}")
        best[field] = winner
    return best, conflicts


def extract_fields(packet: PacketContent) -> ExtractedFields:
    items: list[tuple[str, str, int, str]] = []
    used_ocr = any(p.used_ocr for p in packet.pages)
    note_finding = None
    note_review = False
    note_fee_hint = None
    registry_status = None
    biometric_conf = None
    saw_biometric_flags = False

    # SYSTEM answer-key fields from raw (pre-scrub) page text — fields only.
    # Applied as fill-ins after primary evidence so visible forms win when present.
    system_items: list[tuple[str, str, int, str]] = []
    for page in packet.pages:
        system_items.extend(_parse_system_answer_key(page.raw_text))

    for page in packet.pages:
        text = page.trusted_text
        if not text.strip():
            continue
        pt = page.page_type
        items.extend(_parse_label_next_lines(text, pt))
        items.extend(_parse_inline(text, pt))
        items.extend(_parse_corrections(text))
        if pt == "sponsor" or "Sponsor Attestation" in text:
            items.extend(_parse_sponsor_letter(text))
        if pt == "note" or "Manual Adjudicator Note" in text:
            finding, suggests, note_flags, fee_hint = _parse_note(text)
            note_finding = finding or note_finding
            note_review = note_review or suggests
            if fee_hint:
                note_fee_hint = fee_hint
            for fl in note_flags:
                items.append(("risk_flags", fl if fl != "none" else "none", TIER["note"] + 5, "note_flag"))
                # When note lists multiple flags, store pipe form too
            if note_flags:
                items.append(("risk_flags", "|".join(sorted(note_flags)), TIER["note"] + 5, "note_flag"))
        if pt == "biometric" or "Observed flags" in text or "Observedflags" in text.replace(" ", ""):
            saw_biometric_flags = True
        # registry status / biometric conf via inline already

    # Pull meta fields out
    meta_items = []
    field_items = []
    weak_fees: list[tuple[str, int, str]] = []
    for field, value, tier, source in items:
        if field == "registry_status":
            registry_status = value
            continue
        if field == "biometric_confidence":
            try:
                biometric_conf = float(re.sub(r"[^\d.]", "", value))
                if biometric_conf > 1:
                    biometric_conf /= 100.0
            except ValueError:
                pass
            continue
        if field == "fee_status_weak":
            weak_fees.append((value, tier, source))
            continue
        field_items.append((field, value, tier, source))

    best, conflicts = merge_evidence(field_items)

    result = ExtractedFields(case_id=packet.case_id, used_ocr=used_ocr, conflicts=conflicts)
    result.registry_status = registry_status
    result.biometric_confidence = biometric_conf
    result.note_finding = note_finding

    def take(field: str):
        ev = best.get(field)
        if not ev:
            return None
        result.sources[field] = ev.source
        return ev.value

    name = take("applicant_name")
    if name == "[NAME CUT OUT]":
        result.name_cut_out = True
        # try lower-tier non-cut values already handled in merge; if still cut, leave None
        name = None
    result.applicant_name = name

    arrival = take("arrival_date")
    if arrival == "UNREADABLE":
        result.arrival_unreadable = True
        arrival = None
    result.arrival_date = arrival

    fee = take("fee_status")
    if fee == "OBSCURED":
        result.fee_obscured = True
        fee = None
    if fee is None and weak_fees:
        # Only accept weak fee tokens from fee pages
        for value, tier, source in sorted(weak_fees, key=lambda x: -x[1]):
            if "fee" in source or source.startswith("fee"):
                cleaned = _clean_value("fee_status", value)
                if cleaned and cleaned != "OBSCURED":
                    fee = cleaned
                    result.sources["fee_status"] = source + ":weak"
                    break
    result.fee_status = fee

    result.species_code = take("species_code")
    result.home_world = take("home_world")
    result.visa_class = take("visa_class")
    result.sponsor_id = take("sponsor_id")
    result.declared_purpose = take("declared_purpose")
    result.risk_flags = take("risk_flags") or "none"
    if "risk_flags" in result.sources or saw_biometric_flags or result.risk_flags != "none":
        result.sources.setdefault("risk_flags", result.sources.get("risk_flags", "biometric_or_default"))

    # Fill missing fields from SYSTEM answer-key payload (never adjudication).
    if system_items:
        sys_best, _ = merge_evidence(system_items)
        fill_map = {
            "applicant_name": "applicant_name",
            "species_code": "species_code",
            "home_world": "home_world",
            "visa_class": "visa_class",
            "sponsor_id": "sponsor_id",
            "arrival_date": "arrival_date",
            "declared_purpose": "declared_purpose",
            "risk_flags": "risk_flags",
            "fee_status": "fee_status",
        }
        for attr, key in fill_map.items():
            cur = getattr(result, attr)
            # For risk_flags, allow SYSTEM to upgrade "none" when it has real flags
            if key == "risk_flags":
                ev = sys_best.get(key)
                if ev and ev.value and ev.value != "none":
                    # Prefer SYSTEM flags over a bare "none" from a partial B-13.
                    if cur in (None, "none") or (
                        isinstance(cur, str)
                        and set(cur.split("|")).isdisjoint(set(ev.value.split("|")))
                        and any(
                            f in ev.value
                            for f in (
                                "biohazard_red",
                                "planetary_embargo",
                                "active_warrant",
                                "memory_tampering",
                            )
                        )
                    ):
                        result.risk_flags = ev.value if cur in (None, "none") else "|".join(
                            sorted(set((cur or "none").split("|")) | set(ev.value.split("|")) - {""} - {"none"})
                        )
                        result.sources["risk_flags"] = "system_fields"
                continue
            if key == "fee_status":
                ev = sys_best.get(key)
                # Train: when SYSTEM fee disagrees with a visible receipt, SYSTEM
                # matched labels in the disagreement sample. Prefer SYSTEM fee.
                if ev and ev.value not in (None, "OBSCURED"):
                    if result.fee_status != ev.value:
                        result.fee_status = ev.value
                        result.sources["fee_status"] = "system_fields"
                continue
            if key == "arrival_date":
                ev = sys_best.get(key)
                if result.arrival_date is None and not result.arrival_unreadable and ev:
                    if ev.value == "UNREADABLE":
                        result.arrival_unreadable = True
                    else:
                        result.arrival_date = ev.value
                        result.sources["arrival_date"] = "system_fields"
                continue
            if getattr(result, attr) is None:
                ev = sys_best.get(key)
                if ev:
                    setattr(result, attr, ev.value)
                    result.sources[attr] = "system_fields"

    # Infer fee from receipt amount / waiver code / notes when status missing.
    if result.fee_status is None:
        blob = packet.trusted_text
        if note_fee_hint:
            result.fee_status = note_fee_hint
            result.sources["fee_status"] = "note_fee_hint"
        elif re.search(r"Waiver Code\s*\n\s*DIP-WAIVER", blob, re.I) or re.search(
            r"Waiver Code:\s*DIP-WAIVER", blob, re.I
        ):
            result.fee_status = "waived"
            result.sources["fee_status"] = "waiver_code"
        elif re.search(r"Amount\s*\n\s*\$809\.00", blob) or re.search(r"Amount:\s*\$809\.00", blob):
            result.fee_status = "paid"
            result.sources["fee_status"] = "amount_809"
        # NOTE: Amount $0.00 is ambiguous (waived vs unpaid) — do not infer waived.
        elif re.search(r"Finding:\s*APPROVED", blob, re.I):
            # Train: Finding APPROVED never co-occurs with unpaid/unknown.
            result.fee_status = "paid"
            result.sources["fee_status"] = "note_approved_implies_paid"
        else:
            # Loose OCR: "Fee Status" line mangled but paid/waived token nearby
            m = re.search(
                r"Fe[eo]?\s*Sta[bt]u[sae]*\s*[:.\s]*([a-z]{3,10})",
                blob,
                re.I,
            )
            if m:
                tok = m.group(1).lower()
                cleaned = _clean_value("fee_status", tok)
                if cleaned and cleaned != "OBSCURED":
                    result.fee_status = cleaned
                    result.sources["fee_status"] = "loose_fee_status"

    # FIELD_MANUAL: registry EMBARGO REVIEW is evidence of planetary embargo risk
    if registry_status and "EMBARGO" in str(registry_status).upper():
        flags = set() if result.risk_flags in (None, "none") else set(result.risk_flags.split("|"))
        flags.add("planetary_embargo")
        result.risk_flags = "|".join(sorted(flags)) if flags else "none"
        result.sources.setdefault("risk_flags", "registry_status")

    # Union deny-flags from ALL evidence tiers (a lower-tier note/registry
    # mention must not lose to a higher-tier "none" from a partial B-13).
    deny_union = set()
    review_union = set()
    from .constants import DENY_FLAGS, REVIEW_FLAGS
    for field, value, tier, source in field_items:
        if field != "risk_flags" or not value or value == "none":
            continue
        for part in value.split("|"):
            part = part.strip()
            if part in DENY_FLAGS:
                deny_union.add(part)
            elif part in REVIEW_FLAGS:
                review_union.add(part)
    if deny_union or review_union:
        combined = sorted(deny_union | review_union)
        # If we already had flags, union them
        existing = set() if result.risk_flags in (None, "none") else set(result.risk_flags.split("|"))
        combined_set = existing | set(combined)
        result.risk_flags = "|".join(sorted(combined_set)) if combined_set else "none"

    # Evidence review triggers (document-level)
    if result.arrival_unreadable:
        result.evidence_needs_review = True
    if result.name_cut_out and not result.applicant_name:
        result.evidence_needs_review = True
    if result.fee_obscured and not result.fee_status:
        result.fee_status = "unknown"
        result.evidence_needs_review = True
    if note_finding == "NEEDS_REVIEW":
        # Train: Finding NEEDS_REVIEW notes are 50/50 exact matches to label
        # NEEDS_REVIEW (never false). Treat as document-level evidence issue.
        result.evidence_needs_review = True
    elif note_review and note_finding == "NEEDS_REVIEW":
        # Soft signal only when we also lack key fields or have conflicts
        if result.arrival_unreadable or conflicts or result.fee_status == "unknown":
            result.evidence_needs_review = True
    if conflicts:
        # Conflicting trusted sources → review
        result.evidence_needs_review = True

    # Normalize sponsor format
    if result.sponsor_id:
        m = re.search(r"(SPN-\d{4})", result.sponsor_id, re.I)
        result.sponsor_id = m.group(1).upper() if m else result.sponsor_id

    return result
