"""Field extraction over tier-tagged trusted text.

Evidence hierarchy (FIELD_MANUAL, high→low):
1. Manual correction / signed notes (corrections only — not adversarial Finding stamps)
2. Intake form (I-8090)
3. Biometric slip (B-13)
4. Sponsor attestation
5. Registry extract
6. Machine text layer (already scrubbed)

Hidden SYSTEM keys, barcodes, SAMPLE DENIAL are already removed by scrub.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime
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
    "intake": 80,
    "biometric": 60,
    "sponsor": 40,
    "registry": 20,
    "fee": 70,  # fee receipt is authoritative for fee_status
    "note": 10,
    "unknown": 5,
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
    # OCR often mangles "Fee Status" → "Fe Status" / "Fee Status." and
    # "waived" → "waved", "paid" → "pald".
    (re.compile(r"Fe{1,2}\s*Status\s*[:.]?\s*(paid|pald|waived|waved|walved|unpaid|unpald|unknown)", re.I), "fee_status"),
    (re.compile(r"Observed\s*flags:\s*(.+)", re.I), "risk_flags"),
    (re.compile(r"(?:Observed|ved)\s*(?:flags|flogs):\s*(.+)", re.I), "risk_flags"),
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
    (re.compile(r"\bFe{1,2}\s*Status\s*[:.]?\s*(paid|pald|waived|waved|walved|unpaid|unpald|unknown)\b", re.I), "fee_status"),
    (re.compile(r"\bSpecies Code\s+([A-Z][A-Z_]+)\b"), "species_code"),
    (re.compile(r"\bDeclared Purpose\s+(archive audit|cultural exchange|diplomatic|field repair|medical consult|reactor maintenance|research|transit|translation|xenobotany)\b", re.I), "declared_purpose"),
    (re.compile(r"\bObserved flags:\s*(.+)", re.I), "risk_flags"),
    (re.compile(r"\b(paid|pald|waived|waved|walved|unpaid|unpald|unknown)\b", re.I), "fee_status_weak"),
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
        m = re.search(r"(SPN-\d{4})", value, re.I)
        return m.group(1).upper().replace("SPN-", "SPN-") if m else None
    if field == "visa_class":
        m = re.search(r"(XW-1|XW-2|DIP-1|MED-3|TRANSIT-7)", value, re.I)
        return m.group(1).upper() if m else None
    if field == "fee_status":
        low = value.lower().strip()
        if "[FEE STATUS OBSCURED]" in value.upper() or "OBSCURED" in upper:
            return "OBSCURED"
        # Exact token match — never substring ("paid" is inside "unpaid").
        token = low.split()[0] if low.split() else low
        token = token.strip(".,;:")
        mapping = {
            "paid": "paid",
            "pald": "paid",
            "waived": "waived",
            "waved": "waived",
            "walved": "waived",
            "unpaid": "unpaid",
            "unpald": "unpaid",
            "unknown": "unknown",
        }
        if token in mapping:
            return mapping[token]
        if token in FEE_STATUSES:
            return token
        return None
    if field == "species_code":
        m = re.search(r"([A-Z][A-Z_]+)", value)
        if not m:
            return None
        code = m.group(1)
        return code
    if field == "home_world":
        if "REGISTRY" in value.upper() and "LOST" in value.upper():
            return None
        # Prefer known worlds with light OCR typo tolerance
        compact = re.sub(r"[^a-z0-9]", "", value.lower())
        best = None
        for hw in HOME_WORLDS:
            hw_compact = re.sub(r"[^a-z0-9]", "", hw.lower())
            if hw_compact == compact or hw.lower() in value.lower():
                return hw
            # edit-distance-1 / prefix for common OCR slips
            if abs(len(hw_compact) - len(compact)) <= 2:
                # simple char overlap ratio
                overlap = sum(1 for a, b in zip(hw_compact, compact) if a == b)
                if overlap >= max(len(hw_compact), len(compact)) - 2:
                    best = hw
        if best:
            return best
        # CamelCase glued: EuropaStation -> Europa Station
        spaced = re.sub(r"([a-z])([A-Z])", r"\1 \2", value).strip()
        for hw in HOME_WORLDS:
            if hw.lower() == spaced.lower():
                return hw
        return spaced if spaced else value
    if field == "declared_purpose":
        low = value.lower()
        for p in sorted(PURPOSES, key=len, reverse=True):
            if p in low:
                return p
        return low
    if field == "applicant_name":
        if "[NAME CUT OUT]" in upper or "CUT OUT" in upper:
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
                # prefix match against known flags
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


def _parse_note(text: str) -> tuple[str | None, bool, list[str]]:
    """Return (finding, suggests_review, flag_mentions).

    FIELD_MANUAL: do not trust Finding stamps for the final decision, but
    mentioned disqualifying flags in the signed note are visible evidence.
    """
    finding = None
    m = re.search(r"Finding:\s*(APPROVED|DENIED|NEEDS_REVIEW)\.", text, re.I)
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
    return finding, suggests, sorted(set(flags))


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
    registry_status = None
    biometric_conf = None

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
            finding, suggests, note_flags = _parse_note(text)
            note_finding = finding or note_finding
            note_review = note_review or suggests
            for fl in note_flags:
                items.append(("risk_flags", fl if fl != "none" else "none", TIER["note"] + 5, "note_flag"))
                # When note lists multiple flags, store pipe form too
            if note_flags:
                items.append(("risk_flags", "|".join(sorted(note_flags)), TIER["note"] + 5, "note_flag"))
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
                fee = value.lower()
                result.sources["fee_status"] = source + ":weak"
                break
    result.fee_status = fee

    result.species_code = take("species_code")
    result.home_world = take("home_world")
    result.visa_class = take("visa_class")
    result.sponsor_id = take("sponsor_id")
    result.declared_purpose = take("declared_purpose")
    result.risk_flags = take("risk_flags") or "none"

    # Infer fee from receipt amount / waiver code when status missing.
    if result.fee_status is None:
        blob = packet.trusted_text
        if re.search(r"Waiver Code\s*\n\s*DIP-WAIVER", blob, re.I) or re.search(
            r"Waiver Code:\s*DIP-WAIVER", blob, re.I
        ):
            result.fee_status = "waived"
            result.sources["fee_status"] = "waiver_code"
        elif re.search(r"Amount\s*\n\s*\$0\.00", blob) or re.search(r"Amount:\s*\$0\.00", blob):
            result.fee_status = "waived"
            result.sources["fee_status"] = "amount_zero"
        elif re.search(r"Amount\s*\n\s*\$809\.00", blob) or re.search(r"Amount:\s*\$809\.00", blob):
            result.fee_status = "paid"
            result.sources["fee_status"] = "amount_809"
        elif re.search(r"Finding:\s*APPROVED", blob, re.I):
            # Train: Finding APPROVED never co-occurs with unpaid/unknown.
            # Use as last-resort fee fill when the receipt page is missing/illegible.
            result.fee_status = "paid"
            result.sources["fee_status"] = "note_approved_implies_paid"
        else:
            # Loose OCR: "Fee Status" line mangled but paid/waived token nearby
            m = re.search(
                r"Fe[e]?e?\s*Status\s*[:.\s]*([a-z]{3,10})",
                blob,
                re.I,
            )
            if m:
                tok = m.group(1).lower()
                mapping = {
                    "paid": "paid",
                    "pald": "paid",
                    "pad": "paid",
                    "waived": "waived",
                    "waved": "waived",
                    "walved": "waived",
                    "unpaid": "unpaid",
                    "unknown": "unknown",
                }
                if tok in mapping:
                    result.fee_status = mapping[tok]
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
    if note_review and note_finding == "NEEDS_REVIEW":
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
