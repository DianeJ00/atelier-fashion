"""2-1: ingest daily licensed series without persisting raw quotes."""
from __future__ import annotations
import json
import math
import sys
import tempfile
import unittest
from datetime import date,datetime,timedelta,timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import price_event_feed as f
import price_events as detector
import validate_release as validator

NOW=datetime(2026,11,6,12,0,tzinfo=timezone.utc)
ISSUER={"id":"US:LLY","ticker":"LLY","market":"미국","sector":"바이오·제약"}

def synthetic_bars():
    """Fixtures are explicitly artificial prices; none originate from providers."""
    dates=[]
    cursor=date(2026,9,28)
    while len(dates)<26:
        if cursor.weekday()<5:dates.append(cursor.isoformat())
        cursor+=timedelta(days=1)
    bars={key:100+(n%3)*2 for n,key in enumerate(dates)}
    # Large final change, with modest previous 20 daily moves.
    bars[dates[-1]]=114
    return bars

class PriceEventFeedTests(unittest.TestCase):
    def test_separate_derived_rights_required(self):
        env={"MARKET_DERIVED_PUBLIC_OK":"true","MARKET_DERIVED_GIT_STORAGE_OK":"true"}
        self.assertTrue(f.licensed("configured",True,env))
        self.assertFalse(f.licensed("configured",False,env))
        self.assertFalse(f.licensed("",True,env))
        self.assertFalse(f.licensed("configured",True,{"MARKET_DERIVED_PUBLIC_OK":"true"}))
        self.assertFalse(f.licensed("configured",True,
                         {"MARKET_DERIVED_PUBLIC_OK":"TRUE","MARKET_DERIVED_GIT_STORAGE_OK":"true"}))
    def test_bars_to_observation_explicit_adjusted_close(self):
        bars=synthetic_bars()
        trade=max(bars)
        obj=f.observation_from_bars(ISSUER,bars,trade)
        self.assertIsNotNone(obj)
        self.assertEqual(obj["priceBasis"],detector.PRICE_BASIS)
        self.assertEqual(obj["close"],114)
        self.assertGreater(obj["volatility20dPct"],0)
        self.assertIsNone(f.observation_from_bars(ISSUER,bars,"2026-11-06"))
        too_short=dict(sorted(bars.items())[:10])
        self.assertIsNone(f.observation_from_bars(ISSUER,too_short,max(too_short)))
    def test_feed_contains_percentages_not_raw_quotes(self):
        bars=synthetic_bars()
        trade=max(bars)
        obs=f.observation_from_bars(ISSUER,bars,trade)
        feed=f.build_feed([obs],[ISSUER],trade,[],NOW,authorized=True)
        self.assertEqual(feed["status"],"partial")
        self.assertEqual(feed["coverage"]["screened"],1)
        self.assertTrue(feed["publicDerivedAuthorized"])
        self.assertEqual(feed["eligibleEvents"],1)
        e=feed["events"][0]
        self.assertEqual(e["ticker"],"LLY")
        self.assertEqual(e["evidenceState"],"원인 미확인")
        for forbidden in ("close","previousClose","volume","averageVolume20d"):
            self.assertNotIn(forbidden,e)
        self.assertIn("changePct",e)
        self.assertIn("https://twelvedata.com/",json.dumps(feed))
    def test_unlicensed_report_has_no_amounts_even_if_input_contains_sharp_move(self):
        obs=f.observation_from_bars(ISSUER,synthetic_bars(),max(synthetic_bars()))
        report=f.build_feed([obs],[ISSUER],obs["tradeDate"],[],NOW,authorized=False)
        self.assertEqual(report["status"],"permission_required")
        self.assertIsNone(report["asOf"])
        self.assertEqual(report["events"],[])
        self.assertEqual(report["coverage"]["screened"],0)
        self.assertFalse(report["publicDerivedAuthorized"])
        self.assertNotIn("changePct",json.dumps(report))
    def test_only_verified_sec_and_editor_reviewed_ir_are_candidate_evidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            (root/"sec-trends.json").write_text(json.dumps({"companies":[
                {"ticker":"LLY","filed":"2026-11-05",
                 "url":"https://www.sec.gov/Archives/edgar/data/1/10q.htm"},
                {"ticker":"UBER","filed":"2026-11-05",
                 "url":"https://example.org/invalid-sec-link"}
            ]}),encoding="utf-8")
            (root/"atelier-weekly.json").write_text(json.dumps({"items":[
                {"ticker":"LLY","eventDate":"2026-11-05","tier":"편집 원문 대조",
                 "sourceLabel":"Eli Lilly IR","title":"공식 임상 계획 발표",
                 "sourceUrl":"https://investor.lilly.com/news"},
                {"ticker":"LLY","eventDate":"2026-11-05","tier":"검증 대기",
                 "sourceLabel":"Eli Lilly IR","title":"검증 없는 텍스트",
                 "sourceUrl":"https://investor.lilly.com/"}
            ]}),encoding="utf-8")
            docs=f.evidence_from_reviewed_files(root)
            self.assertEqual(len(docs),2)
            self.assertSetEqual({x["sourceType"] for x in docs},{"sec_filing","company_ir"})
            obs=f.observation_from_bars(ISSUER,synthetic_bars(),max(synthetic_bars()))
            # The fixtures use a price session different from the source day;
            # only reviewed same-window evidence can attach.
            report=f.build_feed([obs],[ISSUER],obs["tradeDate"],docs,NOW,authorized=True)
            self.assertIs(report["events"][0]["causalityConfirmed"],False)
    def test_invalid_raw_price_record_fails_closed_without_public_numbers(self):
        bad={"issuerId":"US:LLY","ticker":"LLY","tradeDate":"2026-11-05"}
        with self.assertRaises(detector.InvalidPriceObservation):
            f.build_feed([bad],[ISSUER],"2026-11-05",[],NOW,authorized=True)
    def test_manifest_accepts_no_license_feed_and_rejects_fabricated_ready(self):
        records,errors=validator.read_data(ROOT)
        self.assertEqual(errors,[])
        records["price-events.json"]=f.empty(NOW)
        self.assertFalse([x for x in validator.validate(records) if x.startswith("price-events:")])
        records["price-events.json"]={"status":"ready","publicDerivedAuthorized":False,
         "asOf":"2026-11-05","coverage":{"screened":47,"totalUS":47},
         "events":[],"eligibleEvents":0}
        self.assertTrue([x for x in validator.validate(records) if x.startswith("price-events:")])

if __name__=="__main__":unittest.main()
