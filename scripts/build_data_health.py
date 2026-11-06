#!/usr/bin/env python3
"""Public ATELIER data provenance dashboard, no secrets and no invented coverage."""
from __future__ import annotations
import json
from datetime import datetime,timezone,date
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"data-health.json"
NOW=datetime.now(timezone.utc)
def read(name):
    try:return json.loads((ROOT/name).read_text(encoding="utf-8"))
    except (OSError,ValueError):return {}
def age(s):
    try:return (NOW.date()-date.fromisoformat(str(s)[:10])).days
    except (ValueError,TypeError):return None
def quarter_period_range(rows, nested=False):
    """Reporting periods of verified quarters, not dates when the API was checked."""
    periods=[]
    for row in rows:
        record=row.get("sec",{}) if nested else row
        if record.get("status")!="quarter_verified":
            continue
        period=(record.get("quarter") or {}).get("periodEnd")
        try:
            date.fromisoformat(periods_value := str(period))
            periods.append(periods_value)
        except (ValueError,TypeError):
            continue
    return {"earliest":min(periods),"latest":max(periods)} if periods else None

def item(id,label,category,status,covered,total,note,as_of=None,action=None,source=None,
         checked_at=None,period_range=None):
    return {"id":id,"label":label,"category":category,"status":status,
            "covered":covered,"total":total,"asOf":as_of,"checkedAt":checked_at,
            "periodRange":period_range,"ageDays":age(as_of),
            "note":note,"nextAction":action,"source":source}
