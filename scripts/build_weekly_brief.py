#!/usr/bin/env python3
"""Compact weekly investment verification checklist; separate fact from signal.

No AI-generated interpretations or unverified financial estimates.
"""
from __future__ import annotations
import json
from collections import Counter
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
NOW=datetime.now(timezone.utc)
START=(NOW-timedelta(days=7)).date().isoformat()
WATCH={
 "TPR":("Coach 성장·Kate Spade 손익","Coach 성장 둔화와 Kate Spade 적자 지속"),
 "RL":("평균 판매단가·아시아 수요","가격 인상 이후 수요 둔화"),
 "GAP":("Old Navy 동일매장매출·Athleta","최대 브랜드 부진과 할인 확대"),
 "URBN":("Free People 동일매장매출·Nuuly 마진","재고·물류 투자와 FCF 부담"),
 "LEVI":("미국 직접판매 동일매장매출·재고","미국 직접판매 성장 정체"),
 "CPRI":("Michael Kors 매출·정가 판매","브랜드 회복 지연"),
 "VFC":("Vans 매출·재고","상품 관심도 대비 전체 매출 부진"),
 "ANF":("Hollister 동일매장매출·영업이익률","핵심 브랜드 성장 둔화"),
 "AEO":("Aerie 성장·연결 영업이익률","성장 브랜드의 이익 기여 미흡"),
 "PVH":("Calvin Klein·Tommy 매출","핵심 브랜드 매출 부진"),
 "VSXY":("PINK 성장·정가 판매","회복 기대 대비 판촉 확대"),
 "CAL":("Famous Footwear 동일매장매출","매장 부진과 차입 부담"),
}

def read_json(name):
 try:return json.loads((ROOT/name).read_text(encoding="utf-8"))
 except (OSError,ValueError):return {}

def short_usd(v):
 if not isinstance(v,(int,float)):return "확인 필요"
 if abs(v)>=1e9:return f"USD {v/1e9:,.2f}B"
 if abs(v)>=1e6:return f"USD {v/1e6:,.1f}M"
 return f"USD {v:,.0f}"

def headline_ok(row):
 title=(row.get("title") or "").lower()
 if not row.get("url") or not row.get("date"):return False
 bad=("stock price", "stock quote", "latest stock news", "share price", "wall street zen", "meta_title")
 return not any(word in title for word in bad)

def top3_facts(cards, consumer, articles, start):
 """Source-linked briefs; no synthetic trend direction or speculative scores."""
 highlights=[]
 for card in cards:
  report=card.get("latestReport") or {}
  if report.get("filed", "")<start or not report.get("url"):continue
  checked=(card.get("officialStatus")=="quarter_verified" and bool(card.get("officialPeriod")) and report.get("form")=="10-Q" and card.get("latestReport",{}).get("filed")==report.get("filed"))
  highlights.append({
   "tier":"공식 공시","ticker":card["ticker"],"date":report["filed"],
   "title":card["officialText"] if checked else "SEC "+report["form"]+" 공시 제출",
   "context":card["nextCheck"]+" · GAAP 법인 단위; 브랜드별 지표 별도 확인",
   "url":report["url"],"note":"공식 공시 사실, 세부 원문 확인 필요",
  })
  if len(highlights)>=2:break
 # Product review is a lead, never a broad consumer conclusion.
 for v in consumer.get("videos", []):
  ticker=(v.get("titleMatchedTickers") or [""])[0]
  if not ticker or not v.get("videoUrl") or ticker not in WATCH:continue
  counts=v.get("themeCounts") or {}
  topic=max(counts.items(),key=lambda x:x[1]) if counts else None
  label="상품 리뷰 댓글 표본"
  if topic:label+=" · "+topic[0]+" 언급 "+str(topic[1])+"건"
  highlights.append({
   "tier":"댓글 표본·미검증","ticker":ticker,"date":v.get("videoDate"),
   "title":label,
   "context":WATCH[ticker][0]+" · 최신 댓글 일부, 대표성·매출 영향 미확인",
   "url":v["videoUrl"],"note":"협찬 여부와 표본 편향을 원문에서 확인",
  })
  break
 selected=set(x["ticker"] for x in highlights)
 for row in articles:
  ticker=row.get("ticker")
  if ticker not in WATCH or ticker in selected or not headline_ok(row):continue
  highlights.append({
   "tier":"기사 제목·미검증","ticker":ticker,"date":row.get("date","")[:10],
   "title":row.get("title",""),"context":WATCH[ticker][0]+" · 공식 IR 교차 검증 전",
   "url":row["url"],"note":"Google News RSS 발견 원문; 기사 본문 미검증",
  })
  break
 return highlights[:3]

