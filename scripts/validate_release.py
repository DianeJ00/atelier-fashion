#!/usr/bin/env python3
"""ATELIER release gate: verify issuer joins, source dates and immutable file hashes.

Usage: python scripts/validate_release.py build|check|verify-site [site_dir]
Do not treat successful source collection as proof that a price or article is live.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = "data-manifest.json"
DATA_FILES = (
    "research-universe.json", "research-pipeline.json",
    "market-relative.json", "market-reviewed.json", "stock-relative.json",
    "clinical-trials.json", "consumer-official.json", "korea-dart.json",
    "atelier-weekly.json", "sec-trends.json", "data-health.json",
    "weekly-research.json", "official-financials.json",
    "consumer-samples.json", "weekly-investment.json",
    "weekly-content.json", "biotech-financials.json",
)
EXPECTED = {"패션": 12, "소비재·서비스": 15, "바이오·제약": 20, "내 담당 기업": 5}
GROUP_FILES = {
    "official-financials.json": "패션",
    "consumer-official.json": "소비재·서비스",
    "biotech-financials.json": "바이오·제약",
}

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def parse_day(value):
    if not isinstance(value, str) or len(value) < 10:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None

def read_data(root: Path):
    records, problems = {}, []
    for filename in DATA_FILES:
        try:
            raw = (root / filename).read_bytes()
            obj = json.loads(raw)
        except (OSError, UnicodeError, ValueError) as exc:
            problems.append(f"{filename}: cannot read valid UTF-8 JSON ({type(exc).__name__})")
            continue
        if not isinstance(obj, dict):
            problems.append(f"{filename}: top-level value must be an object")
        else:
            records[filename] = obj
    return records, problems

def validate(records):
    """Fail invalid data joins and inconsistent reporting periods, not optional licences."""
    errors = []
    uni = records.get("research-universe.json", {})
    companies = uni.get("companies")
    if not isinstance(companies, list) or len(companies) != 52:
        errors.append("universe: expected 52 companies")
        companies = companies if isinstance(companies, list) else []
    identifiers = [x.get("id") for x in companies if isinstance(x, dict)]
    tickers = [x.get("ticker") for x in companies if isinstance(x, dict)]
    if len(set(identifiers)) != len(identifiers) or not all(identifiers):
        errors.append("universe: duplicate/missing issuerId")
    if len(set(tickers)) != len(tickers) or not all(tickers):
        errors.append("universe: duplicate/missing ticker")
    idx = {x.get("ticker"): x for x in companies if isinstance(x, dict)}
    for sector, expected in EXPECTED.items():
        if sum(x.get("sector") == sector for x in companies if isinstance(x, dict)) != expected:
            errors.append(f"universe: {sector} expected {expected}")
    for company in companies:
        if not isinstance(company, dict):
            errors.append("universe: non-object company")
            continue
        prefix = "US:" if company.get("market") == "미국" else "KR:" if company.get("market") == "한국" else None
        if prefix is None or company.get("id") != prefix + str(company.get("ticker", "")):
            errors.append(f"universe: invalid issuer ID mapping {company.get('id')}")
    for filename, sector in GROUP_FILES.items():
        rows = records.get(filename, {}).get("companies")
        expected = EXPECTED[sector]
        if not isinstance(rows, list) or len(rows) != expected:
            errors.append(f"{filename}: expected {expected} issuer records")
            continue
        observed = []
        for row in rows:
            if not isinstance(row, dict):
                errors.append(f"{filename}: non-object issuer")
                continue
            ticker = row.get("ticker")
            observed.append(ticker)
            if ticker not in idx or idx[ticker].get("sector") != sector:
                errors.append(f"{filename}: invalid sector/ticker {ticker}")
            verified = row.get("sec") if filename == "consumer-official.json" else row
            if not isinstance(verified, dict) or verified.get("status") != "quarter_verified":
                continue  # Stale/blocked filing is allowed but cannot be called verified.
            quarter = verified.get("quarter")
            if not isinstance(quarter, dict):
                errors.append(f"{filename}: {ticker} verified without quarter")
                continue
            start, end = parse_day(quarter.get("periodStart")), parse_day(quarter.get("periodEnd"))
            filed = parse_day(quarter.get("filed"))
            if not start or not end or end < start or (filed is not None and filed < end):
                errors.append(f"{filename}: {ticker} reporting period / filing dates invalid")
        if len(set(observed)) != expected:
            errors.append(f"{filename}: duplicate tickers")
    for filename, key in (
        ("clinical-trials.json", "assets"),
        ("research-pipeline.json", "records"),
        ("sec-trends.json", "companies"),
        ("atelier-weekly.json", "items"),
    ):
        rows = records.get(filename, {}).get(key)
        if not isinstance(rows, list):
            errors.append(f"{filename}: missing {key}")
            continue
        for row in rows:
            if not isinstance(row, dict):
                errors.append(f"{filename}: non-object item")
                continue
            ticker = row.get("ticker")
            if ticker and ticker not in idx:
                errors.append(f"{filename}: unknown issuer {ticker}")
    health = records.get("data-health.json", {})
    items = health.get("items")
    if not isinstance(items, list):
        errors.append("data-health: missing audit items")
        items = []
    ids = [x.get("id") for x in items if isinstance(x, dict)]
    if len(set(ids)) != len(ids):
        errors.append("data-health: duplicate audit ids")
    for essential in ("market", "stocks", "fashion_sec", "consumer_sec",
                      "biotech_sec", "biotech_trials", "weekly", "korea"):
        if essential not in ids:
            errors.append(f"data-health: missing {essential}")
    if health.get("coverage", {}).get("tracked") != 52:
        errors.append("data-health: tracked universe != 52")
    allowed = {"live", "reviewed_snapshot", "partial", "blocked"}
    for item in items:
        if not isinstance(item, dict):
            errors.append("data-health: non-object audit item")
            continue
        if item.get("status") not in allowed:
            errors.append(f"data-health: unknown status {item.get('id')}")
        covered, total = item.get("covered"), item.get("total")
        if not isinstance(covered, int) or covered < 0 or (
            total is not None and (not isinstance(total, int) or covered > total)
        ):
            errors.append(f"data-health: invalid covered/total for {item.get('id')}")
        if item.get("asOf") is not None and not parse_day(item.get("asOf")):
            errors.append(f"data-health: bad asOf for {item.get('id')}")
    market = records.get("market-relative.json", {})
    stocks = records.get("stock-relative.json", {})
    if market.get("status") in ("ok", "partial"):
        if not parse_day(market.get("asOf")):
            errors.append("market: live feed without valid asOf")
        if not isinstance(market.get("returns", {}).get("XLK"), dict):
            errors.append("market: missing comparable XLK returns")
    else:
        # Missing a licence is not a successful price refresh.
        if market.get("status") in ("key_required", "display_permission_required"):
            if market.get("asOf") is not None or market.get("returns"):
                errors.append("market: blocked feed must not claim current prices")
    if stocks.get("status") in ("ok", "partial"):
        if stocks.get("asOf") != market.get("asOf") or not parse_day(stocks.get("asOf")):
            errors.append("stocks: benchmark and stock asOf dates mismatch")
    if records.get("market-reviewed.json", {}).get("status") == "source_verified_snapshot":
        if not parse_day(records["market-reviewed.json"].get("asOf")):
            errors.append("market snapshot: invalid reviewed date")
    for filename, record in records.items():
        if record.get("generatedAt") is not None and not parse_day(record["generatedAt"]):
            errors.append(f"{filename}: malformed generatedAt")
    return errors

def build_manifest(root: Path = ROOT):
    records, errors = read_data(root)
    errors.extend(validate(records))
    if errors:
        raise ValueError("Release rejected:\n" + "\n".join(" - " + x for x in errors))
    details = {}
    for filename in DATA_FILES:
        raw = (root / filename).read_bytes()
        record = records[filename]
        details[filename] = {
            "sha256": sha(raw), "bytes": len(raw),
            "asOf": record.get("asOf"),
            "generatedAt": record.get("generatedAt"),
            "status": record.get("status", record.get("sourceStatus")),
        }
    fingerprint = sha(json.dumps(
        {name: x["sha256"] for name, x in details.items()},
        ensure_ascii=True, sort_keys=True, separators=(",", ":"),
    ).encode("utf-8"))
    return {
        "schemaVersion": 1,
        "releaseId": fingerprint[:20],
        "contentSha256": fingerprint,
        "builtAt": datetime.now(timezone.utc).isoformat(),
        "dataFiles": details,
        "policy": "Checked files from one release; unavailable providers are not treated as live.",
    }

def write_manifest(root: Path = ROOT):
    manifest = build_manifest(root)
    path = root / MANIFEST
    pending = path.with_suffix(".tmp")
    pending.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(pending, path)
    return manifest

def check_manifest(root: Path = ROOT):
    actual = json.loads((root / MANIFEST).read_text(encoding="utf-8"))
    expected = build_manifest(root)
    if not isinstance(actual, dict) or actual.get("releaseId") != expected["releaseId"]:
        raise ValueError("Manifest releaseId does not match current dataset")
    if actual.get("dataFiles") != expected["dataFiles"] or actual.get("contentSha256") != expected["contentSha256"]:
        raise ValueError("Release content hashes or provenance mismatch")
    if not re.fullmatch(r"[a-f0-9]{20}", actual["releaseId"]):
        raise ValueError("Invalid release ID")
    return actual

def check_site(site: Path, root: Path = ROOT):
    manifest = check_manifest(root)
    found = json.loads((site / MANIFEST).read_text(encoding="utf-8"))
    if found != manifest:
        raise ValueError("Site manifest differs from committed manifest")
    rid = manifest["releaseId"]
    html = (site / "index.html").read_text(encoding="utf-8")
    if f'window.ATELIER_RELEASE_ID="{rid}"' not in html:
        raise ValueError("Site HTML not pinned to its release")
    for filename, entry in manifest["dataFiles"].items():
        pinned = site / "releases" / rid / filename
        if not pinned.is_file() or sha(pinned.read_bytes()) != entry["sha256"]:
            raise ValueError(f"Site release file invalid: {filename}")
    return manifest

def main():
    mode = sys.argv[1] if len(sys.argv) >= 2 else "check"
    if mode == "build":
        data = write_manifest(ROOT)
    elif mode == "check":
        data = check_manifest(ROOT)
    elif mode == "verify-site":
        data = check_site(Path(sys.argv[2]) if len(sys.argv) >= 3 else ROOT / "_site")
    else:
        raise SystemExit("Usage: validate_release.py build|check|verify-site [site_dir]")
    print(f"ATELIER release verified {data['releaseId']} ({len(data['dataFiles'])} JSON files)")

if __name__ == "__main__":
    main()
