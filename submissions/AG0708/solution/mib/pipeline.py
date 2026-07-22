"""End-to-end packet → prediction."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .extract import extract_fields
from .pdf_io import load_packet
from .rules import adjudicate


def predict_pdf(path: Path | str, *, ocr_dpi: int = 150) -> dict[str, Any]:
    packet = load_packet(path, ocr_dpi=ocr_dpi)
    fields = extract_fields(packet)
    # Prefer case_id from filename (manifest-aligned); override if extracted differs for active packet
    decision = adjudicate(fields)
    pred = decision.fields
    pred["case_id"] = Path(path).stem
    # Extraction fill: when fee was never recovered, impute the majority class
    # for DIP-1 (waived) / others (paid). Adjudication already ran on `unknown`
    # when missing, so this does not change the decision — only the reported field.
    if pred.get("fee_status") == "unknown" and (fields.fee_status is None or fields.fee_status == "unknown"):
        if (fields.visa_class or pred.get("visa_class")) == "DIP-1":
            pred["fee_status"] = "waived"
        else:
            pred["fee_status"] = "paid"
    pred["_debug"] = {
        "reasons": decision.reasons,
        "posterior": decision.posterior,
        "sources": fields.sources,
        "conflicts": fields.conflicts,
        "used_ocr": fields.used_ocr,
        "arrival_unreadable": fields.arrival_unreadable,
        "evidence_needs_review": fields.evidence_needs_review,
    }
    return pred


def predict_dir(input_dir: Path | str, output_path: Path | str, *, ocr_dpi: int = 150, include_debug: bool = False) -> int:
    input_dir = Path(input_dir)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    pdfs = sorted(input_dir.glob("*.pdf"))
    n = 0
    with output_path.open("w") as f:
        for pdf in pdfs:
            try:
                pred = predict_pdf(pdf, ocr_dpi=ocr_dpi)
            except Exception as exc:
                # Fail-soft: never omit (PLAN §6.5) — conservative REVIEW
                pred = {
                    "case_id": pdf.stem,
                    "applicant_name": "unknown",
                    "species_code": "unknown",
                    "home_world": "unknown",
                    "visa_class": "unknown",
                    "sponsor_id": "SPN-0000",
                    "arrival_date": "1900-01-01",
                    "declared_purpose": "unknown",
                    "risk_flags": "none",
                    "fee_status": "unknown",
                    "adjudication": "NEEDS_REVIEW",
                    "confidence": 0.05,
                    "_debug": {"error": str(exc)},
                }
            if not include_debug:
                pred.pop("_debug", None)
            # Ensure schema types
            pred["confidence"] = float(pred["confidence"])
            f.write(json.dumps(pred, sort_keys=True) + "\n")
            n += 1
    return n
