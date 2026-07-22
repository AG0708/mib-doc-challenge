# Submission

**Solution repository:** this folder’s `solution/` directory (contains `Dockerfile`).

Public path in the challenge repository:

https://github.com/AG0708/mib-doc-challenge/tree/cursor/setup-dev-environment-4b68/submissions/AG0708/solution

Build & run (from a checkout of this challenge repo):

```bash
python3 scripts/run_docker_submission.py \
  --repo submissions/AG0708/solution \
  --input-dir data/validation \
  --output /tmp/mib-output/predictions.jsonl \
  --manifest data/validation_manifest.csv
```

Or:

```bash
docker build -t mib-submission submissions/AG0708/solution
docker run --rm --network none \
  --mount type=bind,src="$PWD/data/validation",dst=/input,readonly \
  --mount type=bind,src="/tmp/mib-output",dst=/output \
  mib-submission /input /output/predictions.jsonl
```

Entrypoint contract: `<input_pdf_dir> <output_predictions_path>`.
