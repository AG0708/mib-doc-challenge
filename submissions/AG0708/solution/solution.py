#!/usr/bin/env python3
"""CLI entrypoint: solution.py <input_pdf_dir> <output_path>"""

from __future__ import annotations

import sys
from pathlib import Path

# Allow running as /app/solution.py inside Docker without installing the package.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from mib.parallel import predict_dir_parallel  # noqa: E402
from mib.pipeline import predict_dir  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    if len(argv) != 2:
        print("usage: solution.py <input_pdf_dir> <output_path>", file=sys.stderr)
        return 2
    input_dir, output_path = argv
    # Parallel by default for contest throughput; MIB_SERIAL=1 forces single-process.
    if __import__("os").environ.get("MIB_SERIAL", "").strip() in {"1", "true", "yes"}:
        n = predict_dir(input_dir, output_path, include_debug=False)
    else:
        n = predict_dir_parallel(input_dir, output_path)
    print(f"wrote {n} predictions to {output_path}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
