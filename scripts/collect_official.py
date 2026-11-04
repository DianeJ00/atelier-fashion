#!/usr/bin/env python3
"""SEC filing tracker with strictly period-matched GAAP quarter metrics.

Only the SEC's submitted 10-Q and US-GAAP XBRL facts are used. No projections.
If a company/period/tag cannot be verified, return null rather than an estimate.
"""
from __future__ import annotations

import json
import os
import time
from datetime import datetime, date, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "official-financials.json"
NOW = datetime.now(timezone.utc)
TODAY = NOW.date().isoformat()
USER_AGENT = os.environ.get("SEC_USER_AGENT", "").strip() or (
    "ATELIER Fashion Research (contact: https://github.com/DianeJ00/atelier-fashion/issues)"
)

# CIK identifies the registrant, not its brand; the ticker is the app's label.
CIKS = {
    "RL": 1037038, "PVH": 78239, "LEVI": 94845, "ANF": 1018840,
    "GAP": 39911, "AEO": 919012, "URBN": 912615, "VFC": 103379,
    "CPRI": 1530721, "CAL": 14707, "VSXY": 1856437, "TPR": 1116132
}
REVENUE_TAGS = [
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "RevenueFromContractWithCustomerIncludingAssessedTax",
    "SalesRevenueNet", "Revenues"
]
METRIC_TAGS = {
    "revenue": REVENUE_TAGS,
    "operatingIncome": ["OperatingIncomeLoss"],
    "netIncome": ["NetIncomeLoss"]
}

def get_json(url: str) -> dict:
    req = Request(url, headers={
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
        "Accept-Encoding": "identity",
    })
    with urlopen(req, timeout=18) as response:
        return json.load(response)

def filings_list(data: dict) -> list:
    recent = data.get("filings", {}).get("recent", {})
    n = len(recent.get("form", []))
    result = []
    for i in range(n):
        form = recent["form"][i]
        filed = recent.get("filingDate", [""] * n)[i]
        if form not in ("10-Q", "10-K", "8-K") or not filed or filed > TODAY:
            continue
        accn = recent.get("accessionNumber", [""] * n)[i]
        doc = recent.get("primaryDocument", [""] * n)[i]
        if not accn or not doc:
            continue
        result.append({
            "form": form, "filed": filed,
            "reportEnd": recent.get("reportDate", [""] * n)[i],
            "accession": accn,
            "url": f"https://www.sec.gov/Archives/edgar/data/{int(data['cik'])}/{accn.replace('-', '')}/{doc}",
        })
    result.sort(key=lambda x: (x["filed"], x["accession"]), reverse=True)
    return result

def period_days(entry: dict) -> int:
    try:
        return (date.fromisoformat(entry["end"]) - date.fromisoformat(entry["start"])).days + 1
    except (KeyError, TypeError, ValueError):
        return 0

def select_metric(companyfacts: dict, accn: str, metric: str):
    gaap = companyfacts.get("facts", {}).get("us-gaap", {})
    for tag in METRIC_TAGS[metric]:
        entries = gaap.get(tag, {}).get("units", {}).get("USD", [])
        current = [
            x for x in entries if
            x.get("accn") == accn and x.get("form") == "10-Q"
            and 75 <= period_days(x) <= 105
            and x.get("end", "") <= TODAY and isinstance(x.get("val"), (int, float))
        ]
        if not current:
            continue
        # An accession can contain both this quarter and the comparative prior quarter.
        current.sort(key=lambda x: (x["end"], x.get("filed", "")), reverse=True)
        row = current[0]
        value = row["val"]
        item = {
            "value": value, "unit": "USD", "usGaapTag": tag,
            "start": row["start"], "end": row["end"],
            "fiscalYear": row.get("fy"), "fiscalPeriod": row.get("fp"),
            "form": row["form"], "accession": accn
        }
        if metric == "revenue" and value > 0:
            base = []
            this_start = date.fromisoformat(row["start"])
            this_end = date.fromisoformat(row["end"])
            for x in current[1:]:
                if not x.get("start") or not x.get("end"):
                    continue
                if x.get("val", 0) <= 0 or abs(period_days(x) - period_days(row)) > 8:
                    continue
                dx = (this_end - date.fromisoformat(x["end"])).days
                ds = (this_start - date.fromisoformat(x["start"])).days
                if 350 <= dx <= 380 and 350 <= ds <= 380:
                    base.append(x)
            if base:
                prev = max(base, key=lambda x: x["end"])
                item["priorYearValue"] = prev["val"]
                item["priorYearStart"] = prev["start"]
                item["priorYearEnd"] = prev["end"]
                item["yoyPercent"] = round(100 * (value / prev["val"] - 1), 1)
        return item
    return None

