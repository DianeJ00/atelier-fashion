#!/usr/bin/env python3
"""Gradually track 47 US stocks against dated SPY/QQQ/XLK returns.

Requires a paid/authorized external display license and Twelve Data key.
Per-run cap and sleep avoid API quotas; no fabricated returns, stale dates labeled.
Korean KRX firms remain excluded until KRW/USD FX-adjusted comparable quotes.
"""
from __future__ import annotations
import json
import os
import time
from datetime import datetime, timezone
from math import ceil
from pathlib import Path

import collect_market_relative as market

ROOT=Path(__file__).resolve().parents[1]
UNIVERSE=ROOT/"research-universe.json"
BENCHMARK=ROOT/"market-relative.json"
OUT=ROOT/"stock-relative.json"
NOW=datetime.now(timezone.utc)
BENCHMARKS=("SPY","QQQ","XLK")
TERMS=market.TERMS
MAX_PER_RUN=max(1,min(47,int(os.environ.get("STOCK_MAX_SYMBOLS","8"))))
SLEEP_SEC=max(0.0,min(30.0,float(os.environ.get("STOCK_API_SLEEP_SEC","8.5"))))

def read_json(path,default):
    try:return json.loads(path.read_text(encoding="utf-8"))
    except (ValueError,OSError):return default

def base(status, symbols):
    return {
        "schemaVersion":1,"generatedAt":NOW.isoformat(),
        "status":status,"source":"Twelve Data daily time_series (adjust=all)",
        "asOf":None,"benchmarkDates":{},"periods":list(TERMS),
        "companies":{},"summary":{},
        "totalUS":len(symbols),"updatedThisRun":0,
        "errors":[],"limitations":[
            "동일 날짜의 배당·분할 조정 종가만 비교, 공시나 사업 성장의 직접 증거가 아님",
            "API 이용 제한으로 매 실행마다 최대 8개(설정 변경 가능) 미국 종목 갱신",
            "종목별 데이터 기준일이 달라질 수 있으므로 동일 날짜 자료만 업종 바스켓 산출",
            "업종 동일가중 수익률은 추적 종목 바스켓이며 XBI·XLY·XRT ETF와 다름",
            "한국 상장 5개는 KRW 원화 가격 및 USD 환산 경로가 검증될 때까지 제외",
            "자금 유입·AI 투자에서의 자금 회전은 가격 수익률만으로 단정할 수 없음"
        ]
    }

def compute_single(bars,market_data):
    date=market_data.get("asOf")
    period_dates=market_data.get("periodDates") or {}
    if not date or date not in bars:
        return None
    abs_returns={}
    relative={}
    for term in TERMS:
        baseline=period_dates.get(term)
        value=market.period_return(bars,date,baseline)
        abs_returns[term]=value
        for b in BENCHMARKS:
            ref=market_data.get("returns",{}).get(b,{}).get(term)
            relative.setdefault(b,{})[term]=(
                round(value-ref,2)
                if isinstance(value,(int,float)) and isinstance(ref,(int,float))
                else None
            )
    return {"asOf":date,"updatedAt":NOW.isoformat(),"returns":abs_returns,"relative":relative}

def summarize(rows,companies,benchmark="XLK"):
    report={}
    for group in ("바이오·제약","소비재·서비스","패션"):
        universe=[x["ticker"] for x in companies if x["sector"]==group and x["market"]=="미국"]
        n=len(universe)
        periods={}
        for term in TERMS:
            eligible=[]
            outperform=[]
            for ticker in universe:
                item=rows.get(ticker,{})
                ret=(item.get("returns") or {}).get(term)
                rel=(item.get("relative") or {}).get(benchmark,{}).get(term)
                if item.get("asOf")!=rows.get("_benchmarkAsOf") or not isinstance(ret,(int,float)) or not isinstance(rel,(int,float)):
                    continue
                eligible.append(ret)
                outperform.append(rel>0)
            count=len(eligible)
            periods[term]={
                "count":count,"universe":n,
                "coveragePct":round(count/n*100,1) if n else 0,
                # Refrain from industry conclusions with less than 80% coverage.
                "ready":count>=ceil(n*0.8) if n else False,
                "equalWeightedReturn":round(sum(eligible)/count,2) if count>=ceil(n*0.8) and count else None,
                "aboveBenchmarkCount":sum(outperform) if count>=ceil(n*0.8) and count else None
            }
        report[group]=periods
    return report

def main():
    companies=read_json(UNIVERSE,{}).get("companies",[])
    us=[x for x in companies if x.get("market")=="미국"]
    symbols=[x["ticker"] for x in us]
    benchmark=read_json(BENCHMARK,{})
    status=("key_required" if not market.KEY else
            "display_permission_required" if not market.DISPLAY else
            "benchmark_missing" if benchmark.get("status") not in ("ok","partial")
            or not benchmark.get("asOf") or not benchmark.get("periodDates") else "partial")
    old=read_json(OUT,{})
    output=base(status,symbols)
    if status!="partial":
        OUT.write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        print("Individual relative returns: "+status)
        return
    output["asOf"]=benchmark["asOf"]
    output["benchmarkDates"]=benchmark["periodDates"]
    prior=old.get("companies") or {}
    # Keep older rows for provenance, but the UI will never show them as current.
    output["companies"]={ticker:row for ticker,row in prior.items() if ticker in symbols}
    order=sorted(symbols,key=lambda ticker:(
        output["companies"].get(ticker,{}).get("updatedAt",""),
        ticker
    ))[:MAX_PER_RUN]
    for idx,ticker in enumerate(order):
        try:
            bars=market.retrieve(ticker)
            item=compute_single(bars,benchmark)
            if item:
                output["companies"][ticker]=item
                output["updatedThisRun"]+=1
            else:
                output["errors"].append({"ticker":ticker,"reason":"missing_anchor_close"})
        except Exception as exc:
            output["errors"].append({"ticker":ticker,"reason":str(exc)[:85]})
        if idx+1<len(order):
            time.sleep(SLEEP_SEC)
    proxy={**output["companies"],"_benchmarkAsOf":output["asOf"]}
    output["summary"]=summarize(proxy,us)
    current=sum(x.get("asOf")==output["asOf"] for x in output["companies"].values())
    output["verifiedOnBenchmarkDate"]=current
    output["status"]="ok" if current==len(symbols) and not output["errors"] else "partial"
    OUT.write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Individual relative: %d/%d current; updated=%d; errors=%d" %
          (current,len(symbols),output["updatedThisRun"],len(output["errors"])))

if __name__=="__main__":
    main()
