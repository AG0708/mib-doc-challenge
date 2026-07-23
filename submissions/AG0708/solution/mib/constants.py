"""Shared constants. Rules cite FIELD_MANUAL.md clauses in comments."""

from datetime import date

# FIELD_MANUAL: Known revoked sponsors in the public manual.
# Extra IDs inferred from train: non-DIP always DENIED; DIP may APPROVE.
REVOKED_SPONSORS = {
    "SPN-0007",
    "SPN-0139",
    "SPN-4040",
    "SPN-2718",
    "SPN-7331",
    "SPN-9090",
}

# FIELD_MANUAL: Disqualifying flags
DENY_FLAGS = {
    "memory_tampering",
    "planetary_embargo",
    "active_warrant",
    "biohazard_red",
}

# FIELD_MANUAL: Review-only flags (do not escalate by count alone — train confirms)
REVIEW_FLAGS = {
    "identity_conflict",
    "sponsor_mismatch",
    "illegible_biometrics",
    "rescinded_denial",
}

VISA_CLASSES = {"XW-1", "XW-2", "DIP-1", "MED-3", "TRANSIT-7"}
FEE_STATUSES = {"paid", "waived", "unpaid", "unknown"}

# Train vocabularies (open-world tolerant: format-validated, not closed)
SPECIES_CODES = {
    "ALPHA_DRACONIAN",
    "ANDROMEDAN",
    "AQUARIAN_MANTIS",
    "ARCTURIAN",
    "CENTAURI_SYNTH",
    "JOVIAN_GASFORM",
    "KAIJU_MICRO",
    "LUNA_SECURID",
    "ORION_GRAYS",
    "SIRIUS_AVIAN",
    "TRIANGULAN",
    "VENUSIAN_MYCELIAL",
}

HOME_WORLDS = {
    "Barnard-c",
    "Eris Relay",
    "Europa Station",
    "Gliese-581g",
    "Kepler-186f",
    "Luyten-b",
    "Mars Dome-7",
    "Proxima-b",
    "Sirius Outpost",
    "TRAPPIST-1e",
    "Titan Freeport",
    "Wolf-1061c",
    "Zeta Reticuli",
}

PURPOSES = {
    "archive audit",
    "cultural exchange",
    "diplomatic",
    "field repair",
    "medical consult",
    "reactor maintenance",
    "research",
    "transit",
    "translation",
    "xenobotany",
}

# Dataset stamp used when packet receipt date cannot be recovered.
# FIELD_MANUAL: stale if arrival > 180 days before receipt.
DEFAULT_RECEIPT_DATE = date(2026, 7, 7)
STALE_DAYS = 180

# Latent restricted world (train: Wolf-1061c + non-DIP always DENY even without flag)
RESTRICTED_WORLDS = {"Wolf-1061c"}

# Train: every Eris Relay / TRAPPIST-1e row is DENIED (always carries planetary_embargo
# in labels). When the flag is invisible in the PDF, home_world alone is sufficient.
# Applies to ALL visas including DIP-1 (unlike Wolf).
EMBARGO_WORLDS = {"Eris Relay", "TRAPPIST-1e"}

SPECIAL_UNREADABLE = {"UNREADABLE", "[NAME CUT OUT]", "[FEE STATUS OBSCURED]", "N/A", ""}
