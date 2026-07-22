"""PDF page triage: text layer + RapidOCR on embedded images."""

from __future__ import annotations

import os
import re
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
    "Sponsor Attestation",
    "Manual Adjudicator Note",
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
    if re.search(r"FORM\s*[B8]-?13|Observed\s*flags", text, re.I):
        return "biometric"
    if re.search(r"Fee\s*Status|Waiver\s*Code|MIB\s*Fee", text, re.I):
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


def _ocr_numpy(img: np.ndarray) -> str:
    engine = _get_engine()
    if engine is None:
        # Fallback: tesseract via PIL
        import pytesseract
        from PIL import ImageOps

        pil = Image.fromarray(img)
        if pil.width > 1200:
            pil = pil.resize((1200, max(1, int(pil.height * 1200 / pil.width))))
        text = pytesseract.image_to_string(pil, config="--oem 1 --psm 6")
        if not re.search(r"Fee\s*Status|Observed|FORM|Case", text, re.I):
            gray = ImageOps.grayscale(pil)
            bw = gray.point(lambda x: 255 if x > 175 else 0).convert("RGB")
            alt = pytesseract.image_to_string(bw, config="--oem 1 --psm 6")
            if len(alt) > len(text):
                text = alt
        return text

    img = _resize_np(img)
    result, _ = engine(img)
    if not result:
        return ""
    # RapidOCR often drops spaces; insert newlines between lines.
    return "\n".join(line[1] for line in result)


def _normalize_ocr_spacing(text: str) -> str:
    """Insert spaces into common glued OCR tokens from RapidOCR."""
    replacements = [
        (r"FORMB-13", "FORM B-13"),
        (r"FORMI-8090", "FORM I-8090"),
        (r"MIBFeeReceipt", "MIB Fee Receipt"),
        (r"MIB Feo Receipt", "MIB Fee Receipt"),
        (r"MIB Fse Receipt", "MIB Fee Receipt"),
        (r"CaseID:", "Case ID: "),
        (r"CaseID", "Case ID "),
        (r"Cose ID:", "Case ID: "),
        (r"Cese ID:", "Case ID: "),
        (r"FeeStatus:", "Fee Status: "),
        (r"FeeStatus", "Fee Status "),
        (r"Feo Status", "Fee Status"),
        (r"Fee Stabus", "Fee Status"),
        (r"Fee Stabuac", "Fee Status"),
        (r"Feo Stabus", "Fee Status"),
        (r"Observedflags:", "Observed flags: "),
        (r"Cbserved flaga:", "Observed flags: "),
        (r"Cbserved flags:", "Observed flags: "),
        (r"ved flogs:", "Observed flags: "),
        (r"ved flags:", "Observed flags: "),
        (r"Observedflags", "Observed flags "),
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
        (r"PlanetaryRegistryExtract", "Planetary Registry Extract"),
        (r"\bpold\b", "paid"),
        (r"\bpod\b", "paid"),
        (r"\bpald\b", "paid"),
        (r"\bunpald\b", "unpaid"),
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
            if any(m in text for m in USEFUL_MARKERS) or re.search(
                r"MIB-\d{6}|SPN-?\d{4}|Observed|Fee|paid|waiv|flag", text, re.I
            ):
                chunks.append(text)
        except Exception:
            continue
    return "\n".join(chunks)


def _ocr_page_render(page: fitz.Page, dpi: int = 120) -> str:
    pix = page.get_pixmap(dpi=dpi, alpha=False)
    arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)
    return _normalize_ocr_spacing(_ocr_numpy(arr))


def _has_fee_value(text: str) -> bool:
    return bool(
        re.search(
            r"Fe{1,2}\s*Status\s*[:.]?\s*(paid|pald|waived|waved|walved|unpaid|unpald|unknown)",
            text,
            re.I,
        )
    )


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
                                or re.search(r"Fee|paid|waiv|Observed|SPN|Home World|Visa", rendered, re.I)
                            ):
                                ocr_text = rendered if len(rendered) >= len(ocr_text) else ocr_text
                    except Exception:
                        pass
                # If still thin, try a higher-DPI render once for scan-heavy pages
                if (not ocr_text or len(ocr_text) < 40) and not text_only:
                    try:
                        if any(True for info in page.get_images(full=True) if info[2] >= 800 and info[3] >= 800):
                            rendered = _ocr_page_render(page, dpi=max(ocr_dpi, 160))
                            if len(rendered) > len(ocr_text or ""):
                                ocr_text = rendered
                    except Exception:
                        pass
                if ocr_text:
                    if is_mostly_trap_or_footer(raw):
                        raw = ocr_text
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
