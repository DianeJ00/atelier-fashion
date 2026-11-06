#!/usr/bin/env python3
"""Reusable, rate-conscious SEC EDGAR client for publicly available JSON.

Cache only successful official JSON responses for a short interval within one
workflow checkout. No cross-run cache is committed, and no data is silently
reclassified as recently filed merely because an HTTP request succeeded.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT / ".sec-cache"
RETRYABLE_HTTP = frozenset((429, 500, 502, 503, 504))
ALLOWED_HOSTS = frozenset(("data.sec.gov", "www.sec.gov"))

def ticker_ciks(raw):
    """Normalize the SEC's official company_tickers.json registry."""
    rows = raw.values() if isinstance(raw, dict) else raw if isinstance(raw, list) else []
    result = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        ticker = str(row.get("ticker") or "").upper()
        try:
            cik = int(row.get("cik_str") or 0)
        except (ValueError, TypeError):
            continue
        if ticker and cik > 0:
            result[ticker] = cik
    return result

def get_json(url, user_agent, *, cache_dir=None, ttl_seconds=1800,
             opener=urlopen, sleeper=time.sleep, now=time.time):
    """Return official SEC JSON, with bounded transient retries.

    The default cache is ephemeral and stays outside published assets.
    A failed request is never cached as an empty successful SEC document.
    """
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
        raise ValueError("SEC client requires an approved HTTPS EDGAR URL")
    if not user_agent or "@" not in user_agent:
        raise ValueError("SEC fair-access User-Agent/contact email is required")
    cache_root = Path(cache_dir) if cache_dir is not None else CACHE_DIR
    filename = hashlib.sha256(url.encode("utf-8")).hexdigest() + ".json"
    cached = cache_root / filename
    if ttl_seconds > 0:
        try:
            age = now() - cached.stat().st_mtime
            if 0 <= age < ttl_seconds:
                payload = json.loads(cached.read_bytes())
                if isinstance(payload, dict):
                    return payload
        except (OSError, ValueError, UnicodeError):
            pass
    headers = {
        "User-Agent": user_agent,
        "Accept": "application/json",
        "Accept-Encoding": "identity",
    }
    req = Request(url, headers=headers)
    for attempt in range(3):
        try:
            with opener(req, timeout=18) as response:
                raw = response.read()
            payload = json.loads(raw)
            if not isinstance(payload, dict):
                raise ValueError("SEC EDGAR response must be a JSON object")
            try:
                cache_root.mkdir(parents=True, exist_ok=True)
                tmp = cached.with_suffix(f".{os.getpid()}.{time.time_ns()}.tmp")
                tmp.write_bytes(raw)
                os.replace(tmp, cached)
            except OSError:
                pass  # Never discard a verified API response due to cache I/O.
            return payload
        except HTTPError as exc:
            if exc.code not in RETRYABLE_HTTP or attempt == 2:
                raise
        except (URLError, TimeoutError):
            if attempt == 2:
                raise
        sleeper(min(4.0, 2.0 ** attempt))
    raise RuntimeError("SEC retry loop unexpectedly exhausted")
