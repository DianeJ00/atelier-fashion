#!/usr/bin/env python3
"""Evidence-only cross-sector weekly research and unapproved thesis-review proposals."""
from __future__ import annotations
import json
from datetime import datetime,timedelta,timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
NOW=datetime.now(timezone.utc)
START=(NOW-timedelta(days=7)).date().isoformat()
END=NOW.date().isoformat()
OUT=ROOT/"atelier-weekly.json"

def load(name):
    try:return json.loads((ROOT/name).read_text(encoding="utf-8"))
    except (OSError,ValueError):return {}

def in_week(day):
    return bool(day and START<=str(day)[:10]<=END)

def usd_b(n):
    return f"USD {n/1e9:,.2f}B"

def pct(n):
    return ("+" if n>0 else "")+f"{n:.1f}%"

def make_gaap(data,known,issuer):
    items=[]
    for row in data.get("companies",[]):
        if not in_week(row.get("filed")) or not str(row.get("url") or "").startswith("https://"):
            continue
        metric=(row.get("metrics") or {}).get("revenue") or {}
        yoy=(metric.get("yoy") or {}).get("percent")
        if yoy is None or not isinstance(metric.get("value"),(float,int)):
            continue
        ticker=row["ticker"]
        sector=known.get(ticker,{}).get("sector","미국 기업")
        co=issuer.get(ticker,{})
        observation=f"SEC 10-Q 분기 GAAP 매출 {usd_b(metric['value'])}, 전년 동기 대비 {pct(yoy)}"
        qoq=(metric.get("qoq") or {}).get("percent")
        if qoq is not None:observation+=f", 직전 분기 대비 {pct(qoq)}"
        kpis=co.get("metrics") or []
        check=((kpis[0]["label"]+"와 수익성·현금흐름을 동일 분기로 비교")
               if sector=="소비재·서비스" and kpis and kpis[0]["label"]!="GAAP 매출"
               else "제품·사업별 성장과 영업이익·FCF를 동일 기간으로 확인")
        items.append({
            "id":f"SEC:{ticker}:{row['periodEnd']}","sector":sector,"ticker":ticker,
            "eventDate":row["filed"],"eventType":"미국 SEC 분기 실적",
            "tier":"공식 공시 · GAAP","title":f"{ticker} · 매출 전년 대비 {pct(yoy)}",
            "observation":observation,
            "period":str(row.get("periodStart"))+" ~ "+str(row["periodEnd"]),
            "investment":co.get("thesis") or known.get(ticker,{}).get("focus","사업구조·성장 지속성 확인"),
            "nextCheck":check,
            "caveat":"GAAP 회계 매출과 동일매장매출·총예약액 등의 기준은 다름. 매출 증가만으로 투자 가설의 방향성 확정 불가. "+co.get("risk",""),
            "sourceUrl":row["url"],"sourceLabel":"SEC 10-Q",
            "priority":5 if sector=="소비재·서비스" else 4
        })
    return items

def make_clinical(data):
    if not in_week(data.get("generatedAt")) or not in_week(data.get("comparisonTo")):
        return []
    result=[]
    for row in data.get("changes",[]):
        if row.get("type")=="표본에서 새로 포착":continue
        if not str(row.get("url") or "").startswith("https://"):continue
        ticker=row["ticker"]
        before=row.get("before")
        description=(f"{before} → {row.get('after')}" if before is not None else row.get("detail",""))
        result.append({
            "id":f"CT:{ticker}:{row['nctId']}:{row['type']}",
            "sector":"바이오·제약","ticker":ticker,"eventDate":str(data["generatedAt"])[:10],
            "eventType":"임상 등록정보 변경","tier":"공식 등록정보 · 결과 미확인",
            "title":f"{ticker} {row.get('asset','신약')} · {row['type']}",
            "observation":f"ClinicalTrials.gov 등록 시험에서 {description} 항목 확인.",
            "investment":"개발 단계·주요 일정 변경이 기존 투자 가설에 미치는 영향 점검",
            "nextCheck":"시험 등록 원문 및 회사 IR에서 실제 임상 결과·안전성 발표 여부 교차 확인",
            "caveat":"시험 등록정보 변경은 성공, 허가 또는 매출 증가를 의미하지 않음.",
            "sourceUrl":row["url"],"sourceLabel":"ClinicalTrials.gov","priority":7
        })
    return result[:3]

def make_fashion(data):
    rows=data.get("items",[])+data.get("reviewedExtra",[])
    return [{
        "id":"FASH:"+row["id"],"sector":"패션",
        "ticker":(row.get("tickers") or ["산업"])[0],
        "eventDate":row["date"],"eventType":"패션 상품·브랜드 변화",
        "tier":"편집 원문 대조","title":row["title"],
        "observation":row["summary"],"investment":row["impact"],
        "nextCheck":row["kpi"],"caveat":row["risk"],
        "sourceUrl":row["url"],"sourceLabel":row["source"],
        "priority":min(6,float(row.get("priority",3))/2+1)
    } for row in rows if row.get("status")=="원문 대조·편집"
       and in_week(row.get("date"))
       and str(row.get("url") or "").startswith("https://")]

