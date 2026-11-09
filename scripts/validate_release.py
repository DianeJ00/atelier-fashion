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
    "price-events.json",
    "clinical-trials.json", "consumer-official.json", "korea-dart.json",
    "atelier-weekly.json", "sec-trends.json", "data-health.json",
    "weekly-research.json", "official-financials.json",
    "consumer-samples.json", "weekly-investment.json",
    "weekly-content.json", "biotech-financials.json",
)
# All executable/style assets that affect behavior form part of the browser build ID.
SITE_ASSETS = (
    "legacy-fashion-data.js", "legacy-fashion.js",
    "atelier-data.js", "atelier-backup.js", "atelier-quotes.js", "research2.js", "research2.css",
    "research3.js", "research3.css", "consumer2.js", "consumer2.css",
    "market-live.js", "health.js", "korea.js",
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
    price_states = ("ok", "partial", "stale_cached")
    blocked_states = ("key_required", "display_permission_required", "benchmark_missing")
    for name, record in (("market",market),("stocks",stocks)):
        last=record.get("lastVerified")
        if last is not None and (not isinstance(last,dict) or
                                  not isinstance(last.get("asOf"),str) or
                                  not parse_day(last.get("asOf"))):
            errors.append(f"{name}: lastVerified metadata invalid")
        current=record.get("status")
        if current in price_states and record.get("publicDisplayAuthorized") is not True:
            errors.append(f"{name}: published price figures without display authorization")
        if current in blocked_states:
            if record.get("asOf") is not None or record.get("publicDisplayAuthorized") is True:
                errors.append(f"{name}: blocked output must not claim licensed current prices")
    if market.get("status") in price_states:
        if not parse_day(market.get("asOf")):
            errors.append("market: licensed returns without valid asOf")
        if not isinstance((market.get("returns") or {}).get("XLK"),dict):
            errors.append("market: missing comparable XLK returns")
        if market.get("status")=="stale_cached":
            if (market.get("lastVerified") or {}).get("asOf")!=market.get("asOf"):
                errors.append("market: stale asOf must match last verified close")
            if not (market.get("lastAttempt") or {}).get("status"):
                errors.append("market: stale result requires collection-failure reason")
    else:
        if market.get("returns") or market.get("relative") or market.get("weeklyBreadth"):
            errors.append("market: nonlicensed/unavailable output contains prices")
        if market.get("asOf") is not None:
            errors.append("market: unavailable result claims a verified close")
    if stocks.get("status") in ("ok","partial"):
        if stocks.get("asOf") != market.get("asOf") or not parse_day(stocks.get("asOf")):
            errors.append("stocks: benchmark and stock asOf dates mismatch")
        if market.get("status") not in ("ok","partial"):
            errors.append("stocks: current comparisons require a current benchmark")
    elif stocks.get("status")=="stale_cached":
        if (market.get("status")!="stale_cached" or
            stocks.get("asOf")!=market.get("asOf") or
            stocks.get("benchmarkDates")!=market.get("periodDates") or
            not stocks.get("companies")):
            errors.append("stocks: stale comparisons require matching last verified ETF snapshot")
    else:
        if stocks.get("asOf") is not None or stocks.get("companies") or stocks.get("summary"):
            errors.append("stocks: blocked result contains previous licensed figures")
        if stocks.get("verifiedOnBenchmarkDate",0):
            errors.append("stocks: blocked result claims current coverage")
    events_feed=records.get("price-events.json", {})
    events=events_feed.get("events")
    event_status=events_feed.get("status")
    event_authorized=events_feed.get("publicDerivedAuthorized") is True
    if not isinstance(events,list):
        errors.append("price-events: events must be an array")
        events=[]
    if event_status not in ("permission_required","no_verified_daily_closes","ready","partial"):
        errors.append("price-events: invalid status")
    coverage=events_feed.get("coverage") or {}
    scanned=coverage.get("screened")
    attempted=coverage.get("attempted")
    not_verified=coverage.get("notVerified")
    not_attempted=coverage.get("notAttempted")
    if (not isinstance(scanned,int) or isinstance(scanned,bool) or scanned<0 or scanned>47 or
        coverage.get("totalUS")!=47):
        errors.append("price-events: invalid screened coverage")
    if attempted is not None and (
        type(scanned) is not int or type(attempted) is not int or type(not_verified) is not int or
        type(not_attempted) is not int or
        not 0<=scanned<=attempted<=47 or
        not_verified!=attempted-scanned or not_attempted!=47-attempted
    ):
        errors.append("price-events: attempted, verified and missing counts must reconcile")
    if event_status in ("permission_required","no_verified_daily_closes"):
        if events or events_feed.get("asOf") is not None or event_authorized or scanned not in (0,):
            errors.append("price-events: blocked state must contain no market-derived figures")
    else:
        if (not event_authorized or not parse_day(events_feed.get("asOf"))
            or market.get("status") not in ("ok","partial")
            or events_feed.get("asOf")!=market.get("asOf")
            or not isinstance(scanned,int) or scanned==0):
            errors.append("price-events: active data require licensed current ETF benchmark")
        if event_status=="ready" and scanned!=47:
            errors.append("price-events: ready requires the full 47-issuer scan")
        if event_status=="partial" and scanned==47:
            errors.append("price-events: full scan must be labeled ready")
    if events_feed.get("eligibleEvents") not in (None,len(events)):
        errors.append("price-events: candidate event count mismatch")
    seen_events=set()
    for event in events:
        if not isinstance(event,dict):
            errors.append("price-events: non-object event")
            continue
        event_id=event.get("issuerId")
        record=next((x for x in companies if isinstance(x,dict) and x.get("id")==event_id),None)
        if not record or record.get("market")!="미국" or record.get("ticker")!=event.get("ticker"):
            errors.append("price-events: unknown event issuer")
        if event_id in seen_events:
            errors.append("price-events: duplicate event issuer")
        seen_events.add(event_id)
        if event.get("tradeDate")!=events_feed.get("asOf"):
            errors.append("price-events: event trade date mismatch")
        if event.get("causalityConfirmed") is not False:
            errors.append("price-events: unproven price cause cannot be confirmed")
        if (event.get("evidenceState") not in (
            "원인 미확인","공식 사건 동기간 확인 · 인과 미확정",
            "관련 뉴스 동기간 확인 · 인과 미확정"
        ) or not isinstance(event.get("changePct"),(int,float))
            or abs(event.get("changePct"))<8
            or not isinstance(event.get("volatilityMultiple"),(int,float))
            or event.get("volatilityMultiple")<2):
            errors.append("price-events: event does not meet detection threshold")
        if any(k in event for k in ("close","previousClose","volume","averageVolume20d")):
            errors.append("price-events: raw provider quote must not be published")
        for ev in event.get("evidence") or []:
            if (not isinstance(ev,dict) or not str(ev.get("url","")).startswith("https://")
                or str(ev.get("publishedAt",""))[:10]>str(event.get("tradeDate",""))):
                errors.append("price-events: unverified event evidence")
    if records.get("market-reviewed.json", {}).get("status") == "source_verified_snapshot":
        if not parse_day(records["market-reviewed.json"].get("asOf")):
            errors.append("market snapshot: invalid reviewed date")
    for filename, record in records.items():
        if record.get("generatedAt") is not None and not parse_day(record["generatedAt"]):
            errors.append(f"{filename}: malformed generatedAt")
    return errors

def validate_pipeline_seed(root: Path, records):
    """Human-selected watchlist must remain separate from generated trial stages."""
    problems = []
    try:
        seed = json.loads((root / "research-pipeline-seed.json").read_text(encoding="utf-8"))
    except (OSError, ValueError, UnicodeError):
        return ["research-pipeline-seed: missing or invalid JSON"]
    rows = seed.get("records", [])
    generated = records.get("research-pipeline.json", {}).get("records", [])
    if not isinstance(rows, list) or len(rows) != 12:
        return ["research-pipeline-seed: expected 12 editorial records"]
    allowed = {"ticker", "asset", "disease", "modality", "source", "check", "link"}
    pairs = set()
    output = {(x.get("ticker"), str(x.get("asset", "")).casefold()): x
              for x in generated if isinstance(x, dict)}
    for row in rows:
        if not isinstance(row, dict):
            problems.append("research-pipeline-seed: non-object asset")
            continue
        if set(row) != allowed:
            problems.append(f"research-pipeline-seed: generated or missing fields in {row.get('ticker')}")
        pair = (row.get("ticker"), str(row.get("asset", "")).casefold())
        if pair in pairs:
            problems.append("research-pipeline-seed: duplicate ticker/asset")
        pairs.add(pair)
        target = output.get(pair)
        if not target or any(target.get(key) != row.get(key) for key in allowed):
            problems.append(f"research-pipeline: generated record disagrees with seed for {pair}")
    if len(output) != len(rows):
        problems.append("research-pipeline: generated records count differs from editorial seed")
    return problems

def build_manifest(root: Path = ROOT):
    records, errors = read_data(root)
    errors.extend(validate(records))
    errors.extend(validate_pipeline_seed(root, records))
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

def site_version(root: Path, manifest):
    """Code-only deploys change buildId even if validated financial JSON is identical."""
    source_hashes = {name: sha((root / name).read_bytes())
                     for name in (*SITE_ASSETS, "index.html")}
    code_hash = sha(json.dumps(source_hashes, sort_keys=True,
                               separators=(",", ":")).encode("utf-8"))
    build_id = sha((manifest["releaseId"] + ":" + code_hash).encode("utf-8"))[:20]
    return {"schemaVersion": 1, "buildId": build_id,
            "releaseId": manifest["releaseId"], "codeSha256": code_hash}

def check_site(site: Path, root: Path = ROOT):
    manifest = check_manifest(root)
    found = json.loads((site / MANIFEST).read_text(encoding="utf-8"))
    if found != manifest:
        raise ValueError("Site manifest differs from committed manifest")
    rid = manifest["releaseId"]
    html = (site / "index.html").read_text(encoding="utf-8")
    if f'window.ATELIER_RELEASE_ID="{rid}"' not in html:
        raise ValueError("Site HTML not pinned to its release")
    expected_version = site_version(root, manifest)
    deployed_version = json.loads((site / "site-version.json").read_text(encoding="utf-8"))
    if deployed_version != expected_version:
        raise ValueError("Site code/data build version mismatch")
    if f'window.ATELIER_BUILD_ID="{expected_version["buildId"]}"' not in html:
        raise ValueError("Site HTML build ID not pinned to its source code")
    for filename in SITE_ASSETS:
        if sha((site / filename).read_bytes()) != sha((root / filename).read_bytes()):
            raise ValueError(f"Site code file differs from tested source: {filename}")
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
