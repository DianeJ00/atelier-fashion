#!/usr/bin/env python3
"""Conservative ClinicalTrials.gov v2 trial registry monitor for seeded assets.

A registered study != positive efficacy, approval, or commercial success.
Only explicit drug-intervention AND sponsor/collaborator associations get the
'linked' label. Dates are shown with actual/estimated precision retained.
"""
from __future__ import annotations
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "clinical-trials.json"
SEEDS = ROOT / "research-pipeline.json"
NOW = datetime.now(timezone.utc)
API = "https://clinicaltrials.gov/api/v2/studies"
AGENTS = {
    "LLY": ("eli lilly", "lilly"),
    "AMGN": ("amgen",),
    "VKTX": ("viking therapeutics",),
    "MRK": ("merck", "msd", "merck sharp"),
    "GILD": ("gilead",),
    "ABBV": ("abbvie",),
    "REGN": ("regeneron", "sanofi"),
    "BIIB": ("biogen", "eisai"),
    "VRTX": ("vertex", "crispr therapeutics"),
    "CRSP": ("crispr therapeutics", "vertex"),
    "ALNY": ("alnylam",),
    "SRPT": ("sarepta",)
}
ALIASES = {
    "maritide": ("maritide", "maridebart cafraglutide", "amg 133"),
    "exagamglogene autotemcel": ("exagamglogene autotemcel", "exa-cel", "ctx001"),
    "delandistrogene moxeparvovec": ("delandistrogene moxeparvovec", "srp-9001"),
    "tirzepatide": ("tirzepatide", "ly3298176"),
    "vk2735": ("vk2735",),
    "pembrolizumab": ("pembrolizumab", "keytruda"),
    "sacituzumab govitecan": ("sacituzumab govitecan", "immunomedics-132", "trodelvy"),
    "risankizumab": ("risankizumab", "skyrizi"),
    "dupilumab": ("dupilumab", "dupixent"),
    "lecanemab": ("lecanemab", "leqembi"),
    "vutrisiran": ("vutrisiran", "amvuttra")
}
ACTIVE = {"RECRUITING", "NOT_YET_RECRUITING", "ACTIVE_NOT_RECRUITING", "ENROLLING_BY_INVITATION"}
STATUS_KR = {
    "RECRUITING": "모집 중", "NOT_YET_RECRUITING": "모집 전",
    "ACTIVE_NOT_RECRUITING": "진행 중·모집 종료",
    "COMPLETED": "완료", "TERMINATED": "조기 종료",
    "SUSPENDED": "일시 중단", "WITHDRAWN": "시작 전 철회",
    "ENROLLING_BY_INVITATION": "초청 모집", "UNKNOWN": "미확인"
}

def obtain(term):
    query = urlencode({"query.intr": term, "format": "json",
                       "pageSize": 75, "sort": "LastUpdatePostDate:desc"})
    req = Request(API + "?" + query, headers={
        "User-Agent": "ATELIER Academic Research (https://github.com/DianeJ00/atelier-fashion)",
        "Accept": "application/json"
    })
    with urlopen(req, timeout=22) as response:
        result = json.load(response)
    if not isinstance(result.get("studies"), list):
        raise ValueError("unrecognized_v2_response")
    return result["studies"]

def sponsor_labels(section):
    sponsors = section.get("sponsorCollaboratorsModule", {})
    names = [sponsors.get("leadSponsor", {}).get("name", "")]
    names.extend(x.get("name", "") for x in sponsors.get("collaborators", []))
    return [str(x).lower().strip() for x in names if x]

def exact_alias(text, aliases):
    hay = str(text).casefold()
    return any(re.search(r"(?<![a-z0-9])" + re.escape(alias.casefold()) + r"(?![a-z0-9])", hay)
               for alias in aliases)

def clean_dates(module, name):
    date_obj = module.get(name) or {}
    return {
        "date": date_obj.get("date"),
        "type": date_obj.get("type")  # ACTUAL / ESTIMATED / absent
    }

