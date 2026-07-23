# Technical Memo — MIB Doc Challenge

## Approach

Deterministic offline document-engineering pipeline (no LLMs/VLMs). Reconstruct `FIELD_MANUAL.md` as code on a render-truth extractor, then decide with expected-value adjudication.

### 1. Extraction

- Prefer visible text layers of structured forms (I-8090, fee receipt, B-13, registry, sponsor letter).
- OCR trap/footer-only pages with RapidOCR (embedded images first, page-render fallback).
- Scrub barcode *commands* and `SAMPLE DENIAL` watermarks.
- Apply `Manual correction:` at the highest tier; **union** disqualifying risk flags across tiers.
- Fuzzy OCR repair for glued purposes (`reactormaintenance`), mangled flags (`legltlebiomatice`→`illegible_biometrics`), and fee typos (`pold`/`Stabus`).
- **SYSTEM answer-key fields:** the CSV-shaped payload inside `SYSTEM:` traps is ~92–98% field-accurate on train while adjudication is always wrong. We ingest *fields only* (prefer SYSTEM fee when present); never the forced `APPROVED`.

### 2. Adjudication

`FIELD_MANUAL` precedence #1 is a visible MIB adjudicator stamp / signed note. On train, `Finding: {APPROVED,DENIED,NEEDS_REVIEW}` matches labels 162/162 — we treat it as decisive when present in trusted text.

Otherwise: deny-first policy (deny flags, TRANSIT-7, unpaid, revoked sponsors including train-inferred IDs, Wolf-1061c non-DIP, stale arrival), then fee-unknown / missing-arrival → REVIEW, then review flags / evidence issues, else APPROVE.

Actions maximize expected classification points (false approval = −4), not raw argmax probability.

### 3. Calibration

Confidence = posterior of the chosen label, clamped to `[0.02, 0.98]`.

### 4. Runtime

CPU-only Docker, `--network none`, parallel PDF workers, fail-soft per case (never omit).

## Failure modes

- Image-only packets where OCR recovers neither fee nor Finding → over-REVIEW.
- Graphical biohazard stamps with no recoverable text → under-deny unless other evidence fires.
- Decoy pages for other case IDs: filtered when foreign `MIB-######` lines appear.

## What another week would buy

Layout-aware OCR crops, a small flag detector on B-13 rasters, isotonic calibration, and a fuzz suite for private-set robustness.