def build():
 raw=read_json("weekly-research.json")
 sec=read_json("official-financials.json")
 consumer=read_json("consumer-samples.json")
 news=raw.get("items",[])
 counts=Counter(x.get("ticker") for x in news if x.get("ticker") in WATCH)
 official={x.get("ticker"):x for x in sec.get("companies",[])}
 videos=consumer.get("videos",[])
 recent=[x for x in sec.get("companies",[])
         if x.get("latestReport") and x["latestReport"].get("filed","")>=START
         and x.get("status") not in ("unavailable","stale_cached")]
 cards=[]
 for ticker,(check,risk) in WATCH.items():
  item=official.get(ticker,{})
  quarter=item.get("quarter") or {}
  metrics=quarter.get("metrics") or {}
  rev=metrics.get("revenue")
  verified=item.get("status")=="quarter_verified" and bool(rev)
  if verified:
   yoy=rev.get("yoyPercent")
   result="SEC 10-Q 매출 "+short_usd(rev["value"])
   if isinstance(yoy,(float,int)):result+=f" / 전년 대비 {yoy:+.1f}%"
   period=quarter.get("periodStart","")+"~"+quarter.get("periodEnd","")
  else:
   result="SEC 분기 매출 확인 대기";period=None
  latest=item.get("latestReport") or {}
  cards.append({
   "ticker":ticker,"officialStatus":item.get("status","unavailable"),
   "officialText":result,"officialPeriod":period,
   "officialSource":quarter.get("url") if verified else latest.get("url"),
   "latestReport":latest if latest else None,
   "newsTitleCount":counts[ticker],
   "nextCheck":check,"riskToTest":risk,
   "headline":next(({"title":x.get("title"),"url":x.get("url"),
                     "date":x.get("date","")[:10]} for x in news
                    if x.get("ticker")==ticker),None),
   "consumerSampleCount":sum(x.get("sampledTopLevelComments",0)
                             for x in videos if ticker in x.get("titleMatchedTickers",[]))
  })
 rank={key:i for i,key in enumerate(WATCH)}
 cards.sort(key=lambda x:(0 if x.get("latestReport") and
            x["latestReport"].get("filed","")>=START else 1,rank[x["ticker"]]))
 highlights=top3_facts(cards,consumer,news,START)
 output={
  "highlights":highlights,
  "generatedAt":NOW.isoformat(),"periodStart":START,"periodEnd":NOW.date().isoformat(),
  "classification":"공식 재무 사실 + 미검증 기사 제목/댓글 표본 + 투자 검증 질문",
  "summaryCounts":{
   "newSECReports":len(recent),"unverifiedHeadlines":len(news),
   "commentVideosSampled":len(videos),
   "commentSamples":sum(x.get("sampledTopLevelComments",0) for x in videos),
   "verifiedQuarters":sum(x.get("status")=="quarter_verified" for x in sec.get("companies",[]))
  },
  "secStatus":sec.get("sourceStatus","not_run"),
  "consumerStatus":consumer.get("status","not_run"),
  "companies":cards,
  "latestSEC":[{"ticker":x["ticker"],"form":x["latestReport"]["form"],
                "filed":x["latestReport"]["filed"],"url":x["latestReport"]["url"]}
               for x in sorted(recent,key=lambda x:x["latestReport"]["filed"],reverse=True)][:6],
  "rules":[
   "10-Q 약 3개월 단위 US-GAAP 수치만 공식 실적 표시",
   "GAAP와 조정 실적, 다른 회계연도와 기간, 매출과 ARR 구분",
   "뉴스·영상 제목과 댓글 건수는 소비자 선호·실적 증가를 증명하지 않음",
   "SEC 조회 실패 시 최신 실적으로 추정하지 않음"
  ]
 }
 (ROOT/"weekly-investment.json").write_text(
  json.dumps(output,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(f"Weekly checklist: {len(cards)} companies, recent SEC={len(recent)}, sampled videos={len(videos)}")

if __name__=="__main__":
 build()
