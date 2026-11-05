#!/usr/bin/env python3
"""ATELIER 2.3: strictly period-matched SEC GAAP QoQ / YoY comparisons.

Current metric must originate in a verified 10-Q accession. Comparison facts
must use the identical GAAP concept, currency, and ~3-month duration. Q4 is
intentionally unavailable unless a separately verified 3-month SEC fact exists.
Issuer-specific GMV, comps, visits, subscriber and adjusted KPIs are never
inferred from GAAP revenue.
"""
from __future__ import annotations

import json
import os
import time
from datetime import date, datetime, timezone
from pathlib import Path

import collect_official as sec

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "sec-trends.json"
NOW = datetime.now(timezone.utc)
TODAY = NOW.date().isoformat()
SOURCES = ("official-financials.json", "consumer-official.json")
METRIC_NAMES = {"revenue": "매출", "operatingIncome": "영업이익", "netIncome": "순이익"}
MAX_ROWS = 90

def read(name, default=None):
    try:
        return json.loads((ROOT / name).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default or {}

def read_verified():
    combined = {}
    for row in read("official-financials.json").get("companies", []):
        if row.get("status") == "quarter_verified" and row.get("quarter"):
            combined[row["ticker"]] = row
    for entry in read("consumer-official.json").get("companies", []):
        row = entry.get("sec")
        if row and row.get("status") == "quarter_verified" and row.get("quarter"):
            combined[entry["ticker"]] = row
    for row in read("biotech-financials.json").get("companies", []):
        if row.get("status") == "quarter_verified" and row.get("quarter"):
            combined[row["ticker"]] = row
    return combined

def close_to(target, other, lower, upper):
    try:
        gap = (date.fromisoformat(target) - date.fromisoformat(other)).days
        return lower <= gap <= upper
    except (TypeError, ValueError):
        return False

def comparable(facts, current, gap_range):
    """Choose the closest 3-month old quarter for the *same* reported GAAP tag."""
    if not current or not current.get("usGaapTag"):
        return None
    tag = current["usGaapTag"]
    rows = facts.get("facts", {}).get("us-gaap", {}).get(tag, {}).get("units", {}).get("USD", [])
    start, end = current.get("start"), current.get("end")
    if not start or not end:
        return None
    options = []
    for r in rows:
        if r.get("form") not in ("10-Q", "10-K"):
            continue
        if not isinstance(r.get("val"), (int, float)) or not r.get("filed") or r["filed"] > TODAY:
            continue
        if not r.get("start") or not r.get("end") or not 75 <= sec.period_days(r) <= 105:
            continue
        if not close_to(end, r["end"], *gap_range):
            continue
        if not close_to(start, r["start"], *gap_range):
            continue
        if abs(sec.period_days(r) - sec.period_days({"start":start,"end":end})) > 9:
            continue
        options.append(r)
    if not options:
        return None
    # Closest date, followed by latest filed revision, with no later-than-now facts.
    middle = (gap_range[0]+gap_range[1])/2
    options.sort(key=lambda r:(abs((date.fromisoformat(end)-date.fromisoformat(r["end"])).days-middle),
                               -(date.fromisoformat(r["filed"])-date(2000,1,1)).days))
    x = options[0]
    return {"value":x["val"], "start":x["start"], "end":x["end"],
            "form":x["form"], "filed":x.get("filed"),
            "accession":x.get("accn"), "usGaapTag":tag}

def compare(value, old):
    if old is None or not isinstance(value,(float,int)) or not isinstance(old.get("value"),(float,int)):
        return None
    if old["value"] <= 0:
        return None  # Sign-changing earnings percentages can be misleading.
    return round((value/old["value"]-1)*100,1)

def metric_trend(facts, current):
    if not current or not isinstance(current.get("value"),(float,int)):
        return None
    value=current["value"]
    yoy=comparable(facts,current,(350,380))
    qoq=comparable(facts,current,(75,115))
    return {
        "value":value,"unit":"USD","tag":current["usGaapTag"],
        "start":current["start"],"end":current["end"],
        "yoy": {"percent":compare(value,yoy),"comparison":yoy} if yoy else None,
        "qoq": {"percent":compare(value,qoq),"comparison":qoq} if qoq else None
    }

def build():
    verified = read_verified()
    if not sec.USER_AGENT or "@" not in sec.USER_AGENT:
        out = {"generatedAt":NOW.isoformat(),"status":"sec_config_required",
               "companies":[],"errors":[],"verifiedCurrent":len(verified),
               "compared":0,"message":"SEC_USER_AGENT 필요; 비교 수치는 확인 전"}
        OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        return out
    result, errors = [], []
    for ticker, company in verified.items():
        cur = company["quarter"]
        quarter = cur.get("metrics") or {}
        if cur.get("form") != "10-Q" or not cur.get("periodEnd"):
            continue
        item = {"ticker":ticker,"companyName":company.get("companyName",ticker),
                "periodStart":cur.get("periodStart"),"periodEnd":cur["periodEnd"],
                "filed":cur.get("filed"),"fiscalYear":cur.get("fiscalYear"),
                "fiscalPeriod":cur.get("fiscalPeriod"),"url":cur.get("url"),
                "metrics":{},"status":"verified_current_only"}
        try:
            data = sec.get_json(f"https://data.sec.gov/api/xbrl/companyfacts/CIK{int(company['cik']):010d}.json")
            for key, row in quarter.items():
                if key not in METRIC_NAMES:
                    continue
                metric = metric_trend(data,row)
                if metric:
                    item["metrics"][key] = metric
            if any(x.get("yoy") or x.get("qoq") for x in item["metrics"].values()):
                item["status"] = "period_compared"
        except Exception as exc:
            item["status"]="source_unavailable"
            errors.append({"ticker":ticker, "reason":type(exc).__name__})
        result.append(item)
        time.sleep(0.28)  # SEC fair access: avoid bursting API requests.
    out = {
        "generatedAt":NOW.isoformat(),"status":"ok" if not errors else "partial",
        "source":"SEC US-GAAP companyfacts; 10-Q period matched",
        "companies":result, "errors":errors,"verifiedCurrent":len(result),
        "compared":sum(x["status"]=="period_compared" for x in result),
        "limitations":[
            "수치는 같은 GAAP 계정·통화·분기 길이를 충족한 경우만 비교",
            "전분기 비교 분기(특히 4분기)가 별도 3개월 사실로 확인되지 않으면 QoQ 비워둠",
            "같은 분기 재공시가 있으면 가장 최신 제출 자료를 비교 기준으로 사용",
            "동일매장매출·예약총액·방문객·조정 영업이익률은 SEC GAAP에서 자동 추출하지 않음",
            "성장률 자체가 투자 의견의 강화·약화를 확정하지 않음"
        ]
    }
    OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"SEC trend comparison: current={len(result)}, comparable={out['compared']}, errors={len(errors)}")
    return out

if __name__=="__main__":
    build()
