# MIB Doc Challenge — Adjudication Rule Spec (from train labels)

Derived from `FIELD_MANUAL.md` + exhaustive analysis of `data/train_labels.csv` (n=1000) and scoring semantics in `scripts/evaluate.py`.

**Coverage:** A deterministic engine using only structured label fields reconstructs **973/1000** adjudications. The remaining **27** are `NEEDS_REVIEW` cases that look `APPROVED`-eligible from CSV fields alone — they require document-level evidence issues (contradiction, illegibility, untrusted evidence) not encoded in the public label columns.

Label base rates: `DENIED` 431 · `APPROVED` 289 · `NEEDS_REVIEW` 280.

---

## 1. Decision procedure (recommended evaluation order)

Apply in order; first matching terminal outcome wins unless noted.

```
1. fee_status == unknown          → NEEDS_REVIEW
2. Any DENY condition (below)     → DENIED
3. Any REVIEW condition (below)   → NEEDS_REVIEW
4. else                           → APPROVED
```

**Notes on precedence (from labels):**

| Conflict | Observed outcome | n |
|---|---|---|
| `fee_status=unknown` (alone or with review flags) | always `NEEDS_REVIEW` | 44/44 |
| `fee_status=unknown` + deny flags / TRANSIT-7 / revoked / Wolf | **never co-occurs** in train — precedence untested |
| `fee_status=unpaid` (+ anything) | always `DENIED` | 50/50 |
| Deny flag + review flag | always `DENIED` | all such combos |
| Multiple review-only flags, no deny condition | always `NEEDS_REVIEW` (no escalation) | 24/24 |

---

## 2. DENY conditions

Any one is sufficient (`DENIED`):

### 2.1 Disqualifying risk flags (always DENY)

| Flag | Train count | APPROVED | DENIED | NEEDS_REVIEW |
|---|---:|---:|---:|---:|
| `biohazard_red` (alone or combined) | 87 | 0 | 87 | 0 |
| `planetary_embargo` (alone or combined) | 72 | 0 | 72 | 0 |
| `active_warrant` (alone or combined) | 17 | 0 | 17 | 0 |
| `memory_tampering` (alone or combined) | 10 | 0 | 10 | 0 |

Applies to **all** visa classes, including `DIP-1`.

### 2.2 `TRANSIT-7` → always DENY

| Metric | Value |
|---|---|
| Train count | 53 |
| Outcomes | `DENIED` 53 / `APPROVED` 0 / `NEEDS_REVIEW` 0 |

Independent of purpose, fee, sponsor, flags, home world. Manual’s “usually denied” is **always** in train.

### 2.3 `fee_status=unpaid` → always DENY

| Metric | Value |
|---|---|
| Train count | 50 |
| Outcomes | `DENIED` 50 |

Includes **`DIP-1`**. There is no separate “hardship waiver” column: waiver is already encoded as `fee_status=waived`. Unpaid never stays REVIEW.

### 2.4 Revoked sponsor (non-`DIP-1` only) → DENY

**Public manual:** `SPN-0007`, `SPN-0139`, `SPN-4040`.

**Additional revoked sponsors inferred from train** (same pattern: non-`DIP-1` always `DENIED`; `DIP-1` may `APPROVE` / `NEEDS_REVIEW`):

| sponsor_id | total | non-DIP | non-DIP DENIED | DIP APPROVED | DIP REVIEW |
|---|---:|---:|---:|---:|---:|
| `SPN-0007` | 15 | 13 | 13 | 2 | 0 |
| `SPN-0139` | 18 | 13 | 13 | 4 | 1 |
| `SPN-4040` | 20 | 15 | 15 | 5 | 0 |
| `SPN-2718` | 18 | 13 | 13 | 3 | 2 |
| `SPN-7331` | 19 | 14 | 14 | 5 | 0 |
| `SPN-9090` | 13 | 11 | 11 | 2 | 0 |

**Rule:** if `sponsor_id ∈ REVOKED` and `visa_class ≠ DIP-1` → `DENIED`.

**`DIP-1` exception:** revoked sponsor is ignored; adjudicate on other rules only.

No other sponsor with **≥3** non-DIP appearances is exclusively DENIED after controlling for other deny reasons. Many n=1 always-DENIED sponsors are explained by Wolf / stale / flags / unpaid / TRANSIT-7 — do **not** treat them as revoked without multi-case evidence.

### 2.5 `home_world=Wolf-1061c` + non-`DIP-1` → always DENY

