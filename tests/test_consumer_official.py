"""Issuer source provenance and 15-company consumer-operations guardrails."""
import json
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import collect_consumer_official as c

class ConsumerOfficialTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.seed=json.loads((ROOT/"consumer-kpi-baseline.json").read_text(encoding="utf-8"))
        cls.site=json.loads((ROOT/"consumer-official.json").read_text(encoding="utf-8"))
        cls.by={x["ticker"]:x for x in cls.seed["items"]}

    def test_15_tickers_unique_and_company_universe_matched(self):
        tickers=[x["ticker"] for x in self.seed["items"]]
        self.assertEqual(len(tickers),15)
        self.assertEqual(len(set(tickers)),15)
        self.assertEqual(set(tickers),c.COVERAGE)
        uni=json.loads((ROOT/"research-universe.json").read_text(encoding="utf-8"))
        self.assertEqual(set(tickers),{x["ticker"] for x in uni["companies"]
                    if x["sector"]=="소비재·서비스"})

    def test_operating_kpis_are_dated_original_company_sources(self):
        self.assertGreaterEqual(sum(len(x["metrics"]) for x in self.seed["items"]),40)
        for item in self.seed["items"]:
            self.assertTrue(item["sourceURL"].startswith("https://"))
            self.assertTrue(item["period"])
            self.assertLessEqual(item["publishedAt"],"2026-11-05")
            for m in item["metrics"]:
                self.assertIsInstance(m["value"],(int,float))
                self.assertTrue(m.get("basis"))
                self.assertEqual(m["period"],item["period"])

    def test_kpis_do_not_confuse_transaction_value_and_issuer_revenue(self):
        uber=self.by["UBER"]
        self.assertNotEqual(uber["metrics"][0]["label"],"GAAP 매출")
        self.assertEqual(uber["metrics"][0]["label"],"총예약액")
        self.assertEqual(self.by["CAVA"]["period"],"2026 Q3")
        self.assertEqual(self.by["COST"]["period"],"FY2026 Q4 (16주)")

    def test_latest_sec_quarter_flags_older_industry_kpi(self):
        record={"ticker":"TGT","periodEnd":"2026-08-01"}
        later={"quarterFiling":{"reportEnd":"2026-11-01"}}
        self.assertEqual(c.snapshot_status(record,later),"older_than_latest_10q")
        self.assertEqual(c.snapshot_status(record,{"quarterFiling":{"reportEnd":"2026-08-01"}}),"dated_issuer_snapshot")

    def test_page_never_invents_sec_figures(self):
        page={x["ticker"]:x for x in self.site["companies"]}
        self.assertEqual(len(page),15)
        for row in page.values():
            if row.get("sec") is None:
                self.assertEqual(row["operatingKpiStatus"],"dated_issuer_snapshot")
                self.assertIn("sourceURL",row)

if __name__=="__main__":
    unittest.main()
