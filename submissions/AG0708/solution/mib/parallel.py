"""Parallel batch prediction for speed under the 6s/PDF budget."""

from __future__ import annotations

import json
import os
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path
from typing import Any


def _worker(args: tuple[str, int]) -> dict[str, Any]:
    path, ocr_dpi = args
    # Import inside worker for spawn/fork safety
    from mib.pipeline import predict_pdf

    try:
        pred = predict_pdf(path, ocr_dpi=ocr_dpi)
        pred.pop("_debug", None)
        pred["confidence"] = float(pred["confidence"])
        return pred
    except Exception as exc:
        return {
            "case_id": Path(path).stem,
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
            "_error": str(exc),
        }


def predict_dir_parallel(
    input_dir: Path | str,
    output_path: Path | str,
    *,
    ocr_dpi: int | None = None,
    workers: int | None = None,
) -> int:
    input_dir = Path(input_dir)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    pdfs = sorted(str(p) for p in input_dir.glob("*.pdf"))
    # Default 2 workers: each PDF can spawn RapidOCR + tesseract; 4 workers
    # previously produced load averages >150 on 4-CPU VMs.
    default_workers = min(2, os.cpu_count() or 2)
    workers = workers or max(
        1,
        min(int(os.environ.get("MIB_WORKERS", "0") or "0") or default_workers, 4),
    )
    if ocr_dpi is None:
        try:
            ocr_dpi = int(os.environ.get("MIB_OCR_DPI", "120") or "120")
        except ValueError:
            ocr_dpi = 120

    results: dict[str, dict[str, Any]] = {}
    with ProcessPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(_worker, (p, ocr_dpi)): p for p in pdfs}
        done = 0
        for fut in as_completed(futs):
            pred = fut.result()
            results[pred["case_id"]] = pred
            done += 1
            if done % 50 == 0 or done == len(pdfs):
                print(f"progress {done}/{len(pdfs)}", flush=True)

    with output_path.open("w") as f:
        for cid in sorted(results):
            pred = results[cid]
            pred.pop("_error", None)
            f.write(json.dumps(pred, sort_keys=True) + "\n")
    return len(results)