def parse_trial(study, asset, ticker):
    section = study.get("protocolSection") or {}
    ident = section.get("identificationModule") or {}
    status = section.get("statusModule") or {}
    design = section.get("designModule") or {}
    outcome = section.get("outcomesModule") or {}
    nct = ident.get("nctId", "")
    if not re.fullmatch(r"NCT\d{8}", nct):
        return None
    interventions = (section.get("armsInterventionsModule") or {}).get("interventions", [])
    names = [v.get("name", "") for v in interventions]
    names += [alias for v in interventions for alias in (v.get("otherNames") or [])]
    accepted = ALIASES.get(asset.casefold(), (asset.casefold(),))
    if not any(exact_alias(x, accepted) for x in names):
        return None
    sponsors = sponsor_labels(section)
    sponsor_linked = any(any(agent in sponsor for agent in AGENTS.get(ticker, ()))
                         for sponsor in sponsors)
    if not sponsor_linked:
        return None
    phase = design.get("phases") or []
    primary = (outcome.get("primaryOutcomes") or [])[:1]
    return {
        "nctId": nct,
        "title": ident.get("briefTitle", "")[:220],
        "status": status.get("overallStatus"),
        "statusKr": STATUS_KR.get(status.get("overallStatus"), "기타·원문 확인"),
        "phases": phase,
        "conditions": (section.get("conditionsModule") or {}).get("conditions", [])[:5],
        "sponsor": (section.get("sponsorCollaboratorsModule") or {}).get("leadSponsor", {}).get("name", ""),
        "association": "약물 + 시험 등록 후원·협력기관 교차 일치",
        "start": clean_dates(status, "startDateStruct"),
        "primaryCompletion": clean_dates(status, "primaryCompletionDateStruct"),
        "completion": clean_dates(status, "completionDateStruct"),
        "lastUpdatePost": (status.get("studyLastUpdatePostDateStruct") or {}).get("date"),
        "primaryMeasure": (primary[0].get("measure") or "")[:180] if primary else None,
        "hasResultsPosted": bool(study.get("hasResults")),
        "url": "https://clinicaltrials.gov/study/" + nct
    }

def rank(study):
    priority = 0 if study.get("status") in ACTIVE else 1
    date = (study.get("primaryCompletion") or {}).get("date")
    return (priority, "-" + (date or "9999-12-31"), study.get("nctId", ""))

def registered_changes(previous, current):
    """Compare only trials present in the prior and current *limited* sample.

    A newly visible NCT could have existed for years: label 'newly observed',
    not 'new trial'. Disappearing from a limited sample is NOT a termination.
    """
    before = {}
    for item in previous.get("assets", []):
        for trial in item.get("trials", []):
            before[(item.get("ticker"), item.get("asset"), trial.get("nctId"))] = trial
    if not before:
        return []
    changes = []
    for item in current:
        ticker, asset = item["ticker"], item["asset"]
        for trial in item.get("trials", []):
            nct = trial["nctId"]
            old = before.get((ticker,asset,nct))
            base = {"ticker":ticker,"asset":asset,"nctId":nct,"url":trial["url"],
                    "sourceLastUpdate":trial.get("lastUpdatePost")}
            if old is None:
                changes.append({**base,"type":"표본에서 새로 포착",
                                "detail":"이전 상위 표본에 없던 등록시험. 새로운 시험이 개설됐다는 뜻은 아님"})
                continue
            if old.get("status") != trial.get("status"):
                changes.append({**base,"type":"시험 진행 상태 변경",
                                "before":old.get("statusKr") or old.get("status"),
                                "after":trial.get("statusKr") or trial.get("status")})
            if old.get("phases") != trial.get("phases"):
                changes.append({**base,"type":"등록 단계 표시 변경",
                                "before":",".join(old.get("phases") or []),
                                "after":",".join(trial.get("phases") or [])})
            prior_date=old.get("primaryCompletion") or {}
            latest_date=trial.get("primaryCompletion") or {}
            if (prior_date.get("date"),prior_date.get("type")) != (
                latest_date.get("date"),latest_date.get("type")
            ):
                changes.append({**base,"type":"주요 완료일 등록 변경",
                                "before":(prior_date.get("date") or "미기재")+" / "+(prior_date.get("type") or "미기재"),
                                "after":(latest_date.get("date") or "미기재")+" / "+(latest_date.get("type") or "미기재")})
            if not old.get("hasResultsPosted") and trial.get("hasResultsPosted"):
                changes.append({**base,"type":"시험 결과 등록 표시 확인",
                                "detail":"ClinicalTrials.gov에 결과가 등록됨. 통계적 유효성 확인이나 허가를 의미하지 않음"})
    order={"시험 결과 등록 표시 확인":0,"시험 진행 상태 변경":1,"주요 완료일 등록 변경":2,
           "등록 단계 표시 변경":3,"표본에서 새로 포착":4}
    changes.sort(key=lambda x:(order.get(x["type"],5),x.get("sourceLastUpdate") or ""),reverse=False)
    return changes[:30]

