"""Private price-alert calibration: no actual quotes, no public historical data."""
import json
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import audit_price_alerts as audit
import price_events as detector

COMPANIES=[
 {"id":"US:LLY","ticker":"LLY","market":"미국","sector":"바이오·제약"},
 {"id":"US:RL","ticker":"RL","market":"미국","sector":"패션"},
 {"id":"US:UBER","ticker":"UBER","market":"미국","sector":"소비재·서비스"},
 {"id":"KR:105560","ticker":"105560","market":"한국","sector":"내 담당 기업"},
]
UNIVERSE={"companies":COMPANIES}

def obs(issuer, date="2026-11-06", previous="2026-11-05", close=112):
 return {
  "issuerId":"US:"+issuer,"ticker":issuer,
  "tradeDate":date,"previousTradeDate":previous,
  "close":close,"previousClose":100,
  "volatility20dPct":4,"priceBasis":detector.PRICE_BASIS,
  "source":{"provider":"synthetic-test-input","url":"https://example.org/fictional"},
 }

def fixture():
 return {
  "schemaVersion":1,"priceBasis":detector.PRICE_BASIS,
  "sessions":[
   {"tradeDate":"2026-11-06","observations":[
     obs("LLY",close=112),obs("RL",close=105),obs("UBER",close=99)]},
   {"tradeDate":"2026-11-09","observations":[
     obs("LLY","2026-11-09","2026-11-06",close=101),
     obs("UBER","2026-11-09","2026-11-06",close=88)]},
  ],
  "labels":[
   {"issuerId":"US:LLY","tradeDate":"2026-11-06","decision":"actionable"},
   {"issuerId":"US:UBER","tradeDate":"2026-11-09","decision":"noise"},
  ],
  "evidence":[{"issuerId":"US:LLY","sourceType":"sec_filing",
    "verified":True,"publishedAt":"2026-11-06","title":"Fictional source",
    "url":"https://www.sec.gov/Archives/example/fictional"}],
 }

class PrivateAuditTests(unittest.TestCase):
 def test_aggregate_coverage_sector_alerts_and_review_labels(self):
  x=audit.assess(fixture(),UNIVERSE)
  self.assertEqual(x["trackedUS"],3)
  self.assertEqual(x["days"],2)
  self.assertEqual(x["issuerDaysExpected"],6)
  self.assertEqual(x["issuerDaysObserved"],5)
  self.assertEqual(x["coveragePct"],83.3)
  self.assertEqual(x["incompleteSessions"],1)
  self.assertEqual(x["candidateCount"],2)
  self.assertEqual(x["candidatesWithEvidence"],1)
  self.assertEqual(x["reviewedActionable"],1)
  self.assertEqual(x["reviewedNoise"],1)
  self.assertIsNone(x["nonActionableAmongReviewedPct"])
  self.assertEqual(x["assessment"],"insufficient_reviewed_sample")
  self.assertEqual(x["sectors"]["패션"]["alertCandidates"],0)
  self.assertEqual(x["sectors"]["바이오·제약"]["alertCandidates"],1)
  self.assertEqual(x["sectors"]["소비재·서비스"]["alertCandidates"],1)
  self.assertNotIn("내 담당 기업",x["sectors"])
 def test_review_threshold_is_explicit_and_does_not_claim_causality(self):
  x=audit.assess(fixture(),UNIVERSE,min_reviewed=2)
  self.assertEqual(x["nonActionableAmongReviewedPct"],50.0)
  self.assertEqual(x["assessment"],"review_sample_sufficient")
  self.assertIn("not proof of price causality",x["caution"])
  self.assertEqual(x["sectors"]["바이오·제약"]["assessment"],
                   "insufficient_reviewed_sample")
 def test_output_never_contains_raw_prices_tickers_or_event_percentages(self):
  serialized=json.dumps(audit.assess(fixture(),UNIVERSE),ensure_ascii=False)
  for forbidden in ['"close"','"previousClose"','"changePct"',
                    '"US:LLY"','"US:UBER"','"LLY"','"UBER"']:
   self.assertNotIn(forbidden,serialized)
 def test_invalid_input_rejected_without_publishing(self):
  x=fixture()
  x["sessions"][0]["observations"][0]["priceBasis"]="unadjusted"
  with self.assertRaises(detector.InvalidPriceObservation):
   audit.assess(x,UNIVERSE)
  x=fixture()
  x["labels"][0]["decision"]="caused_by_news"
  with self.assertRaises(ValueError):
   audit.assess(x,UNIVERSE)
  x=fixture()
  x["labels"].append(dict(x["labels"][0]))
  with self.assertRaisesRegex(ValueError,"Duplicate review"):
   audit.assess(x,UNIVERSE)
  x=fixture()
  x["labels"].append({"issuerId":"US:RL","tradeDate":"2026-11-06",
                      "decision":"noise"})
  with self.assertRaisesRegex(ValueError,"detected candidates"):
   audit.assess(x,UNIVERSE)
  x=fixture()
  x["sessions"][1]["tradeDate"]="2026-11-06"
  with self.assertRaisesRegex(ValueError,"Duplicate trading"):
   audit.assess(x,UNIVERSE)
 def test_empty_run_is_not_empirical_quality_claim(self):
  x=audit.assess({"schemaVersion":1,"priceBasis":detector.PRICE_BASIS,
                  "sessions":[],"labels":[]},UNIVERSE)
  self.assertEqual(x["candidateCount"],0)
  self.assertIsNone(x["coveragePct"])
  self.assertEqual(x["assessment"],"insufficient_reviewed_sample")

if __name__=="__main__":
 unittest.main()
