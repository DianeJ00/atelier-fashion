#!/usr/bin/env python3
"""2-1 daily move feed: compute only approved derived changes in process memory.

The upstream stock collector already fetches Twelve Data bars. No second API
request is made. Never persist provider close/volume bars to the public repo.
"""
from __future__ import annotations

import json
import os
from datetime import date, datetime
from pathlib import Path

import price_events as detector
import source_retention as retention

ATTRIBUTION_URL="https://twelvedata.com/"
EXPECTED_US=47
DERIVED_FLAGS=("MARKET_DERIVED_PUBLIC_OK","MARKET_DERIVED_GIT_STORAGE_OK")

def licensed(key, display, environ=None):
    env=os.environ if environ is None else environ
    return (bool(key) and display is True and
            all(env.get(name)=="true" for name in DERIVED_FLAGS))

def empty(now,reason="permission_required"):
    return {
        "schemaVersion":1,
        "status":reason,
        "publicDerivedAuthorized":False,
        "generatedAt":now.isoformat(),
        "asOf":None,
        "source":{"provider":"Twelve Data","url":ATTRIBUTION_URL},
        "coverage":{"screened":0,"totalUS":EXPECTED_US},
        "events":[],
        "eligibleEvents":0,
        "policy":"No source quotes stored. No public derived returns without explicit rights.",
    }

def observation_from_bars(issuer,bars,anchor):
    """Use 20 previous daily absolute % moves; exclude the current move."""
    if not isinstance(bars,dict) or anchor not in bars:
        return None
    dates=sorted(d for d in bars if detector.day(d) and d<=anchor)
    if len(dates)<22 or dates[-1]!=anchor:
        return None
    prev=dates[-2]
    if (date.fromisoformat(anchor)-date.fromisoformat(prev)).days>detector.MAX_SOURCE_GAP_DAYS:
        return None
    closes=[bars[d] for d in dates[-22:]]
    if any(not isinstance(c,(int,float)) or isinstance(c,bool) or c<=0 for c in closes):
        return None
    volatility=sum(abs(100*(closes[i]/closes[i-1]-1)) for i in range(1,21))/20
    if volatility<=0:
        return None
    return {
        "issuerId":issuer["id"],"ticker":issuer["ticker"],
        "tradeDate":anchor,"previousTradeDate":prev,
        "close":closes[-1],"previousClose":closes[-2],
        "volatility20dPct":volatility,
        "priceBasis":detector.PRICE_BASIS,
        "source":{"provider":"Twelve Data","url":ATTRIBUTION_URL},
    }

def evidence_from_reviewed_files(root:Path):
    """Sources are issuer-mapped and verified by the existing official collectors.

    We do not infer clinical outcomes or promote arbitrary headlines to causality.
    """
    out=[]
    def read(filename):
        try:
            obj=json.loads((root/filename).read_text(encoding="utf-8"))
            return obj if isinstance(obj,dict) else {}
        except (OSError,ValueError,UnicodeError):
            return {}
    sec=read("sec-trends.json")
    for row in sec.get("companies",[]):
        if not isinstance(row,dict):continue
        ticker=row.get("ticker")
        filed=row.get("filed")
        filing=row.get("url")
        if not ticker or not detector.day(filed) or not isinstance(filing,str):
            continue
        if not filing.startswith("https://www.sec.gov/Archives/"):
            continue
        out.append({
            "issuerId":"US:"+ticker,"sourceType":"sec_filing",
            "verified":True,"publishedAt":filed,
            "title":f"{ticker} · 미국 SEC 정기보고서 접수",
            "url":filing,
        })
    for item in read("atelier-weekly.json").get("items",[]):
        if not isinstance(item,dict):continue
        label=str(item.get("sourceLabel") or "")
        publisher=str(item.get("sourceUrl") or "")
        event_date=item.get("eventDate")
        if not item.get("ticker") or not detector.day(event_date) or not detector.valid_link(publisher):
            continue
        # Editorial cross-checks of an actual issuer IR release, not search links.
        official_ir=item.get("tier")=="편집 원문 대조" and (
            label.endswith(" IR") or label.endswith(" Investor Relations"))
        if not official_ir:
            continue
        out.append({
            "issuerId":"US:"+item["ticker"],"sourceType":"company_ir",
            "verified":True,"publishedAt":event_date,
            "title":str(item.get("title") or "기업 IR 자료")[:180],
            "url":publisher,
        })
    return out

def build_feed(observations,issuers,trade_date,evidence,now, *,authorized=False):
    if not authorized:
        return empty(now)
    if not detector.day(trade_date):
        return empty(now,"no_verified_daily_closes")
    report=detector.scan(observations,issuers,evidence,as_of=trade_date,
                         derived_display_authorized=True,limit=EXPECTED_US)
    if report["status"]!="ready":
        return empty(now,"no_verified_daily_closes")
    count=report["screenedIssuers"]
    # No status suggests that a partial batch is the entire watchlist.
    if count>EXPECTED_US:
        raise ValueError("More securities than the 47-US watchlist")
    report.update({
        "generatedAt":now.isoformat(),
        "source":{"provider":"Twelve Data","url":ATTRIBUTION_URL},
        "coverage":{"screened":count,"totalUS":EXPECTED_US},
        "status":"ready" if count==EXPECTED_US else "partial",
        "publicDerivedAuthorized":True,
        "policy":"Derived changes from licensed dividend/split-adjusted closes; simultaneous news is not proof of cause.",
    })
    return report

def publish(path, observations, issuers, trade_date, evidence, now, *, authorized):
    feed=build_feed(observations,issuers,trade_date,evidence,now,authorized=authorized)
    retention.atomic_write(path,feed)
    return feed
