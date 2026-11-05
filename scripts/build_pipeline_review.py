#!/usr/bin/env python3
"""Attach official, indication-specific trial registry observations to selected drug watchlist.

A study's registered phase must never be interpreted as global drug approval,
current efficacy, commercial sales, or the entire development program's phase.
Registry search results can omit studies; only observed matched entries are used.
"""
from __future__ import annotations
import json
from datetime import datetime,timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"research-pipeline.json"
REGISTRY=ROOT/"clinical-trials.json"
NOW=datetime.now(timezone.utc).isoformat()
PHASE_RANK={"EARLY_PHASE1":0.5,"PHASE1":1,"PHASE2":2,"PHASE3":3,"PHASE4":4}
STATUSES={"RECRUITING":3,"ACTIVE_NOT_RECRUITING":3,"NOT_YET_RECRUITING":3,"COMPLETED":2,"TERMINATED":1,"SUSPENDED":1}
KOREAN_PHASE={"EARLY_PHASE1":"초기 1상","PHASE1":"1상","PHASE2":"2상","PHASE3":"3상","PHASE4":"4상"}
def load(path):
    try:return json.loads(path.read_text(encoding="utf-8"))
    except (ValueError,OSError):return {}
def best(studies):
    ranked=[]
    for t in studies:
        phases=t.get("phases") or []
        known=[(PHASE_RANK[x],x) for x in phases if x in PHASE_RANK]
        if not known or not t.get("nctId") or not t.get("url"):continue
        grade,phase=max(known)
        status=t.get("status","")
        rank=STATUSES.get(status,0)
        ranked.append((grade,rank,str(t.get("primaryCompletion",{}).get("date") or ""),
                      str(t.get("nctId")),phase,t))
    if not ranked:return None
    _,_,_,_,phase,trial=max(ranked,key=lambda x:x[:4])
    return phase,trial
def build():
    base=load(OUT)
    clinical=load(REGISTRY)
    assets={(r.get("ticker"),str(r.get("asset","")).casefold()):r for r in clinical.get("assets",[])}
    ready=clinical.get("status") in ("ok","partial") and bool(clinical.get("generatedAt"))
    rows=[]
    for row in base.get("records",[]):
        x=dict(row);x["reviewStatus"]="공식 시험 등록정보 대조 대기"
        match=assets.get((row.get("ticker"),str(row.get("asset","")).casefold()))
        choice=best(match.get("trials") or []) if ready and match else None
        if choice:
            phase,trial=choice
            x.update({
                "stage":KOREAN_PHASE[phase]+" 등록시험 확인",
                "trialPhaseObserved":phase,
                "stageBasis":"동일 약물·후원기관으로 연결된 표본 중 단계가 가장 높은 등록시험 기준",
                "clinicalTrialId":trial["nctId"],
                "clinicalTrialURL":trial["url"],
                "trialCondition":trial.get("conditions") or [],
                "trialStatus":trial.get("statusKr") or trial.get("status"),
                "stageVerifiedAt":clinical["generatedAt"],
                "primaryCompletion":trial.get("primaryCompletion"),
                "reviewStatus":"등록시험 단계·원문 확인 (약물 전체 개발·승인 여부와 별개)"
            })
        else:
            # Don't delete an existing confirmed study during a temporary registry outage.
            if row.get("stageVerifiedAt") and row.get("clinicalTrialURL"):
                x["reviewStatus"]="이전 등록시험 확인본 · 새 검색 검증 대기"
                x["stageBasis"]="이전 수집 기준. 신규 검색 표본에서 재확인 필요"
            else:
                x["stage"]=None;x["clinicalTrialId"]=None
                x["trialPhaseObserved"]=None;x["stageVerifiedAt"]=None
                x["reviewStatus"]="공식 등록시험 표본 연결 대기"
        x["approval"]=None
        x["approvalBasis"]="품목허가·상업화 상태는 등록시험 단계로 판단하지 않음. 기업 공식 공시·FDA/EMA 별도 대조 필요"
        rows.append(x)
    if not rows:raise ValueError("No selected biotech watchlist records")
    out={
        "schemaVersion":2,"lastChecked":NOW,
        "registryCheckedAt":clinical.get("generatedAt"),
        "status":"registry_compared" if ready else "registry_not_ready",
        "observedStudies":sum(bool(x.get("clinicalTrialURL")) for x in rows),
        "records":rows,
        "warning":"각 단계는 ClinicalTrials.gov에 등록된 하나의 관련 연구에서 관찰한 최고 단계로, 기업 전체 적응증 개발단계 또는 FDA/EMA 품목허가를 의미하지 않습니다."
    }
    OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Pipeline registry links: %d/%d; status=%s" %
          (out["observedStudies"],len(rows),out["status"]))
if __name__=="__main__":
    build()
