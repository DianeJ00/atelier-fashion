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

def gather():
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
    result = {
        "generatedAt": NOW.isoformat(), "source": "ClinicalTrials.gov API v2",
        "status": "partial" if err else "ok",
        "assets": assets, "errors": err,
        "verifiedTrialCards": total,
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