def collect_one(ticker, cik):
    cik10 = f"{cik:010d}"
    sub = get_json(f"https://data.sec.gov/submissions/CIK{cik10}.json")
    all_forms = filings_list(sub)
    quarterly_filings = [x for x in all_forms if x["form"] == "10-Q"]
    latest = next((x for x in all_forms if x["form"] in ("10-Q", "10-K")), None)
    result = {
        "ticker": ticker, "cik": cik, "companyName": sub.get("name", ticker),
        "status": "filings_only", "latestReport": latest,
        "recentReports": [x for x in all_forms if x["form"] in ("10-Q", "10-K")][:3],
        "quarter": None, "verifiedAt": NOW.isoformat(),
    }
    if not quarterly_filings:
        result["note"] = "최근 10-Q가 확인되지 않아 분기 수치를 표시하지 않음"
        return result
    latest_q = quarterly_filings[0]
    result["quarterFiling"] = latest_q
    facts = get_json(f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik10}.json")
    metrics = {key: select_metric(facts, latest_q["accession"], key) for key in METRIC_TAGS}
    if any(x is not None for x in metrics.values()):
        ref = next(x for x in metrics.values() if x is not None)
        result["quarter"] = {
            "periodStart": ref["start"], "periodEnd": ref["end"],
            "form": "10-Q", "filed": latest_q["filed"], "url": latest_q["url"],
            "fiscalYear": ref["fiscalYear"], "fiscalPeriod": ref["fiscalPeriod"],
            "metrics": metrics
        }
        result["status"] = "quarter_verified"
    else:
        result["note"] = "해당 10-Q의 약 3개월 구간 US-GAAP 수치를 확인하지 못함"
    return result

def main():
    previous = {}
    if OUT.exists():
        try:
            previous = json.loads(OUT.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            pass
    prev_by_ticker = {x.get("ticker"): x for x in previous.get("companies", [])}
    companies, errors = [], []
    for ticker, cik in CIKS.items():
        try:
            item = collect_one(ticker, cik)
            companies.append(item)
            print(f"{ticker}: {item['status']}")
        except Exception as exc:
            http_status = getattr(exc, "code", None)
            reason = ("HTTP_" + str(http_status)) if http_status else type(exc).__name__
            errors.append({"ticker": ticker, "reason": reason})
            prev = prev_by_ticker.get(ticker)
            if prev and prev.get("status") in ("quarter_verified", "stale_cached"):
                item = dict(prev)
                item["status"] = "stale_cached"
                item["note"] = "SEC 재조회 실패: 이전에 확인한 수치이며 최신 정보가 아님"
                item["lastAttemptAt"] = NOW.isoformat()
            else:
                item = {"ticker": ticker, "cik": cik, "status": "unavailable",
                        "quarter": None, "latestReport": None,
                        "note": "SEC 접근 불가 또는 데이터 부재. 공시 원문 직접 확인 필요"}
            companies.append(item)
            print(f"{ticker}: error {reason}")
        time.sleep(0.25)  # Avoid bursting requests at SEC.
    output = {
        "generatedAt": NOW.isoformat(),
        "source": "U.S. SEC EDGAR submissions + US-GAAP companyfacts",
        "method": "10-Q accession 일치 및 75~105일 수익·이익만 표기. GAAP 기준이며 조정 EPS·브랜드 성장률 아님.",
        "companies": companies, "errors": errors,
        "sourceStatus": "ok" if not errors else ("partial" if len(errors) < len(CIKS) else "unavailable")
    }
    OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"SEC output: verified={sum(bool(x.get('quarter')) for x in companies)}, errors={len(errors)}")

if __name__ == "__main__":
    main()
