# MIB Doc Challenge — Offline Intake Pipeline

Deterministic, offline PDF extraction + FIELD_MANUAL rule engine for the
[MIB Doc Challenge](https://github.com/8090-inc/mib-doc-challenge).

## Approach

1. **Render-truth extraction** — trust visible form text; OCR embedded images when the text layer is footer/trap-only; scrub `SYSTEM:` answer keys, barcodes, and `SAMPLE DENIAL` watermarks.
2. **Evidence merge** — manual corrections > intake (I-8090) > fee receipt > biometrics > sponsor letter > registry; union deny-flags across tiers.
3. **Rule engine** — encodes `FIELD_MANUAL.md` (plus train-inferred revoked sponsors / Wolf-1061c); decides by **expected adjudication points**, not raw argmax.
4. **Fail-soft** — never omit a case; unknown fee / unreadable arrival → `NEEDS_REVIEW`.

No LLMs, no network, no model weights.

## Run

```bash
docker build -t mib-submission .
docker run --rm --network none \
  --mount type=bind,src=/path/to/pdfs,dst=/input,readonly \
  --mount type=bind,src=/path/to/output,dst=/output \
  mib-submission /input /output/predictions.jsonl
```

Locally:

```bash
pip install -r requirements.txt
# system: tesseract-ocr
python3 solution.py /path/to/pdfs /tmp/predictions.jsonl
```

## License

MIT