| Slice | n | Outcomes |
|---|---:|---|
| Wolf-1061c + non-DIP | 51 | `DENIED` 51 |
| Wolf-1061c + DIP-1 | 26 | mix of A/D/R per other rules |

This holds **even when `planetary_embargo` is absent** from `risk_flags` (latent embargo / restricted-world rule).

Related: `Eris Relay` (18) and `TRAPPIST-1e` (32) are always `DENIED`, but every such row also carries `planetary_embargo` — covered by §2.1.

### 2.6 Staleness (arrival too old) → DENY for non-`DIP-1`

Manual: stale if arrival is **more than 180 days before packet receipt**, except `DIP-1` with valid diplomatic note.

**What labels teach:**

| Observation | Implication |
|---|---|
| No `receipt_date` in CSV | Cannot compute exact per-packet staleness from labels alone |
| All residual “clean” non-DIP `DENIED` after other rules have `arrival_date ≤ 2025-12-09` | Visible old dates → **`DENIED`**, not `NEEDS_REVIEW` |
| Earliest non-DIP `APPROVED` is `2026-01-28` | Non-DIP approvals are all “fresh” |
| All early (`≤2025-11`) `APPROVED` rows are `DIP-1` | DIP stale-exception is real when otherwise clean |
| All train rows have a parseable `YYYY-MM-DD` arrival | **Cannot** learn missing/hidden-date → REVIEW from labels (manual still says REVIEW) |
| Assuming receipt ≈ dataset stamp `2026-07-07`, cutoff = receipt−180d = `2026-01-08` | Separates all residual stale DENYs without false-denying fresh REVIEW cases |

**Practical rule for engine:**  
`visa_class ≠ DIP-1` and `arrival_date < receipt_date - 180 days` → `DENIED`.  
If arrival missing / only in hidden text → `NEEDS_REVIEW` (manual; unverified in CSV).  
`DIP-1` + early date + otherwise clean → `APPROVED` (treat as diplomatic-note exception when note evidence exists).

**DENY vs REVIEW for stale:** when the arrival date is present and stale, train always uses **`DENIED`**. No stale clean case is labeled `NEEDS_REVIEW`.

---

## 3. REVIEW conditions

Any one (after no DENY) → `NEEDS_REVIEW`:

### 3.1 `fee_status=unknown` → always REVIEW

| Metric | Value |
|---|---|
| Train count | 44 |
| Outcomes | `NEEDS_REVIEW` 44 / `APPROVED` 0 / `DENIED` 0 |

### 3.2 Review-only risk flags → REVIEW (no auto-escalation)

Review-only set: `identity_conflict`, `sponsor_mismatch`, `illegible_biometrics`, `rescinded_denial`.

**Critical finding:** multiple review-only flags **do not** escalate to `DENIED` by themselves in train.

| # review-only flags | Other DENY condition? | Outcomes |
|---|---|---|
| 1 | No | `NEEDS_REVIEW` 193 / `DENIED` 0 |
| 2 | No | `NEEDS_REVIEW` 24 / `DENIED` 0 |
| 1 or 2 | Yes (revoked / Wolf / stale / unpaid / TRANSIT / deny flag) | `DENIED` (deny wins) |

Max review-only co-occurrence in train is **2**. Manual’s “may combine into denial in edge cases” is **not realized** as a pure flag-count rule in these labels — every dual-flag `DENIED` has an independent deny reason.

**Never `APPROVED` with any review-only flag** (0 cases).

### 3.3 Document-level residual REVIEW (not in CSV fields)

27 cases: `risk_flags=none`, fee paid/waived, not TRANSIT-7, not revoked (non-DIP), not Wolf non-DIP, not stale under §2.6 — yet labeled `NEEDS_REVIEW`.

These are the incomplete / contradictory / illegible / untrusted-evidence cases from the manual. Field extraction can still succeed; adjudication stays REVIEW. **Do not force APPROVE from structured fields alone** when evidence hierarchy detects conflict or low trust.

---

## 4. APPROVE conditions

`APPROVED` only when **none** of the DENY/REVIEW conditions fire.

Typical clean path:

- `visa_class ∈ {XW-1, XW-2, MED-3, DIP-1}` (not `TRANSIT-7`)
- `fee_status ∈ {paid, waived}`
- `risk_flags = none`
- sponsor not revoked **or** visa is `DIP-1`
- not (Wolf-1061c ∧ non-DIP)
- arrival not stale (or DIP-1 exception)
- no document-level review triggers

