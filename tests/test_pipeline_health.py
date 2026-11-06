"""Market snapshot provenance and biotech registry/coverage invariants."""
import json
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import build_pipeline_review as pipeline
import build_data_health as health

class MarketVerified(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.d=json.loads((ROOT/"market-reviewed.json").read_text(encoding="utf-8"))
    def test_all_six_etfs_same_date_and_original_links(self):
        v=self.d
        self.assertEqual(v["status"],"source_verified_snapshot")
        self.assertEqual(v["asOf"],"2026-11-04")
        self.assertFalse(v["autoRefreshed"])
        self.assertEqual(set(v["returns"]),{"SPY","QQQ","XLK","XBI","XLY","XRT"})
        self.assertEqual(set(v["referenceURLs"]),set(v["returns"]))
        for symbol,returns in v["returns"].items():
            for period in ("1w","1m","3m","6m","1y"):
                self.assertIsInstance(returns[period],(int,float))
            self.assertTrue(v["referenceURLs"][symbol].startswith("https://"))
        self.assertIn("배당",v["priceConvention"])
    def test_excess_return_is_difference_not_inflow(self):
        v=self.d
        self.assertAlmostEqual(v["returns"]["XBI"]["3m"]-v["returns"]["XLK"]["3m"],10.31)
        self.assertAlmostEqual(v["returns"]["XLY"]["3m"]-v["returns"]["XLK"]["3m"],8.98)
        self.assertTrue(any("자금 유입" in x for x in v["caveats"]))

class ReportingPeriodAudit(unittest.TestCase):
    def test_official_quarter_ending_dates_are_not_api_check_dates(self):
        rows=[
            {"ticker":"A","status":"quarter_verified","quarter":{"periodEnd":"2026-09-30"}},
            {"ticker":"B","status":"quarter_verified","quarter":{"periodEnd":"2026-08-02"}},
            {"ticker":"C","status":"stale_cached","quarter":{"periodEnd":"2026-07-01"}},
        ]
        self.assertEqual(health.quarter_period_range(rows),{"earliest":"2026-08-02","latest":"2026-09-30"})
        nested=[{"sec":x} for x in rows]
        self.assertEqual(health.quarter_period_range(nested,nested=True),{"earliest":"2026-08-02","latest":"2026-09-30"})

    def test_audit_separates_check_date_and_data_as_of(self):
        row=health.item("fashion_sec","SEC","공식 실적","live",12,12,"공식 검증",
                        checked_at="2026-11-06T00:31:19+00:00",
                        period_range={"earliest":"2026-08-02","latest":"2026-09-30"})
        self.assertIsNone(row["asOf"])
        self.assertEqual(row["checkedAt"][:10],"2026-11-06")
        self.assertEqual(row["periodRange"]["latest"],"2026-09-30")
        self.assertIsNone(row["ageDays"])


class RegistryWatchlist(unittest.TestCase):
    def test_best_study_selects_highest_observed_phase(self):
        rows=[
            {"nctId":"NCT00001234","url":"https://clinicaltrials.gov/study/NCT00001234",
             "phases":["PHASE2"],"status":"COMPLETED","primaryCompletion":{}},
            {"nctId":"NCT00005678","url":"https://clinicaltrials.gov/study/NCT00005678",
             "phases":["PHASE3"],"status":"RECRUITING","primaryCompletion":{}}
        ]
        phase,trial=pipeline.best(rows)
        self.assertEqual(phase,"PHASE3")
        self.assertEqual(trial["nctId"],"NCT00005678")
        self.assertIsNone(pipeline.best([{"phases":["NA"],"nctId":"NCT99999999",
                                          "url":"https://clinicaltrials.gov/study/NCT99999999"}]))
    def test_biotech_watchlist_has_distinct_ticker_asset_pairs(self):
        d=json.loads((ROOT/"research-pipeline.json").read_text(encoding="utf-8"))
        rows=d["records"]
        self.assertEqual(len(rows),12)
        self.assertEqual(len(set((x["ticker"],x["asset"]) for x in rows)),12)
        for x in rows:
            self.assertTrue(("검증" in x.get("reviewStatus","")) or ("확인" in x.get("reviewStatus","")))
    def test_source_audit_reports_missing_market_data_honestly(self):
        rows=json.loads((ROOT/"data-health.json").read_text(encoding="utf-8")).get("items",[])
        if rows:
            by={x["id"]:x for x in rows}
            self.assertIn("market",by)
            self.assertIn("stocks",by)
            if by["stocks"]["covered"]<47:
                self.assertNotEqual(by["stocks"]["status"],"live")
            self.assertIn("korea",by)

if __name__=="__main__":
    unittest.main()
