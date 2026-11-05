#!/usr/bin/env python3
"""Additional 20 US-listed biotech/pharma SEC 10-Q records, never extrapolated.

All biotech securities are from the public tracking universe. 20-F/6-K foreign
issuer forms have different reporting cadences and remain explicitly unverified.
"""
from __future__ import annotations
import json
import os
import time
from datetime import datetime,timezone
from pathlib import Path

import collect_official as sec
import collect_consumer_official as csec

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"biotech-financials.json"
UNIVERSE=ROOT/"research-universe.json"
NOW=datetime.now(timezone.utc)
def read(path):
    try:return json.loads(path.read_text(encoding="utf-8"))
    except (OSError,ValueError):return {}
def build():
    universe=read(UNIVERSE)
    rows=[x for x in universe.get("companies",[]) if x.get("sector")=="바이오·제약" and x.get("market")=="미국"]
    if len(rows)!=20:raise ValueError("Biotech universe expected exactly 20 US-listed companies")
    previous={x["ticker"]:x for x in read(OUT).get("companies",[]) if x.get("ticker")}
    can_fetch=bool(sec.USER_AGENT and "@" in sec.USER_AGENT)
    mapping={}
    errors=[]
    if can_fetch:
        try:mapping=csec.edgar_ticker_ciks()
        except Exception as exc:errors.append({"scope":"SEC ticker mapping","type":type(exc).__name__})
    companies=[]
    for x in rows:
        t=x["ticker"]
        cik=mapping.get(t)
        item={"ticker":t,"companyName":x["name"],"status":"source_not_checked",
              "cik":cik,"updatedAt":NOW.isoformat(),"quarter":None,"quarterFiling":None}
        if can_fetch and cik:
            try:
                result=sec.collect_one(t,cik)
                item={**result,"companyName":x["name"],"updatedAt":NOW.isoformat()}
            except Exception as exc:
                errors.append({"ticker":t,"reason":type(exc).__name__})
        elif not can_fetch:
            item["status"]="sec_config_required"
        else:
            item["status"]="sec_cik_not_found"
        if item.get("status")!="quarter_verified":
            earlier=previous.get(t)
            if earlier and earlier.get("status") in ("quarter_verified","stale_cached") and earlier.get("quarter"):
                item={**earlier,"status":"stale_cached",
                      "note":"SEC 새로 확인 실패; 마지막 확인 기간 수치. 최신 자료로 표시 금지"}
        companies.append(item)
        if can_fetch:time.sleep(0.32)
    output={
        "schemaVersion":1,"generatedAt":NOW.isoformat(),
        "status":"sec_config_required" if not can_fetch else "partial" if errors else "ok",
        "source":"SEC company_tickers.json, submissions, US-GAAP companyfacts",
        "count":20,
        "quarterVerified":sum(c.get("status")=="quarter_verified" for c in companies),
        "companies":companies,"errors":errors,
        "limitations":[
            "등록기업 20개가 모두 동일 회계기준이나 임상 개발 단계에 있다는 뜻이 아님",
            "바이오텍의 매출이 0 또는 음수일 때 임의 성장률 계산 금지",
            "임상 성공·FDA 승인·시장규모는 SEC GAAP 숫자만으로 판단하지 않음",
            "SEC 10-Q가 확인되지 않는 해외 상장사 등은 자료 공백 그대로 유지",
            "분기 수치와 임상시험 단계·품목허가를 혼동하지 않음"
        ]
    }
    OUT.write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Biotech SEC: {output['quarterVerified']}/20 10-Q, errors={len(errors)}")
if __name__=="__main__":
    build()
