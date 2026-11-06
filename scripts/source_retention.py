#!/usr/bin/env python3
"""Fail-closed retention policy for licensed market returns.

Previous verified price figures are public only while BOTH credential and explicit
public-display authorization remain present. Without authorization preserve only
non-price provenance, never old quotes or derived percentage returns.
"""
from __future__ import annotations
import json
import os
import re
import tempfile
from datetime import date
from pathlib import Path

VALID_STATUSES = frozenset(("ok", "partial", "stale_cached"))

def date_ok(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return False
    try:
        date.fromisoformat(value)
        return True
    except ValueError:
        return False

def last_verified(previous, *, kind):
    """Only metadata survives revoked display access; no derived prices."""
    prior = previous if isinstance(previous, dict) else {}
    saved = prior.get("lastVerified")
    if isinstance(saved, dict) and date_ok(saved.get("asOf")):
        return {
            "asOf":saved["asOf"],
            "verifiedAt":str(saved.get("verifiedAt") or "") or None,
            "covered":max(0, int(saved.get("covered") or 0))
        }
    if prior.get("status") not in VALID_STATUSES or not date_ok(prior.get("asOf")):
        return None
    if kind == "market":
        count = len(prior.get("returns") or {})
    else:
        count = sum(isinstance(r, dict) and r.get("asOf")==prior["asOf"]
                    for r in (prior.get("companies") or {}).values())
    return {"asOf":prior["asOf"],
            "verifiedAt":prior.get("generatedAt"),
            "covered":count}

def last_good(previous, *, kind):
    """Trusted same-provider payload from a prior valid collection run."""
    if not isinstance(previous, dict) or previous.get("status") not in VALID_STATUSES:
        return False
    if not date_ok(previous.get("asOf")):
        return False
    if kind=="market":
        return isinstance((previous.get("returns") or {}).get("XLK"),dict) and bool(
            (previous.get("returns") or {}).get("XLK"))
    return bool(previous.get("companies")) and isinstance(previous["companies"],dict)

def attempt(now, status, errors=None):
    return {
        "at":now.isoformat() if hasattr(now,"isoformat") else str(now),
        "status":status,
        "errorCount":len(errors or []),
    }

def apply_blocked(output, previous, *, kind, status, now):
    """Keep provenance only. This must not leak any previous provider figures."""
    output["status"]=status
    output["asOf"]=None
    output["lastAttempt"]=attempt(now,status)
    output["lastVerified"]=last_verified(previous,kind=kind)
    output["publicDisplayAuthorized"]=False
    if kind=="market":
        output.update({"returns":{},"relative":{},"periodDates":{},"weeklyBreadth":{}})
    else:
        output.update({"companies":{},"summary":{},"benchmarkDates":{},
                       "verifiedOnBenchmarkDate":0})
    return output

def apply_stale(output, previous, *, kind, now, reason, errors=None):
    """Retain old numerical data only for an explicitly authorized outage."""
    if not last_good(previous,kind=kind):
        return False
    output["status"]="stale_cached"
    output["asOf"]=previous["asOf"]
    output["lastVerified"]=last_verified(previous,kind=kind)
    output["lastAttempt"]=attempt(now,reason,errors)
    output["publicDisplayAuthorized"]=True
    output["errors"]=list(errors or [])
    if kind=="market":
        for key in ("returns","relative","periodDates","weeklyBreadth"):
            output[key]=previous.get(key) or {}
    else:
        for key in ("companies","summary","benchmarkDates"):
            output[key]=previous.get(key) or {}
        output["verifiedOnBenchmarkDate"]=sum(
            isinstance(row,dict) and row.get("asOf")==output["asOf"]
            for row in output["companies"].values())
        output["updatedThisRun"]=0
    return True

def set_verified(output, *, kind, now):
    """Record successful provenance separately from this run's source attempts."""
    output["lastVerified"]={
        "asOf":output["asOf"],
        "verifiedAt":now.isoformat() if hasattr(now,"isoformat") else str(now),
        "covered":len(output.get("returns") or {}) if kind=="market" else
                  output.get("verifiedOnBenchmarkDate",0)
    }
    output["lastAttempt"]=attempt(now,output["status"],output.get("errors"))
    output["publicDisplayAuthorized"]=True
    return output

def atomic_write(path, payload):
    """No partial/truncated output after a write failure."""
    path=Path(path)
    path.parent.mkdir(parents=True,exist_ok=True)
    content=json.dumps(payload,ensure_ascii=False,indent=2)+"\n"
    tmp=None
    try:
        with tempfile.NamedTemporaryFile("w",encoding="utf-8",
                                         dir=path.parent,prefix="."+path.name+".",
                                         suffix=".tmp",delete=False) as stream:
            tmp=Path(stream.name)
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(tmp,path)
    finally:
        if tmp is not None and tmp.exists():
            tmp.unlink()
