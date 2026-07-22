"""FIELD_MANUAL rule engine + expected-value decision layer.

Every rule cites a FIELD_MANUAL clause (or train-inferred extension marked as such).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

from .constants import (
    DEFAULT_RECEIPT_DATE,
    DENY_FLAGS,
    RESTRICTED_WORLDS,
    REVIEW_FLAGS,
    REVOKED_SPONSORS,
    STALE_DAYS,
)
from .extract import ExtractedFields


@dataclass
class Decision:
    adjudication: str
    confidence: float
    posterior: dict[str, float]
    reasons: list[str]
    fields: dict[str, Any]


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def _flag_set(risk_flags: str | None) -> set[str]:
    if not risk_flags or risk_flags in {"none", "null", "unknown", ""}:
        return set()
    return {p.strip() for p in risk_flags.split("|") if p.strip()}


def compute_posteriors(fields: ExtractedFields, receipt_date: date | None = None) -> tuple[dict[str, float], list[str]]:
    """Return (pA, pD, pR) and reason traces from deterministic rules.

    Rules are near-certain; residual uncertainty is encoded as mass on REVIEW.
    """
    receipt = receipt_date or DEFAULT_RECEIPT_DATE
    reasons: list[str] = []
    flags = _flag_set(fields.risk_flags)
    visa = fields.visa_class or "unknown"
    fee = fields.fee_status or "unknown"
    sponsor = fields.sponsor_id or ""
    home = fields.home_world or ""
    arrival = _parse_date(fields.arrival_date)

    # FIELD_MANUAL: visible MIB adjudicator stamp / signed manual note is the
    # highest-precedence trusted evidence. Train: Finding lines match labels
    # 162/162 with no counterexamples.
    if fields.note_finding in {"APPROVED", "DENIED", "NEEDS_REVIEW"}:
        reasons.append(f"note_finding={fields.note_finding}")
        if fields.note_finding == "APPROVED":
            return {"APPROVED": 0.96, "DENIED": 0.02, "NEEDS_REVIEW": 0.02}, reasons
        if fields.note_finding == "DENIED":
            return {"APPROVED": 0.02, "DENIED": 0.96, "NEEDS_REVIEW": 0.02}, reasons
        return {"APPROVED": 0.02, "DENIED": 0.02, "NEEDS_REVIEW": 0.96}, reasons

    # Soft uncertainty boosters (shift mass toward REVIEW without forcing DENY)
    uncertainty = 0.0
    if fields.used_ocr:
        uncertainty += 0.05
    if fields.conflicts:
        uncertainty += 0.15
    if fields.fee_obscured:
        uncertainty += 0.1
    if fields.name_cut_out and not fields.applicant_name:
        uncertainty += 0.1
    # Missing biometric flags after OCR: raise uncertainty (false-approve risk)
    if fields.used_ocr and "risk_flags" not in fields.sources:
        uncertainty += 0.25

    # --- DENY conditions first (hard policy beats missing fee) ---
    # Train never co-occurs fee=unknown with deny flags, but extraction can.
    deny = False
    deny_reasons: list[str] = []

    # FIELD_MANUAL: Disqualifying flags
    if flags & DENY_FLAGS:
        deny = True
        deny_reasons.append(f"deny_flags={sorted(flags & DENY_FLAGS)}")

    # FIELD_MANUAL: TRANSIT-7 work authorization should usually be denied (train: always)
    if visa == "TRANSIT-7":
        deny = True
        deny_reasons.append("TRANSIT-7->DENY")

    # FIELD_MANUAL: unpaid → deny unless visible waiver (waiver encoded as fee=waived)
    if fee == "unpaid":
        deny = True
        deny_reasons.append("unpaid->DENY")

    # FIELD_MANUAL: revoked sponsors; DIP-1 exempt. Extra IDs: train-inferred.
    if sponsor in REVOKED_SPONSORS and visa != "DIP-1":
        deny = True
        deny_reasons.append(f"revoked_sponsor={sponsor}")

    # Train-inferred: Wolf-1061c + non-DIP always DENY (latent embargo)
    if home in RESTRICTED_WORLDS and visa != "DIP-1":
        deny = True
        deny_reasons.append(f"restricted_world={home}")

    # FIELD_MANUAL: stale if arrival > 180d before receipt; DIP-1 + diplomatic note exception
    if visa != "DIP-1" and arrival is not None:
        age = (receipt - arrival).days
        if age > STALE_DAYS:
            deny = True
            deny_reasons.append(f"stale_arrival_days={age}")

    if deny:
        reasons.extend(deny_reasons)
        p_d = max(0.85, 0.97 - uncertainty)
        p_r = min(0.12, 0.02 + uncertainty)
        p_a = max(0.01, 1.0 - p_d - p_r)
        return {"APPROVED": p_a, "DENIED": p_d, "NEEDS_REVIEW": p_r}, reasons

    # --- Terminal REVIEW: fee unknown (FIELD_MANUAL fee rules) ---
    if fee == "unknown":
        reasons.append("fee_unknown->REVIEW")  # FIELD_MANUAL: unknown → needs review
        return {"APPROVED": 0.02, "DENIED": 0.02, "NEEDS_REVIEW": 0.96}, reasons

    # --- Arrival missing / only unreadable (FIELD_MANUAL date rules) ---
    if fields.arrival_unreadable or arrival is None:
        reasons.append("arrival_missing->REVIEW")  # FIELD_MANUAL: missing/hidden arrival → REVIEW
        return {"APPROVED": 0.03, "DENIED": 0.05, "NEEDS_REVIEW": 0.92}, reasons

    # --- REVIEW conditions ---
    review = False

    # FIELD_MANUAL: review-only flags (no auto-escalation by count — train)
    if flags & REVIEW_FLAGS:
        review = True
        reasons.append(f"review_flags={sorted(flags & REVIEW_FLAGS)}")

    if fields.evidence_needs_review:
        review = True
        reasons.append("evidence_needs_review")

    # Missing critical fields for non-DIP
    if visa != "DIP-1" and not sponsor:
        review = True
        reasons.append("missing_sponsor")

    if fee not in {"paid", "waived"}:
        review = True
        reasons.append(f"fee_not_clear={fee}")

    if review:
        p_r = max(0.80, 0.93 - uncertainty * 0.3)
        rem = 1.0 - p_r
        return {"APPROVED": rem * 0.35, "DENIED": rem * 0.65, "NEEDS_REVIEW": p_r}, reasons

    # Clean APPROVE path
    reasons.append("clean_approve")
    # Only treat biometric flags as missing when we never observed a B-13 /
    # Observed-flags line. used_ocr alone is not enough (registry OCR is common).
    missing_bio = fields.used_ocr and "risk_flags" not in fields.sources
    if missing_bio:
        p_a = max(0.55, 0.78 - uncertainty * 0.5)
        rem = 1.0 - p_a
        # EV: keep APPROVE competitive vs REVIEW when packet otherwise looks clean
        return {"APPROVED": p_a, "DENIED": rem * 0.35, "NEEDS_REVIEW": rem * 0.65}, reasons
    p_a = max(0.80, 0.96 - uncertainty)
    rem = 1.0 - p_a
    return {"APPROVED": p_a, "DENIED": rem * 0.4, "NEEDS_REVIEW": rem * 0.6}, reasons


def expected_points(posterior: dict[str, float]) -> dict[str, float]:
    """Payoff matrix from EVALUATION.md / PLAN §2.1."""
    pA = posterior["APPROVED"]
    pD = posterior["DENIED"]
    pR = posterior["NEEDS_REVIEW"]
    return {
        "APPROVED": 8 * pA - 4 * pD + 1 * pR,
        "DENIED": 8 * pD + 1 * pR,
        "NEEDS_REVIEW": 2 + 6 * pR,
    }


def choose_action(posterior: dict[str, float]) -> str:
    """Argmax expected points — never raw argmax probability (PLAN §2.1)."""
    ev = expected_points(posterior)
    # Tie-break preference: DENIED > NEEDS_REVIEW > APPROVED (minimize false approvals)
    return max(["DENIED", "NEEDS_REVIEW", "APPROVED"], key=lambda a: (ev[a], {"DENIED": 2, "NEEDS_REVIEW": 1, "APPROVED": 0}[a]))


def confidence_from_posterior(action: str, posterior: dict[str, float], *, clamp: tuple[float, float] = (0.02, 0.98)) -> float:
    """Confidence = P(chosen action is correct), clamped."""
    lo, hi = clamp
    return float(min(hi, max(lo, posterior.get(action, 0.5))))


def adjudicate(fields: ExtractedFields, receipt_date: date | None = None) -> Decision:
    posterior, reasons = compute_posteriors(fields, receipt_date=receipt_date)
    action = choose_action(posterior)
    conf = confidence_from_posterior(action, posterior)
    pred = fields.as_prediction_fields()
    pred["adjudication"] = action
    pred["confidence"] = conf
    return Decision(
        adjudication=action,
        confidence=conf,
        posterior=posterior,
        reasons=reasons,
        fields=pred,
    )
