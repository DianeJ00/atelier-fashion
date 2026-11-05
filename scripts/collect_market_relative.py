#!/usr/bin/env python3
"""Collect licensed daily ETF closes and calculate dated, dividend-adjusted relative returns.

No quote scraping. Public GitHub Pages delivery is explicitly gated behind a
provider license permitting external display. Unavailable data stays null.
"""
from __future__ import annotations

import json
import os
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"market-relative.json"
KEY=os.environ.get("TWELVEDATA_API_KEY","").strip()
DISPLAY=os.environ.get("MARKET_DATA_DISPLAY_OK","").strip()=="1"
SYMBOLS={"SPY":"미국 대형주","QQQ":"대형 성장주","XLK":"미국 기술주",
         "XBI":"바이오 ETF 대리","XLY":"경기소비재 ETF 대리","XRT":"미국 유통 ETF 대리"}
TERMS={"1w":7,"1m":30,"3m":91,"6m":182,"1y":365}
NOW=datetime.now(timezone.utc)

def make_empty(reason):
    return {
        "schemaVersion":1,"generatedAt":NOW.isoformat(),
        "status":reason,"source":"Twelve Data time_series (외부 표시 라이선스 필요)",
        "priceConvention":"adjust=all · 배당·분할 조정 종가 기준, 실제 제공 시에만 계산",
        "benchmarkSymbols":[{"ticker":t,"label":name} for t,name in SYMBOLS.items()],
        "relativeTo":"XLK","periods":list(TERMS),"returns":{},"relative":{},
        "weeklyBreadth":{},"asOf":None,"periodDates":{},"errors":[],
        "caveats":[
            "XBI·XLY·XRT는 산업 대리 ETF이며 추적 기업의 동일가중 수익률이 아님",
            "동일 날짜의 배당·분할 조정 종가로 비교; ETF 초과수익률은 자금 유입 증거가 아님",
            "국내 종목의 USD 환산 수익률 및 개별 종목 상회 비율은 아직 계산하지 않음"
        ]
    }

def retrieve(ticker):
    q=urlencode({"symbol":ticker,"interval":"1day","outputsize":430,
                 "adjust":"all","apikey":KEY})
    req=Request("https://api.twelvedata.com/time_series?"+q,
                headers={"Accept":"application/json","User-Agent":"ATELIER-Research/2.0"})
    with urlopen(req,timeout=25) as r:
        obj=json.load(r)
    if obj.get("status")=="error" or not isinstance(obj.get("values"),list):
        raise RuntimeError("provider_no_data:"+str(obj.get("code","unknown")))
    bars={}
    for x in obj["values"]:
        dt=x.get("datetime","")
        try:
            price=float(x.get("close"))
            if price>0 and len(dt)==10 and dt<=NOW.date().isoformat():bars[dt]=price
        except (TypeError,ValueError):continue
    if len(bars)<30:raise ValueError("insufficient_historical_bars")
    return bars

def baseline(bars,target,max_lag=7):
    t=date.fromisoformat(target)
    best=[x for x in bars if date.fromisoformat(x)<=t
          and 0<=(t-date.fromisoformat(x)).days<=max_lag]
    return bars[max(best)] if best else None

def performance(bars,anchor,day_count):
    p=bars[anchor]
    old=baseline(bars,(date.fromisoformat(anchor)-timedelta(days=day_count)).isoformat())
    return round(100*(p/old-1),2) if old and p else None

def period_return(bars, anchor, baseline_date):
    """Exactly matched start/end trading dates, never a shifted proxy."""
    if not baseline_date or anchor not in bars or baseline_date not in bars:
        return None
    base = bars[baseline_date]
    return round(100*(bars[anchor]/base-1),2) if base>0 else None

def build():
    if not KEY or not DISPLAY:
        data=make_empty("key_required" if not KEY else "display_permission_required")
    else:
        data=make_empty("partial")
        history={}
        for idx,ticker in enumerate(SYMBOLS):
            try:history[ticker]=retrieve(ticker)
            except Exception as ex:data["errors"].append({"ticker":ticker,"reason":str(ex)[:95]})
            if idx+1<len(SYMBOLS):
                time.sleep(9.0)  # Keep a free-tier-friendly pace across ETF + stock calls.
        # Compare only closes observed on precisely the same calendar day.
        if "XLK" not in history:
            data["status"]="unavailable"
        else:
            dates=set(history["XLK"])
            # Only the chosen benchmarks define the common market session.
            # A missing sector proxy must not invalidate all comparisons.
            for symbol in ("SPY","QQQ"):
                if symbol in history:dates.intersection_update(history[symbol])
            anchor=max(dates) if dates else None
            data["asOf"]=anchor
            if anchor:
                data["periodDates"]={p:max(
                    (d for d in history["XLK"] if d<=(
                        date.fromisoformat(anchor)-timedelta(days=days)
                    ).isoformat() and (
                        date.fromisoformat(anchor)-date.fromisoformat(d)
                    ).days-days<=7),default=None)
                    for p,days in TERMS.items()}
            for ticker,bars in history.items():
                if not anchor or anchor not in bars:continue
                data["returns"][ticker]={p:period_return(bars,anchor,data["periodDates"].get(p))
                                          for p in TERMS}
            base=data["returns"].get("XLK",{})
            for ticker in ("XBI","XLY","XRT","SPY","QQQ"):
                row=data["returns"].get(ticker,{})
                data["relative"][ticker]={p:round(row[p]-base[p],2)
                     if isinstance(row.get(p),(float,int)) and isinstance(base.get(p),(float,int))
                     else None for p in TERMS}
                # Last 4 weekly observation intervals versus technology benchmark.
                if ticker in history and anchor:
                    wins=0
                    valid=0
                    for w in range(4):
                        end=(date.fromisoformat(anchor)-timedelta(days=7*w)).isoformat()
                        begin=(date.fromisoformat(anchor)-timedelta(days=7*(w+1))).isoformat()
                        x1=baseline(history[ticker],end,4)
                        x0=baseline(history[ticker],begin,4)
                        b1=baseline(history["XLK"],end,4)
                        b0=baseline(history["XLK"],begin,4)
                        if all(x is not None for x in (x1,x0,b1,b0)):
                            valid+=1
                            if x1/x0 > b1/b0:wins+=1
                    data["weeklyBreadth"][ticker]={"weeksOutperformed":wins,"weeksCompared":valid}
            data["status"]="ok" if len(history)==len(SYMBOLS) else "partial"
    OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Market proxies: "+data["status"]+", as-of "+str(data.get("asOf")))

if __name__=="__main__":
    build()
