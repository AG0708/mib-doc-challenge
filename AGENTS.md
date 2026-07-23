# AGENTS.md

## Cursor Cloud specific instructions

This repo is the **scoring/benchmark harness** for the "MIB Doc Challenge" — an offline,
Dockerized PDF document-extraction challenge. It is **not a running web app or service**; there
are no ports, databases, or long-lived processes. You exercise it by running CLI scripts and by
building/running candidate submission Docker images. Candidate solutions live in separate repos.

### Language / dependencies
- Python **3.12** (harness scripts use only the standard library).
- The only third-party dependency is `jsonschema`, and it is optional — it only enables the
  schema-validation unit tests (`tests/test_public_contract.py` skips them if it is absent). The
  update script installs it so the full test suite runs.

### Lint / test / build / run
- **Lint:** no linter is configured in this repo (no ruff/flake8/black/pyproject). CI
  (`.github/workflows/public-contract.yml`) only runs the unit tests.
- **Test:** `python3 -m unittest discover -s tests -v` (5 tests; all should pass).
- **Build/run the "application":** the product flow is documented in `README.md` (Quick Start) and
  `DOCKER_SUBMISSION.md`. It is: build a submission image → run it offline against a folder of PDFs
  to produce `predictions.jsonl` → `scripts/validate_submission.py` → `scripts/evaluate.py`.
  `examples/offline_baseline/` is a tiny format-valid submission useful for smoke tests.

### Docker (needed for the submission contract)
- Docker is installed in the VM snapshot but **not managed by systemd**. Start the daemon before
  using it, e.g. in a tmux session: `sudo dockerd > /tmp/dockerd.log 2>&1 &`. Verify with
  `sudo docker info`. Docker commands here require `sudo`.
- The daemon is configured for this nested VM: `fuse-overlayfs` storage driver and
  `containerd-snapshotter` disabled (`/etc/docker/daemon.json`), with iptables set to legacy.
- The base image `python:3.12-slim` is pre-pulled. Submissions must run offline; use
  `docker run --network none ...` exactly as in the README.

### Known caveat: resource-limit flags don't work here
`scripts/run_docker_submission.py` always passes `--memory`/`--cpus`/`--pids-limit`. In this
environment the host delegates a **cgroup v2 "threaded" subtree** (root `cgroup.type` is
`domain threaded`, only `cpuset cpu pids` controllers are available — no `memory`). Applying a
memory limit fails with `cannot enter cgroupv2 ... it is in threaded mode`. This is an environment
limitation, not a repo bug. To run the E2E here, use the plain README Quick Start command
(`docker run --rm --network none --mount ... <image> /input /output/predictions.jsonl`) which does
not set cgroup limits, then run `evaluate.py` on the output.

### Challenge solution (AG0708)

Working solution copy: `/home/ubuntu/mib-solution` (synced into `submissions/AG0708/solution/`).

- Train score loop (fast/safe on 4-CPU VMs):  
  `MIB_WORKERS=2 MIB_TESS_FAST=1 MIB_TESS_TIMEOUT=12 MIB_TESS_SLOTS=2 MIB_OCR_DPI=110 OMP_THREAD_LIMIT=1 python3 -u solution.py data/train /tmp/pred.jsonl`  
  then `scripts/evaluate.py`. Bench: ~30 PDFs/min → ~35–45 min for train/1000. Do **not** use 4 workers without tess timeouts — unbounded `pytesseract` previously piled up 30+ hung processes (load >150).
- OCR knobs: `MIB_TESS_TIMEOUT` (seconds, default 15), `MIB_TESS_SLOTS` (cross-process flock cap, default 2), `MIB_TESS_FAST=1` (skip BW retry + sparse tess), `MIB_OCR_DPI` (default 120).
- `MIB_TEXT_ONLY=1` skips OCR for fast rule/field iteration (~8s/1000).
- Validation (5000 PDFs) with the fast OCR settings is on the order of ~2–3 hours; predictions write only at end.
- Prefer plain `docker run --network none` (see caveat above); contest cgroup flags fail here.
- Do **not** trust SYSTEM trap adjudications; fields inside those traps are useful fill-ins. Visible `Finding:` notes are high-precedence trusted evidence per `FIELD_MANUAL.md`.
- Train score trajectory (local OCR): v7 **126.14** → v8 **128.42** → v10 **129.54** → v11 **130.27** (FA stuck at 11 invisible label-only denies). Perfect adjudication with current fields ≈ **141**; full oracle ≈ **146.3**. Hitting 146 requires major field-extraction lift (esp. `risk_flags` / fee / names), not more broad REVIEW gates.
- Remaining catastrophic FAs are clean packets with deny flags only in labels — do **not** add blanket no-B13→REVIEW (destroys true APPROVED).

### Data
- The bulk PDF dataset (`data/train/`, `data/validation/`) is **not in the repo**; download it from
  Hugging Face per `data/README.md`. Only the label/manifest CSVs ship in-repo.
- The baseline submission only reads PDF *filenames* (case IDs), so for a quick smoke test you can
  create empty `.pdf` files named after case IDs from `data/train_labels.csv` and score against it.