CONDITION_KO = {
    "obesity": "비만", "overweight": "과체중",
    "crohn's disease": "크론병(만성 장 염증질환)",
    "early alzheimer's disease": "초기 알츠하이머병",
    "alzheimer's disease": "알츠하이머병",
    "type 2 diabetes": "제2형 당뇨병",
    "ulcerative colitis": "궤양성 대장염",
    "psoriasis": "건선", "atopic dermatitis": "아토피피부염",
    "sickle cell disease": "겸상적혈구병"
}

def plain_condition(trial, fallback):
    for raw in trial.get("conditions") or []:
        key = str(raw).casefold().strip()
        if key in CONDITION_KO:
            return CONDITION_KO[key]
    return fallback

def plain_phase(phases):
    words = {"PHASE1":"1상","PHASE2":"2상","PHASE3":"3상",
             "PHASE4":"4상","EARLY_PHASE1":"초기 1상","NA":"단계 해당 없음"}
    return "·".join(words.get(p, "단계 미기재") for p in phases) or "단계 미기재"

def weekly_interpretation(assets, changes, previous_generated):
    """Korean registry observations with an explicit investment question, not efficacy claims."""
    notes=[]
    priority_changes=[x for x in changes if x["type"]!="표본에서 새로 포착"]
    if priority_changes:
        for item in priority_changes[:2]:
            ticker=item["ticker"]
            label=item["type"]
            detail=(str(item.get("before",""))+" → "+str(item.get("after",""))
                    if "before" in item else item.get("detail",""))
            notes.append({
                "type":"등록정보 변경",
                "title":f"[{ticker} {item['asset']}] {label}",
                "observation":f"ClinicalTrials.gov의 {item['nctId']} 등록 정보에서 {detail} 항목이 변경됨.",
                "investmentCheck":"시험 등록 내용과 기업 IR의 후속 안내를 대조하고 실제 결과 발표·안전성 데이터를 확인",
                "limitation":"등록 정보의 변경은 긍정적 결과·허가·매출을 뜻하지 않음.",
                "url":item["url"],"nctId":item["nctId"]
            })
    # No-change status belongs in compact metadata, not a headline card.
    # Surface high-stakes Phase 3 completion first, then Phase 2, spread across diseases.
    today=NOW.date()
    candidates=[]
    for asset in assets:
        for trial in asset["trials"]:
            primary=trial.get("primaryCompletion") or {}
            raw=primary.get("date") or ""
            if not re.fullmatch(r"\d{4}-\d{2}(-\d{2})?", raw):
                continue
            # Month-level dates: compare to the first of that month, and keep precision explicit.
            try:
                day=datetime.fromisoformat(raw if len(raw)==10 else raw+"-01").date()
            except ValueError:
                continue
            day_gap=(day-today).days
            if day_gap<0 or day_gap>240 or primary.get("type")=="ACTUAL":
                continue
            phase=trial.get("phases") or []
            seriousness=(0 if "PHASE3" in phase else 1 if "PHASE2" in phase else 2)
            candidates.append((seriousness,day_gap,asset,trial,raw))
    candidates.sort(key=lambda x:(x[0],x[1],x[2]["ticker"]))
    used=set()
    for _,_,asset,trial,raw in candidates:
        if len(notes)>=4:
            break
        field=asset["disease"]
        if field in used:
            continue
        used.add(field)
        phase=plain_phase(trial.get("phases") or [])
        trial_status=trial.get("statusKr") or "상태 미기재"
        illness=plain_condition(trial,field)
        company=asset["ticker"]
        date_label=raw[:7] + "월" if len(raw)==7 else raw
        notes.append({
            "type":"앞으로 확인할 임상 일정",
            "title":f"{company} · {illness} 치료제의 {phase} 시험 일정",
            "observation":f"{asset['asset']}의 {illness} 관련 {phase} 시험은 {trial_status}. 공식 등록자료에 주요 치료 효과·안전성 평가를 마칠 시점이 {date_label}로 예상되어 있음.",
            "investmentCheck":f"{company}의 기업 발표에서 실제 시험 결과 발표 시점과 평가 기준·부작용 데이터를 확인",
            "limitation":"시험의 '주요 평가 완료 예정일'일 뿐, 결과 발표일·임상 성공·허가 예정일이 아님. 예상 일정은 바뀔 수 있음.",
            "url":trial["url"],"nctId":trial["nctId"],
            "explain":f"{phase}: 참여 환자에서 치료 효과·안전성을 평가하는 임상시험 단계. 시험 등록번호는 원문을 찾기 위한 식별자.",
            "expectedDate":raw, "datePrecision":"월" if len(raw)==7 else "일",
            "indication":illness
        })
    return notes[:4]

