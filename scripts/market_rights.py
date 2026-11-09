#!/usr/bin/env python3
"""Time-bounded market data rights preflight. This is a safety guard, not legal approval.

A private written grant must be verified by the operator before populating any
GitHub Actions variables. Contract references are never included in published
data or diagnostic stdout.
"""
from __future__ import annotations

import os
import re
from datetime import date, datetime, timezone

SCOPE = "US_EOD_DERIVED_PUBLIC_GIT"
REQUIRED_FLAGS = ("MARKET_DERIVED_PUBLIC_OK", "MARKET_DERIVED_GIT_STORAGE_OK")
REFERENCE_KEY = "MARKET_DERIVED_LICENSE_REF"
FROM_KEY = "MARKET_DERIVED_LICENSE_VALID_FROM"
UNTIL_KEY = "MARKET_DERIVED_LICENSE_VALID_UNTIL"
SCOPE_KEY = "MARKET_DERIVED_LICENSE_SCOPE"

def day(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None

def now_day(now):
    if now is None:
        return datetime.now(timezone.utc).date()
    if isinstance(now, datetime):
        if now.tzinfo is None:
            raise ValueError("Rights check requires timezone-aware datetime")
        return now.astimezone(timezone.utc).date()
    if isinstance(now, date):
        return now
    raise TypeError("Unsupported rights check date")

def assess(*, has_key, display, environ=None, now=None):
    """Return a redacted status. Never return reference, secret, or contract text."""
    env = os.environ if environ is None else environ
    current = now_day(now)
    if not has_key:
        return {"approved": False, "reason": "key_missing"}
    if display is not True:
        return {"approved": False, "reason": "external_display_unapproved"}
    if env.get(REQUIRED_FLAGS[0]) != "true":
        return {"approved": False, "reason": "derived_public_unapproved"}
    if env.get(REQUIRED_FLAGS[1]) != "true":
        return {"approved": False, "reason": "derived_git_unapproved"}
    # A documented, non-secret operator reference to the actual permission is
    # required; it is never a substitute for the signed terms themselves.
    reference = env.get(REFERENCE_KEY, "").strip()
    if not 4 <= len(reference) <= 100 or not re.fullmatch(r"[A-Za-z0-9_.:-]+", reference):
        return {"approved": False, "reason": "written_grant_reference_missing"}
    if env.get(SCOPE_KEY) != SCOPE:
        return {"approved": False, "reason": "license_scope_unconfirmed"}
    start, until = day(env.get(FROM_KEY)), day(env.get(UNTIL_KEY))
    if not start or not until or start > until:
        return {"approved": False, "reason": "license_dates_invalid"}
    if current < start:
        return {"approved": False, "reason": "license_not_yet_valid"}
    if current > until:
        return {"approved": False, "reason": "license_expired"}
    if (current - start).days > 366:
        # Review actual third-party terms at least once each year.
        return {"approved": False, "reason": "license_review_overdue"}
    return {"approved": True, "reason": "operator_attested_active_grant"}

def licensed(*, has_key, display, environ=None, now=None):
    return assess(has_key=has_key, display=display, environ=environ, now=now)["approved"]

def main():
    has_key = bool(os.environ.get("TWELVEDATA_API_KEY"))
    display = os.environ.get("MARKET_DATA_DISPLAY_OK", "").lower() in ("1", "true")
    result = assess(has_key=has_key, display=display)
    print("ATELIER derived market data rights: " + result["reason"])
    print("External display and public Git history remain disabled unless a "
          "current written grant covers this exact scope.")
    return 0  # Blocked is the correct safe default, not a broken website.

if __name__ == "__main__":
    raise SystemExit(main())
