#!/usr/bin/env python3
"""Private-only 2-1 alert calibration; no API calls, no source-price exports.

Consume authorized LOCAL inputs via stdin and print aggregate counts only.
This tool is never part of Pages packaging or GitHub scheduled data jobs.
A human "noise" label measures review usefulness, not price-cause certainty.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

import price_events as detector

DECISIONS = frozenset(("actionable", "noise", "uncertain"))
MIN_REVIEWED = 10

def numeric_pct(part, whole):
    return round(100 * part / whole, 1) if whole else None

def assess(payload: dict, universe: dict, *, min_reviewed=MIN_REVIEWED):
    if not isinstance(payload, dict) or payload.get("schemaVersion") != 1:
        raise ValueError("Expected version 1 private price-alert audit input")
    if payload.get("priceBasis") != detector.PRICE_BASIS:
        raise ValueError("Only dividend/split-adjusted EOD closes are supported")
    sessions = payload.get("sessions")
    labels = payload.get("labels", [])
    evidence = payload.get("evidence", [])
    if not isinstance(evidence, list):
        raise ValueError("evidence must be an array")
    if not isinstance(sessions, list) or not isinstance(labels, list):
        raise ValueError("sessions and labels must be arrays")
    issuers = [x for x in universe.get("companies", [])
               if isinstance(x, dict) and x.get("market") == "미국"]
    if not issuers or any(not x.get("id") or not x.get("ticker") or
                          not x.get("sector") for x in issuers):
        raise ValueError("Verified US issuer universe required")
    if len({x["id"] for x in issuers}) != len(issuers):
        raise ValueError("Duplicate issuer identities in universe")
    by_id = {x["id"]: x for x in issuers}
    votes = {}
    for label in labels:
        if not isinstance(label, dict):
            raise ValueError("Bad analyst review record")
        issuer = label.get("issuerId")
        date = label.get("tradeDate")
        decision = label.get("decision")
        key = (issuer, date)
        if issuer not in by_id or not detector.day(date) or decision not in DECISIONS:
            raise ValueError("Review label needs a tracked issuer, trade date and valid decision")
        if key in votes:
            raise ValueError("Duplicate review label")
        votes[key] = decision

    def sector():
        return {"issuerDays": 0, "alertCandidates": 0, "volumeVerified": 0,
                "linkedEvidence": 0, "reviewedActionable": 0,
                "reviewedNoise": 0, "reviewedUncertain": 0, "unreviewed": 0}

    sectors = defaultdict(sector)
    for issuer in issuers:
        sectors[issuer["sector"]]  # output zero-observation sectors explicitly
    seen_dates = set()
    examined = set()
    candidate_keys = set()
    covered = 0
    candidates = 0
    events_with_evidence = 0
    top3_overflow_sessions = 0
    incomplete_sessions = 0
    for session in sessions:
        if not isinstance(session, dict) or not detector.day(session.get("tradeDate")):
            raise ValueError("Each session needs an ISO exchange close date")
        date = session["tradeDate"]
        if date in seen_dates:
            raise ValueError("Duplicate trading session")
        seen_dates.add(date)
        observations = session.get("observations")
        if not isinstance(observations, list) or len(observations) > len(issuers):
            raise ValueError("Invalid set of observations")
        alert = detector.scan(
            observations, issuers, evidence, as_of=date,
            derived_display_authorized=True, limit=len(issuers),
        )
        # Re-check every observation even when it is below alert thresholds.
        day_seen = set()
        for row in observations:
            obs = detector.checked_observation(row, by_id)
            ident = obs["issuerId"]
            if ident in day_seen:
                raise ValueError("Duplicate issuer in a trading session")
            day_seen.add(ident)
            sectors[by_id[ident]["sector"]]["issuerDays"] += 1
            examined.add((ident, date))
            covered += 1
        if len(day_seen) < len(issuers):
            incomplete_sessions += 1
        if len(alert["events"]) > 3:
            top3_overflow_sessions += 1
        candidates += len(alert["events"])
        for event in alert["events"]:
            candidate_keys.add((event["issuerId"], date))
            group = sectors[by_id[event["issuerId"]]["sector"]]
            group["alertCandidates"] += 1
            if event["volumeMultiple"] is not None:
                group["volumeVerified"] += 1
            if event["evidence"]:
                group["linkedEvidence"] += 1
                events_with_evidence += 1
            decision = votes.get((event["issuerId"], date))
            if decision is None:
                group["unreviewed"] += 1
            else:
                group["reviewed" + decision.title()] += 1

    if any(key not in candidate_keys for key in votes):
        raise ValueError("Analyst labels must refer to detected candidates in reviewed sessions")

    output_sectors = {}
    total_actionable = total_noise = total_uncertain = total_unreviewed = 0
    for label, data in sorted(sectors.items()):
        actionable, noise, uncertain = (
            data["reviewedActionable"], data["reviewedNoise"],
            data["reviewedUncertain"],
        )
        reviewed = actionable + noise
        total_actionable += actionable
        total_noise += noise
        total_uncertain += uncertain
        total_unreviewed += data["unreviewed"]
        output_sectors[label] = {
            **data,
            "candidatesPer100IssuerDays":round(
                data["alertCandidates"] * 100 / data["issuerDays"], 2
            ) if data["issuerDays"] else None,
            # Never call this a causal false-positive rate.
            "nonActionableAmongReviewedPct":numeric_pct(noise, reviewed)
                if reviewed >= min_reviewed else None,
            "assessment": "review_sample_sufficient" if reviewed >= min_reviewed
                else "insufficient_reviewed_sample",
        }
    evaluated = total_actionable + total_noise
    return {
        "schemaVersion": 1,
        "mode": "private_local_aggregate_only",
        "priceBasis": detector.PRICE_BASIS,
        "days": len(seen_dates),
        "trackedUS": len(issuers),
        "issuerDaysExpected": len(seen_dates) * len(issuers),
        "issuerDaysObserved": covered,
        "coveragePct":numeric_pct(covered, len(seen_dates) * len(issuers)),
        "incompleteSessions": incomplete_sessions,
        "candidateCount": candidates,
        "sessionsMoreThanThreeCandidates":top3_overflow_sessions,
        "candidatesWithEvidence":events_with_evidence,
        "reviewedActionable": total_actionable,
        "reviewedNoise": total_noise,
        "reviewedUncertain": total_uncertain,
        "unreviewedCandidates": total_unreviewed,
        "reviewCoveragePct":numeric_pct(evaluated + total_uncertain, candidates),
        "decisiveCoveragePct":numeric_pct(evaluated, candidates),
        "nonActionableAmongReviewedPct": numeric_pct(total_noise, evaluated)
            if evaluated >= min_reviewed else None,
        "assessment": "review_sample_sufficient" if evaluated >= min_reviewed
            else "insufficient_reviewed_sample",
        "sectors": output_sectors,
        "caution":(
            "Human usefulness labels are not proof of price causality. "
            "No empirical sector precision is established without sufficient "
            "licensed observations and independently reviewed candidate labels."
        ),
    }

def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Private-only EOD alert calibration from stdin; outputs aggregates only"
    )
    parser.add_argument("--universe", type=Path,
                        default=Path(__file__).resolve().parents[1]/"research-universe.json")
    parser.add_argument("--min-reviewed", type=int, default=MIN_REVIEWED)
    args = parser.parse_args(argv)
    if args.min_reviewed < 1:
        parser.error("--min-reviewed must be >=1")
    try:
        data = json.load(sys.stdin)
        universe = json.loads(args.universe.read_text(encoding="utf-8"))
        report = assess(data, universe, min_reviewed=args.min_reviewed)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print("Private audit rejected: " + str(exc), file=sys.stderr)
        return 1
    json.dump(report, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
