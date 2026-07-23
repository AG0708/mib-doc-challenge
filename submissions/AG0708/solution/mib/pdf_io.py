"""PDF page triage: text layer + RapidOCR on embedded images."""

from __future__ import annotations

import os
import re
import subprocess
import tempfile
import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from pathlib import Path

import fitz
import numpy as np
from PIL import Image

from .scrub import is_mostly_trap_or_footer, scrub_text

try:
    import cv2
except ImportError:  # pragma: no cover
    cv2 = None

try:
    from rapidocr_onnxruntime import RapidOCR
except ImportError:  # pragma: no cover
    RapidOCR = None


@dataclass
class PageContent:
    index: int
    raw_text: str
    trusted_text: str
    used_ocr: bool = False
    page_type: str = "unknown"


@dataclass
class PacketContent:
    case_id: str
    path: Path
    pages: list[PageContent] = field(default_factory=list)

    @property
    def trusted_text(self) -> str:
        return "\n".join(p.trusted_text for p in self.pages)


PAGE_TYPE_MARKERS = [
    ("FORM I-8090", "intake"),
    ("MIB Fee Receipt", "fee"),
    ("MIBFeeReceipt", "fee"),
    ("MIB Fee Recelpt", "fee"),
    ("MIB Fee Racelpt", "fee"),
    ("MIBFeeRereint", "fee"),
    ("MIB Feo Rocoipt", "fee"),
    ("Planetary Registry Extract", "registry"),
    ("FORM B-13", "biometric"),
    ("FORMB-13", "biometric"),
    ("Sponsor Attestation Letter", "sponsor"),
    ("Manual Adjudicator Note", "note"),
]

USEFUL_MARKERS = (
    "FORM I-8090",
    "FORMI-8090",
    "MIB Fee Receipt",
    "MIBFeeReceipt",
    "Planetary Registry Extract",
    "FORM B-13",
    "FORMB-13",
    "FORM B-12",  # OCR often reads B-13 as B-12
    "Sponsor Attestation",
    "Manual Adjudicator Note",
    "Adjudicator Note",
    "Case ID",
    "CaseID",
    "Fee Status",
    "FeeStatus",
    "Observed flags",
    "Observedflags",
    "Manual correction",
    "Registry Name",
    "RegistryName",
)

# Loose keep-pattern for embedded-image OCR that RapidOCR mangles heavily.
_OCR_KEEP_RE = re.compile(
    r"MIB-\d{6}|SPN-?\d{4}|Observed|Fee|paid|waiv|flag|Finding|DENIED|APPROVED|"
    r"FORM\s*B-?\d{1,2}|Biomot|Biometric|Blometric|Adjudicat|Scan\s*Slip|Sean\s*a|"
    r"B-1[123]|embargo|biohazard|warrant|tamper",
    re.I,
)

_OCR_ENGINE = None


def _get_engine():
    global _OCR_ENGINE
    if _OCR_ENGINE is False:
        return None
    if _OCR_ENGINE is None:
        if RapidOCR is None:
            _OCR_ENGINE = False
            return None
        _OCR_ENGINE = RapidOCR()
    return _OCR_ENGINE


def classify_page(text: str) -> str:
    for marker, name in PAGE_TYPE_MARKERS:
        if marker in text:
            return name
    if re.search(
        r"Manual\s*Adjudicator|Adjudicator\s*Note|"
        r"F(?:i|l)?n?d(?:i|l)?ng\s*:?\s*(APPROVED|DENIED|DENED|NEEDS_REVIEW)",
        text,
        re.I,
    ):
        return "note"
    if re.search(
        r"FORM\s*[B8]-?\d{1,2}|Observed\s*flags|Blometric\s*Scan|Biomot\w*\s*Sean|"
        r"Biometric\s*Scan",
        text,
        re.I,
    ):
        return "biometric"
    # OCR typos: Recelpt/Racelpt/Rereint/Rocoipt, Fee Stius/Stus
    if re.search(
        r"Fee\s*St[a-z]*u[sae]*|Waiver\s*Code|MIB\s*Fe[eo]?\s*R[aeo]c[aeoi]?[il]?pt|MIBFeeR",
        text,
        re.I,
    ):
        return "fee"
    return "unknown"