def select(rows):
    uniq={}
    for x in sorted(rows,key=lambda x:(x["priority"],x["eventDate"]),reverse=True):
        uniq.setdefault(x["id"],x)
    pool=list(uniq.values())
    selected=[]
    for sector in ("소비재·서비스","바이오·제약","패션"):
        matches=[x for x in pool if x["sector"]==sector]
        if matches:selected.append(matches[0])
    counts={s:sum(x["sector"]==s for x in selected) for s in ("소비재·서비스","바이오·제약","패션")}
    for row in pool:
        if len(selected)>=8:break
        if row in selected or counts.get(row["sector"],0)>=4:continue
        selected.append(row)
        counts[row["sector"]]=counts.get(row["sector"],0)+1
    return sorted(selected,key=lambda x:(x["priority"],x["eventDate"]),reverse=True)

def upcoming(data):
    rows=[]
    for x in data.get("weeklyInterpretation",[]):
        day=x.get("expectedDate","")
        if x.get("type")!="앞으로 확인할 임상 일정" or not day or day[:7]<END[:7]:
            continue
        if not str(x.get("url") or "").startswith("https://"):continue
        rows.append({"title":x["title"],"date":day,"observation":x["observation"],
                     "nextCheck":x["investmentCheck"],"caveat":x["limitation"],"url":x["url"]})
    return sorted(rows,key=lambda x:x["date"])[:4]

def build():
    uni=load("research-universe.json")
    index={x["ticker"]:x for x in uni.get("companies",[]) if x.get("market")=="미국"}
    cons=load("consumer-official.json")
    issuers={x["ticker"]:x for x in cons.get("companies",[])}
    gaap=load("sec-trends.json")
    clinical=load("clinical-trials.json")
    fashion=load("weekly-content.json")
    selected=select(make_gaap(gaap,index,issuers)+make_clinical(clinical)+make_fashion(fashion))
    reviews={}
    for x in selected:
        ticker=x["ticker"]
        meta=index.get(ticker)
        if not meta or ticker in reviews:continue
        reviews[ticker]={
            "companyId":"US:"+ticker,"ticker":ticker,"sector":meta["sector"],
            "currentQuestion":meta.get("focus",""),
            "contradictionToCheck":meta.get("risk",""),
            "candidateState":"근거 검토 필요 · 방향 미판정",
            "change":x["title"],"evidenceDate":x["eventDate"],"sourceUrl":x["sourceUrl"],
            "note":"AI·자동 규칙은 가설 강화·약화 및 매매 의견을 확정하지 않음."
        }
    stale=[]
    for x in cons.get("companies",[]):
        if x.get("operatingKpiStatus")!="older_than_latest_10q":continue
        filing=(x.get("sec") or {}).get("quarterFiling") or {}
        stale.append({
            "ticker":x["ticker"],"period":x.get("period"),"newSECPeriod":filing.get("reportEnd"),
            "filed":filing.get("filed"),"url":filing.get("url"),
            "reason":"새 10-Q는 확인됐으나 운영 KPI는 종전 공식 분기 스냅샷. 원문 대조 갱신 필요"
        })
    data={
        "schemaVersion":1,"generatedAt":NOW.isoformat(),"periodStart":START,
        "periodEnd":END,"timezone":"UTC",
        "title":"이번 주 투자 논리를 점검할 변화","items":selected,
        "itemCount":len(selected),
        "bySector":{s:sum(x["sector"]==s for x in selected)
                    for s in ("소비재·서비스","바이오·제약","패션")},
        "reviewCandidates":list(reviews.values()),"upcomingClinical":upcoming(clinical),
        "staleConsumerKpi":stale,
        "sourceStates":{
            "sec":gaap.get("status","not_ready"),"consumer":cons.get("status","not_ready"),
            "clinical":clinical.get("status","not_ready"),
            "fashion":fashion.get("generatedAt") or "not_ready"
        },
        "coverage":{
            "tracked":52,"gaapCompared":gaap.get("compared",0),
            "consumerWithOfficialKpi":len(issuers),
            "domesticBriefs":"과거 국내 담당 브리프 원본 및 DART 연결 대기"
        },
        "rules":[
            "보고기간 안에 새로 제출·발표되거나 원문 대조된 사건만 메인 보고서에 반영",
            "임상 예상 완료일과 이전 분기 운영 KPI는 이번 주 발생한 사건으로 포장하지 않음",
            "비GAAP KPI는 회사 IR 공식 확인이 필요하며 GAAP 실적에서 역산하지 않음",
            "투자 가설의 강화·약화·매매 의견은 담당자 확정 전 모두 보류"
        ]
    }
    OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Cross-sector brief: changes={len(selected)}, review={len(reviews)}, stale={len(stale)}")
    return data

if __name__=="__main__":
    build()