### 4.1 `fee_status=waived`

| Fact | Evidence |
|---|---|
| Acceptable for `DIP-1` | many APPROVED |
| Also acceptable for non-DIP when present in labels | non-DIP waived can APPROVE when otherwise clean |
| Interpretation | Label `waived` already means a valid waiver (diplomatic or hardship) was established — do not deny merely for non-DIP waived |

### 4.2 `DIP-1` special cases

| Rule | Train support |
|---|---|
| Sponsor not required for policy | Schema still requires `SPN-####` in submissions; labels always include one |
| Revoked sponsor ignored | All 6 revoked IDs can APPROVE under DIP-1 |
| Fee may be waived | `waived` OK; but `unpaid` still DENY |
| Stale arrival OK if diplomatic note | Early 2025 DIP-1 clean → APPROVED |
| Deny flags still deny | DIP-1 + biohazard/embargo/warrant/tampering → DENIED |

### 4.3 `MED-3` + biohazard

| Rule | Train support |
|---|---|
| `biohazard_red` → DENY | 70/70 MED-3 with biohazard DENIED; also 17/17 non-MED |
| Clean biohazard not a separate positive check beyond “no biohazard_red” | MED-3 without biohazard can APPROVE |
| No MED-3 APPROVED with biohazard | 0 |

`biohazard_red` is globally disqualifying (§2.1), not MED-3-only.

---

## 5. Sponsor missing / `SPN-0000`

| Pattern | In train? |
|---|---|
| Empty sponsor | **No** (0/1000) |
| `SPN-0000` | **No** |
| All sponsors | `SPN-####` (4 digits), 864 distinct |

Manual: non-`DIP-1` needs valid sponsor. Submission schema requires `^SPN-[0-9]{4}$`.  
**Cannot** learn missing-sponsor → DENY/REVIEW mapping from labels alone. Safe policy when extraction finds no sponsor for non-DIP: prefer `NEEDS_REVIEW` (or DENY if policy treats missing as invalid sponsorship) — untested in train.

---

## 6. Full `risk_flags` value → adjudication distribution

Canonicalized as sorted pipe-joined flags (same as `evaluate.normalize_flags`).

| risk_flags | n | APPROVED | DENIED | NEEDS_REVIEW |
|---|---:|---:|---:|---:|
| `none` | 535 | 289 | 184 | 62 |
| `illegible_biometrics` | 160 | 0 | 49 | 111 |
| `biohazard_red` | 73 | 0 | 73 | 0 |
| `planetary_embargo` | 58 | 0 | 58 | 0 |
| `identity_conflict` | 33 | 0 | 3 | 30 |
| `rescinded_denial` | 31 | 0 | 2 | 29 |
| `sponsor_mismatch` | 26 | 0 | 2 | 24 |
| `active_warrant` | 14 | 0 | 14 | 0 |
| `biohazard_red\|illegible_biometrics` | 14 | 0 | 14 | 0 |
| `illegible_biometrics\|planetary_embargo` | 14 | 0 | 14 | 0 |
| `illegible_biometrics\|rescinded_denial` | 12 | 0 | 1 | 11 |
| `identity_conflict\|illegible_biometrics` | 9 | 0 | 2 | 7 |
| `illegible_biometrics\|sponsor_mismatch` | 8 | 0 | 2 | 6 |
| `memory_tampering` | 7 | 0 | 7 | 0 |
| `active_warrant\|illegible_biometrics` | 3 | 0 | 3 | 0 |
| `illegible_biometrics\|memory_tampering` | 3 | 0 | 3 | 0 |

Atomic flag vocabulary:  
`none` · `active_warrant` · `biohazard_red` · `identity_conflict` · `illegible_biometrics` · `memory_tampering` · `planetary_embargo` · `rescinded_denial` · `sponsor_mismatch`.

---

## 7. Sponsors that always correlate with DENIED

### Confirmed revoked (DIP-exempt) — use in rule engine

`SPN-0007`, `SPN-0139`, `SPN-4040`, **`SPN-2718`**, **`SPN-7331`**, **`SPN-9090`**.

### Always-DENIED in train but **not** reliable revoked IDs

- Many sponsors appear once and are DENIED for other reasons (Wolf, stale, flags, unpaid, TRANSIT-7).
- Sponsors with n=2 always-DENIED after mixing those reasons (e.g. `SPN-1934`, `SPN-4699`, `SPN-4146`) — insufficient to call revoked.
- `SPN-5532` appears as both APPROVED and DENIED → not revoked.