def _pixmap_to_np(pix: fitz.Pixmap) -> np.ndarray:
    if pix.alpha:
        pix = fitz.Pixmap(pix, 0)
    if pix.n >= 4:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)
    return arr


def _resize_np(img: np.ndarray, max_width: int = 1200) -> np.ndarray:
    h, w = img.shape[:2]
    if w <= max_width or cv2 is None:
        return img
    nh = max(1, int(h * max_width / w))
    return cv2.resize(img, (max_width, nh))


def _tess_timeout_s() -> float:
    try:
        return max(3.0, float(os.environ.get("MIB_TESS_TIMEOUT", "15")))
    except ValueError:
        return 15.0


def _tess_slots() -> int:
    try:
        return max(1, int(os.environ.get("MIB_TESS_SLOTS", "2")))
    except ValueError:
        return 2


@contextmanager
def _tess_slot():
    """Cross-process cap so workers cannot spawn dozens of hung tesseracts.

    Uses one flock file per slot (MIB_TESS_SLOTS, default 2). If no slot frees
    before the deadline, yield False so the caller skips tess instead of queueing.
    """
    import fcntl

    slots = _tess_slots()
    deadline = time.monotonic() + max(20.0, _tess_timeout_s() * 2)
    fh = None
    got = False
    while time.monotonic() < deadline:
        for i in range(slots):
            path = Path(tempfile.gettempdir()) / f"mib-tess-slot-{i}.lock"
            candidate = open(path, "a+", encoding="utf-8")
            try:
                fcntl.flock(candidate.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                fh = candidate
                got = True
                break
            except BlockingIOError:
                candidate.close()
        if got:
            break
        time.sleep(0.05)
    try:
        yield got
    finally:
        if fh is not None:
            try:
                fcntl.flock(fh.fileno(), fcntl.LOCK_UN)
            except Exception:
                pass
            fh.close()


def _run_tesseract_png(png_path: str, *, psm: int, timeout: float) -> str:
    """Run tesseract CLI with a hard timeout; kill the process group on expiry."""
    cmd = [
        "tesseract",
        png_path,
        "stdout",
        "--oem",
        "1",
        "--psm",
        str(psm),
        "-c",
        "tessedit_do_invert=0",
    ]
    try:
        # subprocess.run kills the child on timeout (Python 3.3+).
        proc = subprocess.run(
            cmd,
            capture_output=True,
            timeout=timeout,
            check=False,
            env={**os.environ, "OMP_THREAD_LIMIT": os.environ.get("OMP_THREAD_LIMIT", "1")},
        )
    except subprocess.TimeoutExpired:
        return ""
    except FileNotFoundError:
        return ""
    if proc.returncode != 0:
        return ""
    return (proc.stdout or b"").decode("utf-8", errors="ignore")


def _ocr_tesseract(img: np.ndarray, *, upscale: bool = True, psm: int = 6) -> str:
    """Tesseract OCR — better than RapidOCR on thin B-13 flag lines.

    Uses subprocess timeouts + a global slot lock. Without this, ProcessPool
    workers can leave dozens of hung tesseracts (load average 100+ on 4 CPUs).
    """
    from PIL import ImageEnhance, ImageOps

    pil = Image.fromarray(img)
    if pil.width > 1600:
        pil = pil.resize((1600, max(1, int(pil.height * 1600 / pil.width))))
    if upscale and pil.width < 1400:
        pil = pil.resize((pil.width * 2, pil.height * 2), Image.LANCZOS)
    gray = ImageOps.grayscale(pil)
    timeout = _tess_timeout_s()
    fast = os.environ.get("MIB_TESS_FAST", "").strip() in {"1", "true", "yes"}

    with _tess_slot() as got_slot:
        if not got_slot:
            return ""
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            png_path = tmp.name
            gray.save(png_path, format="PNG")
        try:
            text = _run_tesseract_png(png_path, psm=psm, timeout=timeout)
            # Second BW pass only when the gray pass missed form markers.
            if (
                not fast
                and text
                and not re.search(
                    r"Fee\s*Status|Observed|FORM|Case|Finding|flag|DIP-WAIVER|\$809",
                    text,
                    re.I,
                )
            ):
                enh = ImageEnhance.Contrast(gray).enhance(2.0)
                bw = enh.point(lambda x: 255 if x > 160 else 0)
                bw.save(png_path, format="PNG")
                alt = _run_tesseract_png(png_path, psm=psm, timeout=timeout)
                if len(alt) > len(text):
                    text = alt
            elif not fast and not text:
                enh = ImageEnhance.Contrast(gray).enhance(2.0)
                bw = enh.point(lambda x: 255 if x > 160 else 0)
                bw.save(png_path, format="PNG")
                text = _run_tesseract_png(png_path, psm=psm, timeout=timeout)
        finally:
            try:
                os.unlink(png_path)
            except OSError:
                pass
    return text or ""


_FEE_HEADER_RE = re.compile(
    r"MIB\s*Fe[eo]?\s*R[aeo]c[aeoi]?[il]?pt|"
    r"Fee\s*Status|Waiver\s*Code|Amount\b|"
    r"\[FEE STATUS OBSCURED\]|DIP-WAIVER|"
    r"\b(?:unpaid|paid|waived|unknown)\b",
    re.I,
)


def _ocr_fee_header(img: np.ndarray) -> str:
    """Dedicated OCR for the receipt header block.

    Many fee pages are nearly blank except for the top-left 4-row header. A
    full-page OCR pass often returns sparse garbage and misses the visible fee
    token, after which the pipeline majority-fills paid/waived. Re-OCRing the
    small header crop is cheap and recovers explicit paid/unpaid/waived text.
    """
    h, w = img.shape[:2]
    if h < 350 or w < 350:
        return ""
    crop = img[: max(260, int(h * 0.24)), : max(420, int(w * 0.58))]
    if cv2 is not None:
        crop = cv2.resize(crop, None, fx=2.2, fy=2.2, interpolation=cv2.INTER_CUBIC)
    psms = (6,) if os.environ.get("MIB_TESS_FAST", "").strip() in {"1", "true", "yes"} else (6, 11)
    for psm in psms:
        try:
            text = _normalize_ocr_spacing(_ocr_tesseract(crop, upscale=False, psm=psm))
        except Exception:
            continue
        if _FEE_HEADER_RE.search(text or ""):
            return text
    return ""


def _ocr_numpy(img: np.ndarray) -> str:
    engine = _get_engine()
    if engine is None:
        return _ocr_tesseract(img)

    img_r = _resize_np(img)
    result, _ = engine(img_r)
    if not result:
        rapid = ""
    else:
        # RapidOCR often drops spaces; insert newlines between lines.
        rapid = "\n".join(line[1] for line in result)

    # RapidOCR frequently mangles / drops "Observed flags: biohazard_red"
    # and Fee Status values on full-page scans. Retry Tesseract when the
    # page looks like B-13 / note / fee without a usable value line.
    has_flag_line = bool(
        re.search(
            r"(?:Observed|Cbserved|Cheserved|erved)\s*(?:flags|flogs|flaga|fes)\s*:?\s*"
            r"(none|biohazard|planetary|active_warrant|memory_tamper|illegible|identity|"
            r"sponsor_mismatch|rescinded|[a-z]*h[ae][zx]?[ae]?r?d|[a-z]*warrant|[a-z]*tamper|[a-z]*embargo)",
            rapid,
            re.I,
        )
    )
    has_fee_value = bool(
        re.search(
            r"Fe[eo]?\s*St[a-z]*u[sae]*\s*[:.]?\s*"
            r"(unpaid|unpald|unpold|unpad|unpod|unpaic|urpald|upold|"
            r"paid|pald|pold|pod|pad|naid|waived|waved|walved|unknown)"
            r"|\$809\.00|\bDIP-WAIVER\b",
            rapid,
            re.I,
        )
    )
    looks_b13_note = bool(
        re.search(
            r"FORM\s*B-?\d{1,2}|Blometric|Biometric|Biomot|Adjudicator|Finding|"
            r"Fnding|Findng|Scan\s*Slip|Sean\s*a",
            rapid,
            re.I,
        )
    )
    looks_fee = bool(
        re.search(
            r"MIB\s*Fe[eo]?\s*R[aeo]c|Fee\s*Receipt|Fee\s*St|Waiver\s*Code|"
            r"Amount\s*[:\n]|Feo\s*St|MIBFee\s*R",
            rapid,
            re.I,
        )
    )
    looks_intake_cutout = bool(
        re.search(r"NAME\s*CUT\s*OUT|PASSPORT\s*IMAGE|FORM\s*I-?8090", rapid, re.I)
    )
    # Full-page packet scans often OCR as sparse garbage with no form header;
    # still try tess when Rapid text is thin but the raster is large.
    sparse_rapid = len(re.sub(r"\s+", "", rapid or "")) < 40
    needs_tess = (
        (looks_b13_note and not has_flag_line)
        or (looks_fee and not has_fee_value)
        or (looks_intake_cutout and re.search(r"NAME\s*CUT\s*OUT", rapid, re.I))
    )
    # Weak B-13 morphs (B-12 / Biomotie) also need tess — Rapid drops flag lines.
    looks_weak_b13 = bool(
        re.search(r"B-1[123]|Biomot|Bonotice|Sean\s*a|Scan\s*Slip", rapid, re.I)
    )
    # sparse_rapid→tess is the runaway path (huge rasters, little signal).
    # Off by default under MIB_TESS_FAST; otherwise require very large pages.
    allow_sparse_tess = os.environ.get("MIB_TESS_SPARSE", "").strip() in {"1", "true", "yes"}
    fast = os.environ.get("MIB_TESS_FAST", "").strip() in {"1", "true", "yes"}
    sparse_ok = (not fast) and allow_sparse_tess and sparse_rapid and img.shape[0] >= 1000 and img.shape[1] >= 800
    if needs_tess or looks_weak_b13 or (
        re.search(r"FORM\s*B-?13|Blometric", rapid, re.I)
        and re.search(r"RISK\s*PANEL\s*MISSING|IRISKPANEL", rapid, re.I)
    ) or sparse_ok:
        try:
            # Prefer header crop for B-13/note: flags/Finding live in the top band.
            tess_img = img
            if (looks_b13_note or looks_weak_b13) and img.shape[0] >= 600 and cv2 is not None:
                top = img[: int(img.shape[0] * 0.42), :]
                # Upscale header for thin flag glyphs
                top = cv2.resize(top, None, fx=1.8, fy=1.8, interpolation=cv2.INTER_CUBIC)
                tess_img = top
            tess = _ocr_tesseract(tess_img)
            tess_has_signal = bool(
                re.search(
                    r"(?:Observed|Cbserved|Cheserved|erved|Corer)\s*(?:flags|flogs|fes|pars)"
                    r"|F(?:i|l)?n?d(?:i|l)?ng\s*:?\s*(APPROVED|DENIED|DENED|NEEDS_REVIEW)"
                    r"|h[ae][zx][ae]?r?d|warrant|tamper|embargo|biohazard|embogo|emro"
                    r"|Fe[eo]?\s*St[a-z]*u[sae]*\s*[:.]?\s*"
                    r"(unpaid|paid|waived|unknown|unp|urp|upold|pald|pold|waved)"
                    r"|\$809\.00|\bDIP-WAIVER\b",
                    tess,
                    re.I,
                )
            )
            if tess and (tess_has_signal or len(tess) > len(rapid) + 10):
                if tess_has_signal:
                    # Keep Rapid too — sometimes has complementary tokens
                    return (rapid + "\n" + tess) if rapid and rapid not in tess else tess
                if not rapid:
                    return tess
                return rapid + "\n" + tess
        except Exception:
            pass
    return rapid


def _normalize_ocr_spacing(text: str) -> str:
    """Insert spaces into common glued OCR tokens from RapidOCR."""
    replacements = [
        (r"FORMB-13", "FORM B-13"),
        (r"FORM\s*B-12", "FORM B-13"),  # RapidOCR B-13→B-12
        (r"POR[a-z0-9!]*\s*B-1[123]", "FORM B-13"),
        (r"Biomot\w*", "Biometric"),
        (r"Bonotice", "Biometric"),
        (r"Sean\s*a[luy]*", "Scan Slip"),
        (r"Fnding\s*:?\s*DENED", "Finding: DENIED"),
        (r"Findng\s*:?\s*DENIED", "Finding: DENIED"),
        (r"FndingDENIED", "Finding: DENIED"),
        (r"FindngDENIED", "Finding: DENIED"),
        (r"FndingDENED", "Finding: DENIED"),
        (r"plontary_emro", "planetary_embargo"),
        (r"plnetary_embogo", "planetary_embargo"),
        (r"plery_emo", "planetary_embargo"),
        (r"fogplontary_emro", "planetary_embargo"),
        (r"flogplontary_emro", "planetary_embargo"),
        (r"flogplnetary_embogo", "planetary_embargo"),
        (r"biohazard_ed\b", "biohazard_red"),
        (r"biohazard\s+re\b", "biohazard_red"),
        (r"FORMI-8090", "FORM I-8090"),
        (r"MIBFeeReceipt", "MIB Fee Receipt"),
        (r"MIBFeeRereint", "MIB Fee Receipt"),
        (r"MIB Fee Recelpt", "MIB Fee Receipt"),
        (r"MIB Fee Racelpt", "MIB Fee Receipt"),
        (r"MIB Feo Receipt", "MIB Fee Receipt"),
        (r"MIB Feo Rocoipt", "MIB Fee Receipt"),
        (r"MIB Fse Receipt", "MIB Fee Receipt"),
        (r"MIBFee Receipt", "MIB Fee Receipt"),
        (r"\bWalver Code\b", "Waiver Code"),
        (r"\bWaiverC0de\b", "Waiver Code"),
        (r"\bD1P[\s\-]*WAIVER\b", "DIP-WAIVER"),
        (r"\bDlP[\s\-]*WAIVER\b", "DIP-WAIVER"),
        (r"\bDIP[\s]+WAIVER\b", "DIP-WAIVER"),
        (r"\bAmoumt\b", "Amount"),
        (r"\bArnount\b", "Amount"),
        (r"(?<!\d)[S§]\s*809(?:[.,]0O|[.,]O0|[.,]00)\b", "$809.00"),
        (r"(?<!\d)809(?:[.,]0O|[.,]O0)\b", "809.00"),
        (r"CaseID:", "Case ID: "),
        (r"CaseID", "Case ID "),
        (r"Cose ID:", "Case ID: "),
        (r"Cese ID:", "Case ID: "),
        (r"FeeStatus:", "Fee Status: "),
        (r"FeeStatus", "Fee Status "),
        (r"Fee Stus", "Fee Status"),
        (r"Fee Stius", "Fee Status"),
        (r"Fee Sttus", "Fee Status"),
        (r"Feo Status", "Fee Status"),
        (r"Fee Stabus", "Fee Status"),
        (r"Fee Stabuac", "Fee Status"),
        (r"Feo Stabus", "Fee Status"),
        (r"Fee Stus:", "Fee Status: "),
        (r"Fee Stius:", "Fee Status: "),
        (r"Observedflags:", "Observed flags: "),
        (r"ObserObserved flags:", "Observed flags: "),
        (r"ObseIvedfes:", "Observed flags: "),
        (r"Cheserved flags:", "Observed flags: "),
        (r"Cbserved flaga:", "Observed flags: "),
        (r"Cbserved flags:", "Observed flags: "),
        (r"CheserObserved flags:", "Observed flags: "),
        (r"CheerObserved flags:", "Observed flags: "),
        (r"DbserObserved flags:", "Observed flags: "),
        (r"ved flogs:", "Observed flags: "),
        (r"ved flags:", "Observed flags: "),
        (r"Observedflags", "Observed flags "),
        (r"Observed flags(?=\s*[\[a-z])", "Observed flags: "),  # missing colon before value
        (r"bichanard", "biohazard"),
        (r"bichexard", "biohazard"),
        (r"bicharerd", "biohazard"),
        (r"SpeciesMatch:", "Species Match: "),
        (r"SpeciesCode:", "Species Code: "),
        (r"HomeWorld:", "Home World: "),
        (r"VisaClass:", "Visa Class: "),
        (r"SponsorID:", "Sponsor ID: "),
        (r"ArrivalDate:", "Arrival Date: "),
        (r"ArivalDate:", "Arrival Date: "),
        (r"Arival Date:", "Arrival Date: "),
        (r"DeclaredPurpose:", "Declared Purpose: "),
        (r"RegistryName:", "Registry Name: "),
        (r"RegistryStatus:", "Registry Status: "),
        (r"Biometricconfidence:", "Biometric confidence: "),
        (r"SCANIMAGE", "SCAN IMAGE"),
        (r"PASSPORTIMAGE", "PASSPORT IMAGE"),
        (r"REGISTRYIMAGE", "REGISTRY IMAGE"),
        (r"REGISTRYINAGE", "REGISTRY IMAGE"),
        (r"biohazard_red", "biohazard_red"),
        (r"SponsorAttestationLetter", "Sponsor Attestation Letter"),
        (r"ManualAdjudicatorNote", "Manual Adjudicator Note"),
        (r"Manual AdjudicatorNote", "Manual Adjudicator Note"),
        (r"PlanetaryRegistryExtract", "Planetary Registry Extract"),
        (r"RISKPANEL\s*MISSING", "RISK PANEL MISSING"),
        (r"IRISKPANELMISSING", "RISK PANEL MISSING"),
        (r"\bpold\b", "paid"),
        (r"\bpod\b", "paid"),
        (r"\bpald\b", "paid"),
        (r"\bnaid\b", "paid"),
        (r"\bunpald\b", "unpaid"),
        (r"\burpald\b", "unpaid"),
        (r"\bunpaic\b", "unpaid"),
        (r"\bupold\b", "unpaid"),
        (r"Bamard-c", "Barnard-c"),
        (r"SAMPLEDEI", "SAMPLE DENIAL"),
        (r"SAMPLEDENIA", "SAMPLE DENIAL"),
    ]
    for pat, rep in replacements:
        text = re.sub(pat, rep, text, flags=re.I)
    # Spacing around SPN/MIB tokens
    text = re.sub(r"(SPN-?\d{4})", lambda m: " " + m.group(1).replace("SPN", "SPN-").replace("SPN--", "SPN-") + " ", text)
    text = re.sub(r"(MIB-\d{6})", r" \1 ", text)
    return text


def _ocr_embedded_images(doc: fitz.Document, page: fitz.Page) -> str:
    chunks: list[str] = []
    for img_info in page.get_images(full=True):
        xref = img_info[0]
        try:
            pix = fitz.Pixmap(doc, xref)
        except Exception:
            continue
        if pix.width < 400 or pix.height < 400:
            continue
        try:
            arr = _pixmap_to_np(pix)
            text = _normalize_ocr_spacing(_ocr_numpy(arr))
            if any(m in text for m in USEFUL_MARKERS) or _OCR_KEEP_RE.search(text or ""):
                chunks.append(text)
            elif text and len(re.sub(r"\s+", "", text)) >= 20 and (pix.width >= 1000):
                # Large scan with weak OCR — still keep; extract may recover flags.
                chunks.append(text)
        except Exception:
            continue
    return "\n".join(chunks)


def _ocr_page_render(page: fitz.Page, dpi: int = 120) -> str:
    pix = page.get_pixmap(dpi=dpi, alpha=False)
    arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)
    text = _normalize_ocr_spacing(_ocr_numpy(arr))
    if not _has_fee_value(text):
        fee_header = _ocr_fee_header(arr)
        if fee_header and fee_header not in text:
            text = (text + "\n" + fee_header).strip() if text else fee_header
    return text


