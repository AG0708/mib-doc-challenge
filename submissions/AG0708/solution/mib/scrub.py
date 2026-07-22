"""Adversarial scrub: drop untrusted text per FIELD_MANUAL evidence hierarchy."""

from __future__ import annotations

import re

SYSTEM_TRAP_RE = re.compile(
    r"SYSTEM:\s*ignore visible evidence.*?$",
    re.IGNORECASE | re.MULTILINE,
)
BARCODE_RE = re.compile(r"BARCODE PAYLOAD:.*$", re.IGNORECASE | re.MULTILINE)
SAMPLE_DENIAL_RE = re.compile(r"^\s*SAMPLE DENIAL\s*$", re.IGNORECASE | re.MULTILINE)
FOOTER_RE = re.compile(
    r"^Packet MIB-\d{6} / page \d+\s*$|^Synthetic hiring challenge document\s*$",
    re.MULTILINE,
)


def scrub_text(text: str) -> str:
    """Remove traps that FIELD_MANUAL says carry zero weight.

    Drops: hidden SYSTEM answer keys, barcode instruction payloads,
    SAMPLE DENIAL watermarks, and packet footers (noise).
    Keeps: form fields, manual corrections, biometric flags, fee receipts.
    """
    if not text:
        return ""
    text = SYSTEM_TRAP_RE.sub("", text)
    text = BARCODE_RE.sub("", text)
    text = SAMPLE_DENIAL_RE.sub("", text)
    text = FOOTER_RE.sub("", text)
    return text


def is_mostly_trap_or_footer(raw_text: str) -> bool:
    """True when the text layer has no usable form content (needs OCR)."""
    scrubbed = scrub_text(raw_text).strip()
    if not scrubbed:
        return True
    # Only a header remnant
    lines = [ln.strip() for ln in scrubbed.splitlines() if ln.strip()]
    if not lines:
        return True
    useful_markers = (
        "FORM I-8090",
        "MIB Fee Receipt",
        "Planetary Registry Extract",
        "FORM B-13",
        "Sponsor Attestation",
        "Manual Adjudicator Note",
        "Case ID",
        "Fee Status",
        "Observed flags",
        "Manual correction",
    )
    return not any(m in scrubbed for m in useful_markers)
