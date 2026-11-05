"""ATELIER 2.0 offline universe, biotech taxonomy and relative-price guards."""
import json
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import collect_market_relative as perf

class UniverseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=json.loads((ROOT/"research-universe.json").read_text(encoding="utf-8"))
        cls.assets=json.loads((ROOT/"research-pipeline.json").read_text(encoding="utf-8"))
    def test_unique_52_companies(self):
        names=self.data["companies"]
        self.assertEqual(len(names),52)
        self.assertEqual(len(set(x["id"] for x in names)),52)
        by_sector={}
        for c in names:by_sector[c["sector"]]=by_sector.get(c["sector"],0)+1
        self.assertEqual(by_sector,{
            "바이오·제약":20,"소비재·서비스":15,"패션":12,"내 담당 기업":5})
    def test_market_filter(self):
        comps=self.data["companies"]
        self.assertEqual(sum(x["market"]=="미국" for x in comps),47)
        self.assertEqual(sum(x["market"]=="한국" for x in comps),5)
        for c in comps:
            self.assertIn(c["currency"],("USD","KRW"))
            self.assertEqual(c["currency"],"KRW" if c["market"]=="한국" else "USD")
    def test_bio_has_disease_technology_and_kpis(self):
        bios=[x for x in self.data["companies"] if x["sector"]=="바이오·제약"]
        for b in bios:
            self.assertTrue(b.get("disease"))
            self.assertTrue(b.get("technology"))
            self.assertTrue(b.get("kpis"))
            self.assertTrue(b.get("risk"))
        self.assertTrue({"비만·대사","항암","면역·염증"}.issubset(
            {b["disease"] for b in bios}))
    def test_unverified_pipeline_stages_not_presented_as_facts(self):
        for asset in self.assets["records"]:
            self.assertIsNone(asset["stage"])
            self.assertIsNone(asset["clinicalTrialId"])
            self.assertIsNone(asset["verifiedAt"])
            self.assertTrue(asset["link"].startswith("https://clinicaltrials.gov/search?term="))

class RelativeReturnTests(unittest.TestCase):
    def test_no_market_key_yields_no_fake_prices(self):
        obj=perf.make_empty("key_required")
        self.assertEqual(obj["returns"],{})
        self.assertEqual(obj["relative"],{})
        self.assertIsNone(obj["asOf"])
    def test_same_date_baseline_and_percent(self):
        bars={"2026-10-05":100.0,"2026-11-04":112.0}
        self.assertAlmostEqual(perf.performance(bars,"2026-11-04",30),12.0)
    def test_no_reference_price_is_not_zero_return(self):
        bars={"2026-11-04":100.0}
        self.assertIsNone(perf.performance(bars,"2026-11-04",30))
    def test_max_lag_prevents_stale_baseline(self):
        bars={"2026-08-01":98.0,"2026-11-04":105.0}
        self.assertIsNone(perf.performance(bars,"2026-11-04",30))

if __name__=="__main__":
    unittest.main()