---

## 8. Field vocabularies (train)

### Visa classes
`DIP-1` · `MED-3` · `TRANSIT-7` · `XW-1` · `XW-2`

### Fee statuses
`paid` · `waived` · `unpaid` · `unknown`

### Species codes (12)
`ALPHA_DRACONIAN` · `ANDROMEDAN` · `AQUARIAN_MANTIS` · `ARCTURIAN` · `CENTAURI_SYNTH` · `JOVIAN_GASFORM` · `KAIJU_MICRO` · `LUNA_SECURID` · `ORION_GRAYS` · `SIRIUS_AVIAN` · `TRIANGULAN` · `VENUSIAN_MYCELIAL`

### Home worlds (13)
`Barnard-c` · `Eris Relay` · `Europa Station` · `Gliese-581g` · `Kepler-186f` · `Luyten-b` · `Mars Dome-7` · `Proxima-b` · `Sirius Outpost` · `TRAPPIST-1e` · `Titan Freeport` · `Wolf-1061c` · `Zeta Reticuli`

### Declared purposes (10)
`archive audit` · `cultural exchange` · `diplomatic` · `field repair` · `medical consult` · `reactor maintenance` · `research` · `transit` · `translation` · `xenobotany`

Purpose=`transit` is **not** tied to `TRANSIT-7` (appears across all non-TRANSIT visas). `TRANSIT-7` packets use other purposes (e.g. reactor maintenance). Do not adjudicate on purpose alone.

### Sponsor / date formats
- Sponsor: `SPN-` + exactly 4 digits (1000/1000)
- Arrival: `YYYY-MM-DD` (1000/1000); range in train: `2025-05-22` … `2026-07-12`

---

## 9. Scoring-facing normalization (`evaluate.py`)

Relevant when comparing predictions to labels:

- General fields: strip, collapse whitespace, `casefold()` equality.
- `risk_flags`: same, plus empty/`none`/`null`/`unknown` → `"none"`; otherwise split on `|`, strip parts, **sort**, rejoin with `|`.
- `fee_status` must be one of `paid|waived|unpaid|unknown` or the record is invalid.
- `adjudication` must be `APPROVED|DENIED|NEEDS_REVIEW`.
- False approval of a true `DENIED` scores **−4** raw (catastrophic). Prefer DENY/REVIEW over APPROVE under uncertainty.

---

## 10. Pseudo-code

```python
REVOKED = {
    "SPN-0007", "SPN-0139", "SPN-4040",  # manual
    "SPN-2718", "SPN-7331", "SPN-9090",  # inferred
}
DENY_FLAGS = {
    "memory_tampering", "planetary_embargo",
    "active_warrant", "biohazard_red",
}
REVIEW_FLAGS = {
    "identity_conflict", "sponsor_mismatch",
    "illegible_biometrics", "rescinded_denial",
}

def adjudicate(fields, *, receipt_date, evidence_needs_review: bool) -> str:
    flags = set(fields.risk_flags)  # empty if none
    visa = fields.visa_class
    fee = fields.fee_status

    if fee == "unknown":
        return "NEEDS_REVIEW"

    deny = False
    if flags & DENY_FLAGS:
        deny = True
    if visa == "TRANSIT-7":
        deny = True
    if fee == "unpaid":
        deny = True
    if fields.sponsor_id in REVOKED and visa != "DIP-1":
        deny = True
    if fields.home_world == "Wolf-1061c" and visa != "DIP-1":
        deny = True
    if fields.arrival_date is None or fields.arrival_only_in_hidden_text:
        return "NEEDS_REVIEW"  # manual; not observable in train CSV
    if visa != "DIP-1" and (receipt_date - fields.arrival_date).days > 180:
        deny = True
    # DIP-1 + stale: allow if diplomatic note present; else REVIEW/DENY per evidence

    if deny:
        return "DENIED"
    if flags & REVIEW_FLAGS or evidence_needs_review:
        return "NEEDS_REVIEW"
    return "APPROVED"
```

---

## 11. Open / untestable from labels alone

1. Exact per-packet `receipt_date` (use packet metadata / intake stamp when extracting).
2. Missing sponsor / `SPN-0000` outcomes (never appear).
3. Whether `fee_status=unknown` overrides deny flags (no co-occurrence).
4. Pure multi-review-flag → DENY edge case claimed by manual (absent in train).
5. The 27 residual REVIEW triggers (need PDF evidence hierarchy, not CSV).
