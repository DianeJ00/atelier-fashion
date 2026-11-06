#!/usr/bin/env python3
"""Check that a scheduled ATELIER refresh actually produced same-day verified data.

Runs from a separate GitHub Actions schedule. Optional/licensed data feeds are
not mistaken for critical failures; this guard does not claim real-time market quotes.
"""
from __future__ import annotations
import json
import os
import re
import sys
from urllib.request import Request, urlopen
from datetime import datetime,timezone,timedelta
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
KST=timezone(timedelta(hours=9))
CRITICAL=("fashion_sec","consumer_sec","biotech_sec","biotech_trials")

def parse(value):
    try:
        d=datetime.fromisoformat(str(value).replace("Z","+00:00"))
        return d if d.tzinfo is not None else None
    except (ValueError,TypeError):
        return None

def issues(data,now=None):
    now=now or datetime.now(timezone.utc)
    problems=[]
    generated=parse(data.get("generatedAt"))
    if not generated:
        return ["데이터 현황 생성 시각이 없거나 잘못됐습니다."]
    age=(now-generated).total_seconds()/3600
    if age < -0.5:
        problems.append("데이터 현황의 생성 시각이 현재보다 미래입니다.")
    if generated.astimezone(KST).date()!=now.astimezone(KST).date():
        problems.append("오늘(한국 시간) 정상적으로 완료된 데이터 점검이 없습니다.")
    if age > 30:
        problems.append("마지막 전체 데이터 점검이 30시간 넘게 경과했습니다.")
    by={x.get("id"):x for x in data.get("items",[]) if isinstance(x,dict)}
    for item_id in CRITICAL:
        row=by.get(item_id)
        if not row:
            problems.append(f"{item_id}: 데이터 감사 항목이 없습니다.")
            continue
        if row.get("status")!="live" or not isinstance(row.get("covered"),int) or row["covered"]<1:
            problems.append(f"{item_id}: 공식 자료 수집·검증 미완료 ({row.get('status')}).")
        checked=parse(row.get("checkedAt"))
        if not checked or checked.astimezone(KST).date()!=now.astimezone(KST).date():
            problems.append(f"{item_id}: 오늘 공식 데이터 수집 확인 기록이 없습니다.")
    return problems

def schedule_issues(runs, now=None):
    """Do not accept a manual push as evidence of a scheduled refresh."""
    now=now or datetime.now(timezone.utc)
    today=now.astimezone(KST).date()
    scheduled=[r for r in runs if r.get("event")=="schedule" and parse(r.get("created_at"))]
    todays=[r for r in scheduled
            if parse(r["created_at"]).astimezone(KST).date()==today]
    if not todays:
        return ["오늘 성공 여부를 확인할 정기 예약 실행(schedule) 기록이 없습니다."]
    last=max(todays,key=lambda r:r["created_at"])
    if last.get("conclusion")!="success":
        return ["오늘 정기 예약 실행의 최종 결과가 성공이 아닙니다: "+
                str(last.get("status") or "unknown")+"/"+str(last.get("conclusion") or "pending")]
    return []

def read_schedule_runs(repo, token):
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+",repo or ""):
        raise ValueError("Valid GitHub repository owner/name is required")
    endpoint=("https://api.github.com/repos/"+repo+
              "/actions/workflows/weekly-research.yml/runs?event=schedule&per_page=20")
    headers={"Accept":"application/vnd.github+json","User-Agent":"ATELIER source guard"}
    if token:
        headers["Authorization"]="Bearer "+token
    with urlopen(Request(endpoint,headers=headers),timeout=18) as response:
        data=json.load(response)
    if not isinstance(data,dict) or not isinstance(data.get("workflow_runs"),list):
        raise ValueError("GitHub Actions schedule history response invalid")
    return data["workflow_runs"]

def main():
    data=json.loads((ROOT/"data-health.json").read_text(encoding="utf-8"))
    failures=issues(data)
    if "--verify-schedule" in sys.argv:
        try:
            runs=read_schedule_runs(os.environ.get("GITHUB_REPOSITORY",""),
                                    os.environ.get("GH_TOKEN",""))
            failures.extend(schedule_issues(runs))
        except Exception as exc:
            failures.append("정기 예약 실행 이력을 조회하지 못했습니다: "+type(exc).__name__)
    if failures:
        for message in failures:
            print("::error::"+message)
        raise SystemExit(1)
    print("ATELIER daily source freshness confirmed (KST, official US/clinical sources).")
    print("Market-data license, DART and AI summary availability are separately tracked.")

if __name__=="__main__":
    main()
