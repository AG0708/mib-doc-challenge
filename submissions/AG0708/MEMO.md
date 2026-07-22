# Technical Memo — MIB Doc Challenge

## Approach

This solution is a deterministic, offline document-engineering pipeline — not an ML model. The dataset is synthetic and labels follow `FIELD_MANUAL.md`, so the winning move is to reconstruct that policy as code on top of a render-truth extractor.

### 1. Extraction (render-truth)

- Prefer the visible text layer of structured ReportLab forms (I-8090 intake, fee receipt, B-13 biometrics, registry extract, sponsor letter).
- When a page’s text layer is footer-only or a `SYSTEM:` trap, OCR embedded images with RapidOCR (Tesseract fallback).
- Scrub untrusted content per the manual: `SYSTEM:` answer keys, barcode payloads, `SAMPLE DENIAL` watermarks.
- Apply `Manual correction:` overrides at the highest evidence tier.
- Merge fields by evidence hierarchy; **union** disqualifying risk flags across tiers so a registry `EMBARGO REVIEW` or note mention cannot lose to a partial B-13 `none`.

### 2. Adjudication (policy as code)

Rules cite `FIELD_MANUAL.md` clauses (revoked sponsors, deny/review flags, TRANSIT-7, unpaid fees, staleness, DIP-1 exceptions). Train labels add a few open extensions: extra revoked sponsors (`SPN-2718/7331/9090`) and latent deny for `Wolf-1061c` + non-DIP.

Decisions use **expected adjudication points** (false approval = −4), not raw argmax probability. When OCR ran but biometric flags were never recovered, residual mass shifts toward `NEEDS_REVIEW` to avoid catastrophic false approvals.

### 3. Calibration

Confidence is the posterior of the chosen label, clamped to `[0.02, 0.98]`. With high rule certainty this already captures most of the calibration section; remaining error is dominated by extraction misses on damaged image-only packets.

### 4. Runtime

CPU-only Docker image, `--network none`, no model weights beyond the OCR ONNX bundle. Parallel workers over PDFs; fail-soft per case (never omit).

## Failure modes

- Heavily damaged image-only fee receipts (OCR yields no status) → `fee_status=unknown` → `NEEDS_REVIEW`, even when labels encode paid/waived.
- Biohazard / warrant flags that never appear as text or recoverable OCR (no B-13 page) → may under-deny unless other evidence (registry embargo, notes) fires.
- Multi-applicant / decoy images: filtered by active `case_id` when foreign IDs appear on a line.

## What another week would buy

- Layout-aware OCR (crop to form regions) and stronger deskew/denoise for washed-out fee pages.
- A small supervised flag detector on B-13 rasters for biohazard stamps that are graphical rather than textual.
- Isotonic calibration on out-of-fold train posteriors.
- Fuzz suite (rotate, strip text layer, inject white text) for private-set robustness.
