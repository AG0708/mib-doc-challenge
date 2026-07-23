# Phase 0 FACTS — answers to PLAN.md §10 open questions

## 1. Exact submission field names / types

From `schemas/submission.schema.json` (all required; `additionalProperties: false`):

| Field | Type | Constraints |
|---|---|---|
| `case_id` | string | `^MIB-[0-9]{6}$` |
| `applicant_name` | string | |
| `species_code` | string | |
| `home_world` | string | |
| `visa_class` | string | |
| `sponsor_id` | string | `^SPN-[0-9]{4}$` |
| `arrival_date` | string | JSON Schema `format: date` (`YYYY-MM-DD`) |
| `declared_purpose` | string | |
| `risk_flags` | string | pipe-delimited or `none` (EVALUATION.md) |
| `fee_status` | string enum | `paid` \| `waived` \| `unpaid` \| `unknown` |
| `adjudication` | string enum | `APPROVED` \| `DENIED` \| `NEEDS_REVIEW` |
| `confidence` | number | ∈ [0, 1] |

---

## 2. Omission math — does the denominator shrink?

**No.** From `scripts/evaluate.py`:

- Missing cases still contribute to `extraction_max_raw` and `classification_max_raw` (denominators).
- Missing case gets `extraction_raw += 0`, `classification_raw += 0`.
- Extra penalty: `missing_penalty = 10 * missing_cases / total_cases`.

Omitting a case **never** improves score vs. submitting a conservative wrong guess that still earns partial classification credit (e.g. predicting `NEEDS_REVIEW` on a hard case yields 2 raw classification points). Default: **0 omissions**.

Unrecoverable fields (private admin labels only) **do** shrink that case’s extraction max via `unrecoverable_fields` — separate from omission.

---

## 3. String / date / set normalization (`evaluate.py`)

- **Most fields:** `strip` → collapse internal whitespace → `casefold()`; exact equality.
- **`risk_flags`:** same normalize; values in `{'', 'none', 'null', 'unknown'}` → `none`; else split on `|`, strip parts, **sort**, join with `|`.
- **Dates:** compared as normalized strings (no date parsing in scorer) — emit canonical `YYYY-MM-DD`.
- **`fee_status` / `adjudication`:** must be exact enum members or the record is counted invalid.

---

## 4. Staleness outcome + review-flag escalation (train)

See `/home/ubuntu/mib-solution/RULE_SPEC.md` for full rules. Short answers:

| Question | Answer from train |
|---|---|
| Stale + visible date → DENY or REVIEW? | **DENIED** (non-DIP). No clean stale → REVIEW examples. |
| Can we learn exact cutoff without receipt dates? | Partially: residual stale DENYs are ≤ `2025-12-09`; first non-DIP APPROVED is `2026-01-28`. Using receipt≈`2026-07-07` → 180-day cutoff `2026-01-08` fits. Per-packet receipt must come from PDFs. |
| DIP-1 stale exception? | Yes — early 2025 DIP-1 clean cases APPROVE. |
| Multiple review-only flags → DENY? | **No** in train. Dual review flags alone always stay `NEEDS_REVIEW`. DENY only when another deny condition co-occurs. |
| `fee_status=unknown`? | Always `NEEDS_REVIEW` (44/44). |
| Extra revoked sponsors? | `SPN-2718`, `SPN-7331`, `SPN-9090` (+ manual trio). DIP-exempt. |
| Latent world deny? | `Wolf-1061c` + non-DIP always DENIED even without `planetary_embargo` flag. |

Structured-field engine accuracy: **973/1000**; remaining 27 are residual document-level REVIEW.

---

## 5. Resubmission policy

- Submit via PR under `submissions/<github-username>/` plus the Google form (`README.md`, PR template).
- Repo docs do **not** explicitly say “unlimited PR updates until close.”
- PLAN assumes PRs are editable until close; **confirm with organizers** if leaderboard uses latest PR tip vs. first submission.
- Anti-cheat: no hardcoded answers / per-case manual edits (`EVALUATION.md`).

---

## 6. Validation adversarial classes absent from train?

**Not answered here** — requires Phase 0 recon (PDF inventory / train vs validation producer/scan/trap diffs). Validation has no public labels; only `validation_manifest.csv` (case IDs, paths, page counts). Defer to recon report; do not assume identical trap distribution.
