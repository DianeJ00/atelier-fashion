"""2-1 signals without live data: no invented prices, no unsupported causal claims."""
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import price_events as p

ISSUERS=[
 {"id":"US:LLY","ticker":"LLY","market":"미국"},
 {"id":"US:UBER","ticker":"UBER","market":"미국"},
 {"id":"US:RL","ticker":"RL","market":"미국"},
 {"id":"KR:105560","ticker":"105560","market":"한국"},
]
def row(issuer="LLY",close=112,prior=100,vol=4,trade="2026-11-05"):
 return {
  "issuerId":"US:"+issuer,"ticker":issuer,
  "tradeDate":trade,"previousTradeDate":"2026-11-04",
  "close":close,"previousClose":prior,
  "volatility20dPct":vol,
  "priceBasis":"dividend_split_adjusted_close",
  "source":{"provider":"hypothetical-fixture","url":"https://example.org/test-only"}
 }

class PriceEventsTests(unittest.TestCase):
    def test_without_verified_rights_never_exposes_percentages(self):
        sample=p.scan([row()],ISSUERS,as_of="2026-11-05")
        self.assertEqual(sample["status"],"permission_required")
        self.assertEqual(sample["events"],[])
        self.assertIsNone(sample["asOf"])
    def test_without_prices_never_claims_an_alert(self):
        data=p.scan([],ISSUERS,as_of="2026-11-05",derived_display_authorized=True)
        self.assertEqual(data["status"],"no_verified_daily_closes")
        self.assertEqual(data["events"],[])
    def test_requires_both_large_change_and_unusual_volatility(self):
        cases=[row(close=107),row(close=112,vol=8)]
        for observation in cases:
            with self.subTest(close=observation["close"],vol=observation["volatility20dPct"]):
                data=p.scan([observation],ISSUERS,as_of="2026-11-05",derived_display_authorized=True)
                self.assertEqual(data["eligibleEvents"],0)
        event=p.scan([row()],ISSUERS,as_of="2026-11-05",derived_display_authorized=True)["events"][0]
        self.assertEqual(event["changePct"],12)
        self.assertEqual(event["volatilityMultiple"],3)
        self.assertEqual(event["evidenceState"],"원인 미확인")
        self.assertIs(event["causalityConfirmed"],False)
    def test_volume_and_sector_comparison_require_matching_dates(self):
        z=row()
        z.update({"volume":400,"averageVolume20d":100,"sectorReturnPct":3,
                  "sectorTradeDate":"2026-11-05"})
        result=p.scan([z],ISSUERS,as_of="2026-11-05",derived_display_authorized=True)
        event=result["events"][0]
        self.assertEqual(event["volumeMultiple"],4)
        self.assertEqual(event["sectorExcessPct"],9)
        z["sectorTradeDate"]="2026-11-04"
        with self.assertRaisesRegex(p.InvalidPriceObservation,"benchmark date"):
            p.scan([z],ISSUERS,as_of="2026-11-05",derived_display_authorized=True)
    def test_wrong_price_basis_and_issuer_mismatch_are_rejected(self):
        z=row();z["priceBasis"]="unadjusted"
        with self.assertRaisesRegex(p.InvalidPriceObservation,"Split-adjusted"):
            p.scan([z],ISSUERS,as_of="2026-11-05",derived_display_authorized=True)
        z=row();z["issuerId"]="KR:105560"
        with self.assertRaisesRegex(p.InvalidPriceObservation,"mismatched"):
            p.scan([z],ISSUERS,as_of="2026-11-05",derived_display_authorized=True)
    def test_same_trading_date_and_unique_issuer_are_required(self):
        with self.assertRaisesRegex(p.InvalidPriceObservation,"Different close dates"):
            p.scan([row()],ISSUERS,as_of="2026-11-06",derived_display_authorized=True)
        with self.assertRaisesRegex(p.InvalidPriceObservation,"Duplicate"):
            p.scan([row(),row()],ISSUERS,as_of="2026-11-05",derived_display_authorized=True)
    def test_official_publication_is_not_labeled_a_cause(self):
        evidence=[
          {"issuerId":"US:LLY","sourceType":"sec_filing","verified":True,
           "publishedAt":"2026-11-05","title":"Filing","url":"https://www.sec.gov/Archives/test"},
          {"issuerId":"US:LLY","sourceType":"trusted_news","verified":False,
           "publishedAt":"2026-11-05","title":"Rumour","url":"https://example.org/rumour"},
          {"issuerId":"US:LLY","sourceType":"company_ir","verified":True,
           "publishedAt":"2026-11-06","title":"After the close day","url":"https://example.org/after"},
        ]
        item=p.scan([row()],ISSUERS,evidence,as_of="2026-11-05",
                    derived_display_authorized=True)["events"][0]
        self.assertEqual(len(item["evidence"]),1)
        self.assertIn("인과 미확정",item["evidenceState"])
        self.assertIs(item["causalityConfirmed"],False)
    def test_prioritize_largest_three_with_stable_tiebreaker(self):
        obs=[row("RL",close=116),row("UBER",close=111),row("LLY",close=121)]
        r=p.scan(obs,ISSUERS,as_of="2026-11-05",derived_display_authorized=True,limit=2)
        self.assertEqual(r["eligibleEvents"],3)
        self.assertEqual([x["ticker"] for x in r["events"]],["LLY","RL"])
    def test_records_are_test_inputs_not_real_quotes(self):
        self.assertEqual(p.PRICE_BASIS,"dividend_split_adjusted_close")
        self.assertTrue(p.valid_link("https://example.org/data"))
        self.assertFalse(p.valid_link("javascript:alert(1)"))

if __name__=="__main__":unittest.main()