def gather():
    try:
        previous = json.loads(OUT.read_text(encoding="utf-8"))
    except (OSError,ValueError):
        previous = {}
    raw = json.loads(SEEDS.read_text(encoding="utf-8"))
    seeds = raw.get("records", [])
    cache, err, assets = {}, [], []
    for row in seeds:
        key = row["asset"].casefold()
        candidates = ALIASES.get(key, (row["asset"],))
        if key not in cache:
            found = {}
            for alias in (candidates[0], candidates[-1]) if len(candidates)>1 else (candidates[0],):
                try:
                    for study in obtain(alias):
                        sect = study.get("protocolSection", {})
                        ident = sect.get("identificationModule", {})
                        if re.fullmatch(r"NCT\d{8}", ident.get("nctId", "")):
                            found[ident["nctId"]] = study
                except Exception as exc:
                    err.append({"asset": row["asset"], "reason": type(exc).__name__})
                time.sleep(0.15)
            cache[key] = list(found.values())
        verified = [x for s in cache[key]
                    if (x := parse_trial(s, key, row["ticker"])) is not None]
        # Explicitly show only a small, relevant sample, not the entire trial universe.
        verified.sort(key=lambda v: (
            v["status"] not in ACTIVE,
            (v.get("primaryCompletion") or {}).get("date") or "9999-12-31",
            v["nctId"]
        ))
        assets.append({
            "ticker": row["ticker"], "asset": row["asset"], "disease": row["disease"],
            "modality": row["modality"], "verifiedTrialCountInSearchWindow": len(verified),
            "trials": verified[:5],
            "status": "registered_trials_found" if verified else "no_verified_match_or_data",
            "reviewNote": "약물·후원기관이 확인된 시험 등록만 표시. 다른 후원기관 시험이나 누락된 결과는 포함되지 않을 수 있음."
        })
    total = sum(len(x["trials"]) for x in assets)
    changes=registered_changes(previous,assets)
    weekly=weekly_interpretation(assets,changes,previous.get("generatedAt"))
    result = {
        "generatedAt": NOW.isoformat(), "source": "ClinicalTrials.gov API v2",
        "status": "partial" if err else "ok",
        "assets": assets, "errors": err,
        "verifiedTrialCards": total,
        "comparisonTo": previous.get("generatedAt"),
        "changeCount": len(changes), "changes": changes,
        "weeklyInterpretation": weekly,
        "weeklyInterpretationPolicy": "시험 등록 상태와 예상 완료일을 한국어로 재구성한 관찰. 실제 데이터 발표·승인·성공을 뜻하지 않음.",
        "changesNote": "이전 상위 등록시험 표본과 비교. 신규 포착은 신규 임상 개시를 뜻하지 않음.",
        "limitations": [
            "시험 등록자료는 제출자 관리 정보로 임상 성공·승인·실제 투자 가치의 검증이 아님",
            "개별 약물명 및 등록된 후원기관이 동시에 일치한 경우에만 연결",
            "최근 업데이트된 검색 결과 중 최대 75건/질문만 검색하므로 전체 목록이 아님",
            "Primary completion date는 예상(ESTIMATED)일 수 있음. 날짜와 상태는 갱신될 수 있음",
            "FDA 허가 상태·실적 매출은 ClinicalTrials.gov 등록 여부에서 추정하지 않음"
        ]
    }
    if err and not total:
        result["status"] = "unavailable"
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2)+"\n",encoding="utf-8")
    print("Clinical API: assets=%d trial_cards=%d errors=%d" %
          (len(assets),total,len(err)))

if __name__ == "__main__":
    gather()
