#!/usr/bin/env python3
"""Cross-checked US consumer KPIs + optional latest matching SEC GAAP quarters.

The 15 issuer operating KPIs are dated edited snapshots, not a live feed.
When SEC_USER_AGENT is configured, EDGAR 10-Q + same accession companyfacts
are additionally fetched and displayed under a separate GAAP/period heading.
A newer filing flags the prior operating KPI as due for editorial refresh;
it never silently relabels those KPI figures as the newest quarter.
"""
from __future__ import annotations
import json
import os
import time
from datetime import datetime,timezone
from pathlib import Path
from urllib.request import Request,urlopen

import collect_official as sec
import sec_client

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"consumer-kpi-baseline.json"
OUT=ROOT/"consumer-official.json"
NOW=datetime.now(timezone.utc)
COVERAGE={"UBER","NFLX","DIS","BKNG","WMT","TGT","COST","TJX","CAVA","CMG","SBUX","ELF","ULTA","EL","RH"}

def load(path,default=None):
    try:return json.loads(path.read_text(encoding="utf-8"))
    except (OSError,ValueError):return default or {}

def edgar_ticker_ciks():
    # SEC-published ticker map; not an unofficial stock quote/scraping endpoint.
    raw=sec.get_json("https://www.sec.gov/files/company_tickers.json")
    return sec_client.ticker_ciks(raw)

def snapshot_status(item,quarter):
    p=(item.get("periodEnd") or "")
    latest=quarter.get("quarterFiling") or {}
    # Quarter may be newer; company operating KPIs are still for their original period.
    if p and latest.get("reportEnd","")>p:
        return "older_than_latest_10q"
    return "dated_issuer_snapshot"

def main():
    base=load(BASE)
    indexed={x["ticker"]:x for x in base.get("items",[])}
    if set(indexed)!=COVERAGE:
        raise ValueError("Consumer ticker coverage must be 15 unique US issuers")
    for x in indexed.values():
        if not x.get("metrics") or not x.get("sourceURL") or not x.get("period"):
            raise ValueError("Operating KPI lacks date, issuer URL or evidence: "+x["ticker"])
    previous=load(OUT)
    oldsec={x.get("ticker"):x.get("sec") for x in previous.get("companies",[]) if x.get("sec")}
    user_agent=bool(sec.USER_AGENT and "@" in sec.USER_AGENT)
    ciks={}
    errors=[]
    if user_agent:
        try:ciks=edgar_ticker_ciks()
        except Exception as exc:
            errors.append({"scope":"ticker_registry","reason":type(exc).__name__})
    companies=[]
    for ticker,item in indexed.items():
        row=dict(item)
        row["operatingKpiStatus"]="dated_issuer_snapshot"
        row["sec"]=None
        if user_agent and ticker in ciks:
            try:
                secitem=sec.collect_one(ticker,ciks[ticker])
                row["sec"]=secitem
                row["operatingKpiStatus"]=snapshot_status(row,secitem)
            except Exception as exc:
                code=getattr(exc,"code",None)
                errors.append({"ticker":ticker,"reason":"HTTP_"+str(code) if code else type(exc).__name__})
                prior=oldsec.get(ticker)
                if prior and prior.get("status") in ("quarter_verified","stale_cached"):
                    row["sec"]={**prior,"status":"stale_cached","note":"SEC 재수집 실패: 과거 확인 자료"}
        companies.append(row)
        if user_agent:time.sleep(0.35)
    result={
        "schemaVersion":1,
        "generatedAt":NOW.isoformat(),
        "editedKpiAsOf":base.get("reviewedAt"),
        "source":"기업 공식 실적 발표(업종 KPI) + 선택적 SEC 10-Q·XBRL",
        "status":"sec_config_required" if not user_agent else (
            "partial" if errors else "ok"),
        "count":len(companies),
        "secQuarterVerified":sum(bool(x.get("sec",{}).get("status")=="quarter_verified")
                                 for x in companies if x.get("sec")),
        "companies":companies,"errors":errors,
        "limitations":[
            "업종별 KPIs는 원문 대조한 기준 분기 스냅샷. 자동으로 다음 분기 수치로 바뀌지 않음",
            "SEC GAAP 재무수치는 확인된 10-Q의 3개월 사실만 분리 표시. 새 10-K를 종전 Q 수치와 혼동 금지",
            "예약총액·예약 숙박일·동일매장매출·조정 EBITDA는 연결 GAAP 매출/이익과 기준이 다름",
            "서로 다른 회계연도·회계 분기 기간을 혼합해 기업 간 성장률 순위로 표시하지 않음",
            "SEC_USER_AGENT 미설정 시 기업 IR에서 검토한 편집 KPI만 표시"
        ]
    }
    OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("US consumer official KPI: %d issuer snapshots, %d SEC quarters; %s" %
        (len(companies),result["secQuarterVerified"],result["status"]))

if __name__=="__main__":
    main()