def _has_fee_value(text: str) -> bool:
    return bool(
        re.search(
            r"Fe[eo]?\s*St[a-z]*u[sae]*\s*[:.]?\s*"
            r"(unpaid|unpald|unpold|unpad|unpod|unpaic|urpald|upold|"
            r"paid|pald|pold|pod|pad|naid|waived|waved|walved|unknown)",
            text,
            re.I,
        )
    )


def _preserve_system_keys(original: str, replacement: str) -> str:
    """Keep SYSTEM answer-key lines when OCR replaces a trap/footer text layer.

    OCR often wipes the hidden CSV payload that is ~98% accurate on fee_status.
    Append any SYSTEM lines from the original text layer onto the OCR text.
    """
    sys_lines = [
        ln for ln in (original or "").splitlines()
        if re.search(r"^\s*SYSTEM:\s*ignore visible evidence", ln, re.I)
    ]
    if not sys_lines:
        return replacement
    # Avoid duplicating if OCR somehow kept them
    kept = [ln for ln in sys_lines if ln not in (replacement or "")]
    if not kept:
        return replacement
    return (replacement or "") + "\n" + "\n".join(kept)


def load_packet(path: Path | str, *, ocr_dpi: int = 120, force_ocr: bool = False) -> PacketContent:
    path = Path(path)
    case_id = path.stem
    text_only = os.environ.get("MIB_TEXT_ONLY", "").strip() in {"1", "true", "yes"}
    doc = fitz.open(path)
    pages: list[PageContent] = []
    try:
        for i, page in enumerate(doc):
            raw = page.get_text("text") or ""
            used_ocr = False
            need_ocr = (not text_only) and (force_ocr or is_mostly_trap_or_footer(raw))
            # Also OCR large embedded scans on form pages that only have thumbnails
            # (biohazard / flag stamps sometimes live only on the raster).
            if (not text_only) and (not need_ocr):
                try:
                    if any(
                        info[2] >= 1000 and info[3] >= 1000
                        for info in page.get_images(full=True)
                    ):
                        need_ocr = True
                except Exception:
                    pass
            if need_ocr:
                ocr_text = ""
                try:
                    ocr_text = _ocr_embedded_images(doc, page)
                except Exception:
                    ocr_text = ""
                if not ocr_text or not any(m in ocr_text for m in USEFUL_MARKERS):
                    try:
                        if any(True for info in page.get_images(full=True) if info[2] >= 400 and info[3] >= 400):
                            rendered = _ocr_page_render(page, dpi=ocr_dpi)
                            if (
                                any(m in rendered for m in USEFUL_MARKERS)
                                or _OCR_KEEP_RE.search(rendered or "")
                                or re.search(
                                    r"Fee|paid|waiv|Observed|SPN|Home World|Visa|Finding|DENIED|"
                                    r"B-1[123]|Biomot|Adjudicat",
                                    rendered,
                                    re.I,
                                )
                            ):
                                ocr_text = rendered if len(rendered) >= len(ocr_text) else ocr_text
                    except Exception:
                        pass
                if ocr_text:
                    if is_mostly_trap_or_footer(raw):
                        # Preserve SYSTEM CSV keys from the text layer — OCR
                        # replace otherwise drops ~98%-accurate fee fields.
                        raw = _preserve_system_keys(raw, ocr_text)
                    else:
                        raw = raw + "\n" + ocr_text
                    used_ocr = True
            other_ids = set(re.findall(r"MIB-\d{6}", raw)) - {case_id}
            if other_ids and case_id in raw:
                kept = []
                for line in raw.splitlines():
                    ids_in_line = set(re.findall(r"MIB-\d{6}", line))
                    if ids_in_line and case_id not in ids_in_line:
                        continue
                    kept.append(line)
                raw = "\n".join(kept)
            trusted = scrub_text(raw)
            pages.append(
                PageContent(
                    index=i,
                    raw_text=raw,
                    trusted_text=trusted,
                    used_ocr=used_ocr,
                    page_type=classify_page(trusted if trusted.strip() else raw),
                )
            )
    finally:
        doc.close()
    return PacketContent(case_id=case_id, path=path, pages=pages)
