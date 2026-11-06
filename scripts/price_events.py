#!/usr/bin/env python3
"""2-1 price-event detector: pure, licensed-input-only, evidence != causation.

This module does NOT fetch quotes, publish files or infer investment advice.
A future, independently licensed collector must provide verified adjusted daily
closes and explicitly authorize public derived-return display before use.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from urllib.parse import urlsplit
import math

ABSOLUTE_MOVE_PCT = 8.0
MIN_VOLATILITY_MULTIPLE = 2.0
MAX_SOURCE_GAP_DAYS = 7
OFFICIAL_TYPES = frozenset(("sec_filing", "company_ir", "clinical_registry"))
NEWS_TYPES = frozenset(("trusted_news",))
SOURCE_TYPES = OFFICIAL_TYPES | NEWS_TYPES
PRICE_BASIS = "split_adjusted_close"

class InvalidPriceObservation(ValueError):
    """Price records do not meet the contract required for public alerts."""

def day(value):
    if not isinstance(value, str):
        return None
    try:
        result=date.fromisoformat(value)
        if result.isoformat()!=value:
            return None
        return result
    except ValueError:
        return None

def valid_link(url):
    try:
        parsed=urlsplit(url)
        return parsed.scheme=="https" and bool(parsed.netloc) and not parsed.username
    except (ValueError,TypeError):
        return False

def checked_observation(raw, issuer_by_id):
    if not isinstance(raw, dict):
        raise InvalidPriceObservation("Daily price observation is not an object")
    issuer_id=raw.get("issuerId")
    issuer=issuer_by_id.get(issuer_id)
    if not issuer or issuer.get("market")!="미국" or issuer.get("ticker")!=raw.get("ticker"):
        raise InvalidPriceObservation("Unknown or mismatched US issuer")
    trade,prior=day(raw.get("tradeDate")),day(raw.get("previousTradeDate"))
    if trade is None or prior is None or not (prior<trade) or (trade-prior).days>MAX_SOURCE_GAP_DAYS:
        raise InvalidPriceObservation("Missing or nonconsecutive provider trade dates")
    if raw.get("priceBasis")!=PRICE_BASIS:
        raise InvalidPriceObservation("Split-adjusted close convention must be declared")
    if not isinstance(raw.get("source"),dict) or not raw["source"].get("provider") or not valid_link(raw["source"].get("url")):
        raise InvalidPriceObservation("Quote provider and secure source URL required")
    def positive(field):
        value=raw.get(field)
        if isinstance(value,bool) or not isinstance(value,(float,int)) or not math.isfinite(value) or value<=0:
            raise InvalidPriceObservation(f"{field}: finite positive value required")
        return float(value)
    close=positive("close")
    previous_close=positive("previousClose")
    volatility=positive("volatility20dPct")
    change=100*(close/previous_close-1)
    multiple=abs(change)/volatility
    volume=None
    if raw.get("volume") is not None or raw.get("averageVolume20d") is not None:
        v=positive("volume")
        avg=positive("averageVolume20d")
        volume=round(v/avg,2)
    sector_excess=None
    if raw.get("sectorReturnPct") is not None:
        sr=raw["sectorReturnPct"]
        if isinstance(sr,bool) or not isinstance(sr,(int,float)) or not math.isfinite(sr):
            raise InvalidPriceObservation("sector return is not a finite percentage")
        if raw.get("sectorTradeDate")!=raw.get("tradeDate"):
            raise InvalidPriceObservation("Sector benchmark date mismatches the stock date")
        sector_excess=round(change-float(sr),2)
    return {
        "issuerId":issuer_id,"ticker":raw["ticker"],
        "tradeDate":raw["tradeDate"],"previousTradeDate":raw["previousTradeDate"],
        "changePct":round(change,2),"volatilityMultiple":round(multiple,2),
        "volumeMultiple":volume,"sectorExcessPct":sector_excess,
        "source":raw["source"],
    }

def matching_evidence(item, evidence):
    trade=day(item["tradeDate"])
    selected=[]
    for row in evidence:
        if not isinstance(row,dict) or row.get("issuerId")!=item["issuerId"] or row.get("verified") is not True:
            continue
        if row.get("sourceType") not in SOURCE_TYPES or not valid_link(row.get("url")) or not row.get("title"):
            continue
        published=row.get("publishedAt")
        published_day=day(published[:10]) if isinstance(published,str) and len(published)>=10 else None
        # Associated publications must precede the close date, never follow it.
        if published_day is None or not (trade-timedelta(days=2)<=published_day<=trade):
            continue
        selected.append({
            "sourceType":row["sourceType"],"publishedAt":published,
            "title":str(row["title"])[:180],"url":row["url"],
        })
    selected.sort(key=lambda x:x["publishedAt"],reverse=True)
    return selected[:2]

def scan(observations, issuers, evidence=(), *, as_of, derived_display_authorized=False,
         limit=3):
    """Return zero invented events on unlicensed or missing data.

    Even matching SEC events are ASSOCIATIONS, never a claimed causal explanation.
    """
    if not derived_display_authorized:
        return {"schemaVersion":1,"status":"permission_required","asOf":None,
                "events":[],"reason":"Public derived-price display authorization not verified"}
    checked_day=day(as_of)
    if checked_day is None:
        raise InvalidPriceObservation("Explicit provider trade date required")
    if not isinstance(observations,list):
        raise InvalidPriceObservation("Observations must be a list")
    by_id={x["id"]:x for x in issuers if isinstance(x,dict) and x.get("id")}
    seen=set()
    found=[]
    for record in observations:
        item=checked_observation(record,by_id)
        if item["tradeDate"]!=as_of:
            raise InvalidPriceObservation("Different close dates must not enter one daily run")
        key=(item["issuerId"],item["tradeDate"])
        if key in seen:
            raise InvalidPriceObservation("Duplicate issuer close for the same session")
        seen.add(key)
        if abs(item["changePct"])<ABSOLUTE_MOVE_PCT or item["volatilityMultiple"]<MIN_VOLATILITY_MULTIPLE:
            continue
        references=matching_evidence(item,evidence)
        item["evidence"]=references
        item["evidenceState"]=(
            "공식 사건 동기간 확인 · 인과 미확정" if any(x["sourceType"] in OFFICIAL_TYPES for x in references) else
            "관련 뉴스 동기간 확인 · 인과 미확정" if references else
            "원인 미확인"
        )
        item["causalityConfirmed"]=False
        found.append(item)
    found.sort(key=lambda x:(-abs(x["changePct"]),-x["volatilityMultiple"],x["issuerId"]))
    if limit<0:raise ValueError("limit must be nonnegative")
    return {
        "schemaVersion":1,
        "status":"ready" if observations else "no_verified_daily_closes",
        "asOf":as_of if observations else None,
        "rule":{"absoluteMovePct":ABSOLUTE_MOVE_PCT,"volatilityMultiple":MIN_VOLATILITY_MULTIPLE},
        "events":found[:limit],
        "screenedIssuers":len(seen),
        "eligibleEvents":len(found),
    }