def build():
    market=read("market-relative.json")
    reviewed=read("market-reviewed.json")
    stocks=read("stock-relative.json")
    official=read("official-financials.json")
    consumer=read("consumer-official.json")
    biotech=read("biotech-financials.json")
    clinical=read("clinical-trials.json")
    pipeline=read("research-pipeline.json")
    content=read("weekly-content.json")
    weekly=read("atelier-weekly.json")
    sec=read("sec-trends.json")
    korea=read("korea-dart.json")
    universe=read("research-universe.json")
    u=universe.get("companies") or []
    consumer_list=consumer.get("companies") or []
    pipeline_list=pipeline.get("records") or []
    reviewed_status=reviewed.get("status")=="source_verified_snapshot"
    linked_market=market.get("status") in ("ok","partial") and bool(market.get("asOf"))
    stale_market=(market.get("status")=="stale_cached" and
                  bool(market.get("asOf")) and
                  market.get("publicDisplayAuthorized") is True and
                  market.get("asOf")>=str(reviewed.get("asOf") or ""))
    market_date=market.get("asOf") if linked_market or stale_market else reviewed.get("asOf")
    compiled=[
        item("market","ETF 산업 상대강도","시장",
             "live" if linked_market else "reviewed_snapshot" if stale_market or reviewed_status else "blocked",
             len(market.get("returns") or {}) if linked_market or stale_market else len(reviewed.get("returns") or {}),
             6,
             ("일치한 가격 시계열" if linked_market else
              "이전 자동 확인 종가. 이번 수집에서 최신 거래일 확인 실패; 새 수익률이 아님." if stale_market else
              "공개 원문 대조 ETF 가격변화율. 매일 자동 갱신 수치는 아님."),
             market_date,
             "이번 시세 수집 실패 원인 확인 및 다음 거래일 재검증" if stale_market else
             "Twelve Data 인증·외부 표시 허용 확인 후 자동 갱신" if not linked_market else None,
             "https://www.tradingview.com/widget/",
             checked_at=market.get("generatedAt") if linked_market or stale_market else
                        market.get("generatedAt") or reviewed.get("generatedAt")),
        item("stocks","미국 47개 종목 상대수익률","시장",
             "reviewed_snapshot" if stocks.get("status")=="stale_cached" else
             "live" if stocks.get("status")=="ok" and stocks.get("verifiedOnBenchmarkDate",0)>=47 else
             "partial" if stocks.get("status")=="partial" and stocks.get("verifiedOnBenchmarkDate",0)>0 else "blocked",
             stocks.get("verifiedOnBenchmarkDate",0),47,
             ("이전 자동 확인 종목. 이번 ETF 기준일 재검증 실패" if stocks.get("status")=="stale_cached"
              else "동일 기준일·배당 조정 수익률 확보 종목 수"),
             stocks.get("asOf"),
             "시세 공급원 재검증 필요" if stocks.get("status")=="stale_cached" else
             "47개 종목 가격 시계열과 외부 표시 권한 확보" if stocks.get("verifiedOnBenchmarkDate",0)<47 else None,
             checked_at=stocks.get("generatedAt")),
        item("fashion_sec","미국 패션 공식 분기 실적","공식 실적",
             "live" if sum(x.get("status")=="quarter_verified" for x in official.get("companies",[]))==12 else "partial",
             sum(x.get("status")=="quarter_verified" for x in official.get("companies",[])),
             12,"SEC 10-Q GAAP 공식 등록 수치",
             checked_at=official.get("generatedAt"),
             period_range=quarter_period_range(official.get("companies",[]))),
        item("consumer_sec","미국 소비재·서비스 공식 실적","공식 실적",
             "live" if sum(x.get("sec",{}).get("status")=="quarter_verified" for x in consumer_list if x.get("sec"))==15 else "partial",
             sum(x.get("sec",{}).get("status")=="quarter_verified" for x in consumer_list if x.get("sec")),
             15,"SEC GAAP 분기 실적. 고유 운영 KPI는 별도 검증 스냅샷.",
             checked_at=consumer.get("generatedAt"),
             period_range=quarter_period_range(consumer_list,nested=True)),
        item("consumer_kpi","소비재 고유 운영 KPI","운영 KPI",
             "reviewed_snapshot" if len(consumer_list)==15 else "partial",
             len([x for x in consumer_list if x.get("metrics")]),15,
             "예약액·동일매장매출 등 기업 IR 검토분기만 표시",
             consumer.get("editedKpiAsOf"),
             "다음 분기 공식 IR에서 개별 KPI 재검증 (자동 파싱 미연결)",
             checked_at=consumer.get("generatedAt")),
        item("biotech_sec","미국 바이오·제약 공식 실적","공식 실적",
             "live" if biotech.get("quarterVerified")==20 else "partial" if biotech.get("quarterVerified",0)>0 else "blocked",
             biotech.get("quarterVerified",0),20,"SEC 10-Q GAAP, 기업별 회계기간 구분",
             action="10-Q 없는 기업은 해당 기업의 공식 공시 확인" if biotech.get("quarterVerified",0)<20 else None,
             checked_at=biotech.get("generatedAt"),
             period_range=quarter_period_range(biotech.get("companies",[]))),
        item("biotech_trials","바이오 관찰 약물 임상시험","신약 개발",
             "live" if clinical.get("status")=="ok" else "partial" if clinical.get("assets") else "blocked",
             sum(bool(x.get("trials")) for x in clinical.get("assets",[])),
             len(pipeline_list) or 12,
             "ClinicalTrials.gov의 동일 약물·후원기관이 확인된 등록시험 검색 표본",
             checked_at=clinical.get("generatedAt")),
        item("biotech_pipeline","바이오 파이프라인 개발 단계","신약 개발",
             "live" if pipeline.get("observedStudies")==len(pipeline_list) and len(pipeline_list)>0 else "partial",
             sum(bool(x.get("clinicalTrialURL")) for x in pipeline_list),
             len(pipeline_list),
             "최고 단계 등록시험 하나를 기록; 품목 허가나 전체 파이프라인 단계와 다름",
             action="허가·품목별 승인 단계는 기업 IR/FDA 개별 대조 필요",
             checked_at=pipeline.get("registryCheckedAt")),
        item("news_summaries","패션·소비 콘텐츠 본문 요약","기사·콘텐츠",
             "live" if content.get("aiStatus")=="enabled" else "reviewed_snapshot",
             len([x for x in content.get("items",[]) if x.get("status")=="원문 대조·편집"]),
             content.get("pendingCount",0)+len(content.get("items",[])),
             "편집 검토 원문 우선, 확인 전 RSS·영상은 투자 사실로 사용하지 않음",
             as_of=max((x.get("date") for x in content.get("items",[]) if x.get("status")=="원문 대조·편집" and x.get("date")),default=None),
             action="공개 본문 접근·OPENAI_API_KEY 권한 설정 후 자동 요약 검증",
             checked_at=content.get("generatedAt")),
        item("weekly","산업별 통합 주간 보고서","리서치",
             "live" if weekly.get("generatedAt") and weekly.get("items") is not None else "blocked",
             weekly.get("itemCount",0),None,
             "확인된 새 사건만 수록. 신규 사건 없음은 투자 변화 없음과 다름.",
             weekly.get("periodEnd"),checked_at=weekly.get("generatedAt")),
        item("korea","국내 담당 기업 DART 재무 실적","국내",
             "live" if korea.get("verified")==5 else "partial" if korea.get("verified",0)>0 else "blocked",
             korea.get("verified",0),5,
             "OpenDART 정기공시에서 3개월 또는 12개월 손익계산서를 구분. 개인 원본 브리프는 미연결",
             korea.get("generatedAt") if korea.get("verified",0)>0 else None,
             "GitHub Actions DART_API_KEY 인증키 설정 후 자동 수집. NIM·CET1·CSM·K-ICS 등 별도 IR 대조 필요" if korea.get("verified",0)<5 else "국내 과거 브리프 원본과 회사별 특화 KPI 별도 확인",
             "https://opendart.fss.or.kr/",
             checked_at=korea.get("generatedAt"))
    ]
    coverage={
        "tracked":len(u),
        "us":sum(x.get("market")=="미국" for x in u),
        "korea":sum(x.get("market")=="한국" for x in u),
        "secPeriodCompared":sec.get("compared",0),
        "registeredTrials":clinical.get("verifiedTrialCards",0),
        "upcomingClinical":len(weekly.get("upcomingClinical",[])),
        "reviewedFashionSources":content.get("reviewedSourceCount",0),
        "pendingUnverifiedArticles":content.get("pendingCount",0)
    }
    output={"schemaVersion":1,"generatedAt":NOW.isoformat(),"coverage":coverage,"items":compiled,
            "automation":{"frequency":"daily","scheduledTimeKST":"09:00","realTime":False},
            "needsAttention":sum(x["status"]!="live" for x in compiled),
            "policy":"정량 근거가 없으면 값을 만들지 않습니다. 공식 보고 분기와 시장 데이터 기준일을 구분하고, 사용권한 없는 시세의 자동 재배포를 하지 않습니다."}
    OUT.write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Data health: checks={len(compiled)}, needing-attention={output['needsAttention']}")
if __name__=="__main__":
    build()
