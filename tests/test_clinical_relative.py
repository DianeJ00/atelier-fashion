"""Offline reliability checks for registered trials and aligned equity returns."""
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import collect_clinical_trials as trials
import collect_stock_relative as stocks
import collect_market_relative as etfs

class ClinicalTrialTests(unittest.TestCase):
    def study(self, name="Tirzepatide", sponsor="Eli Lilly and Company"):
        return {
            "protocolSection": {
                "identificationModule": {
                    "nctId": "NCT01234567",
                    "briefTitle": "A study of tirzepatide in diabetes"
                },
                "statusModule":{
                    "overallStatus":"RECRUITING",
                    "startDateStruct":{"date":"2025-10-01","type":"ACTUAL"},
                    "primaryCompletionDateStruct":{"date":"2027-06","type":"ESTIMATED"},
                    "studyLastUpdatePostDateStruct":{"date":"2026-11-01"}
                },
                "designModule":{"phases":["PHASE3"]},
                "sponsorCollaboratorsModule":{"leadSponsor":{"name":sponsor}},
                "conditionsModule":{"conditions":["Diabetes Mellitus"]},
                "armsInterventionsModule":{"interventions":[{"type":"DRUG","name":name}]},
                "outcomesModule":{"primaryOutcomes":[{"measure":"HbA1c change"}]}
            },
            "hasResults":False
        }
    def test_official_intervention_sponsor_double_match(self):
        row=trials.parse_trial(self.study(),"tirzepatide","LLY")
        self.assertEqual(row["nctId"],"NCT01234567")
        self.assertEqual(row["statusKr"],"모집 중")
        self.assertEqual(row["primaryCompletion"]["type"],"ESTIMATED")
        self.assertEqual(row["lastUpdatePost"],"2026-11-01")
        self.assertFalse(row["hasResultsPosted"])
    def test_no_link_by_title_alone(self):
        self.assertIsNone(trials.parse_trial(self.study(name="placebo"),"tirzepatide","LLY"))
    def test_no_incorrect_corporate_attribution(self):
        self.assertIsNone(trials.parse_trial(self.study(sponsor="Independent University"),"tirzepatide","LLY"))
    def test_alias_match_still_requires_sponsor(self):
        self.assertIsNotNone(trials.parse_trial(self.study(name="LY3298176"),"tirzepatide","LLY"))
    def test_bad_id_not_valid(self):
        x=self.study()
        x["protocolSection"]["identificationModule"]["nctId"]="not-an-nct"
        self.assertIsNone(trials.parse_trial(x,"tirzepatide","LLY"))
    def test_registry_seeds_unchanged(self):
        src=json.loads((ROOT/"research-pipeline.json").read_text(encoding="utf-8"))
        self.assertEqual(len(src["records"]),12)
        self.assertTrue(all(x["stage"] is None for x in src["records"]))

class StockRelativeTests(unittest.TestCase):
    def benchmark(self):
        return {
            "asOf":"2026-11-04",
            "periodDates":{"1m":"2026-10-05"},
            "returns":{
                "XLK":{"1m":5.0},"SPY":{"1m":3.0},"QQQ":{"1m":4.0}
            }
        }
    def test_exact_date_relative_stock(self):
        bars={"2026-10-05":100.0,"2026-11-04":112.0}
        r=stocks.compute_single(bars,self.benchmark())
        self.assertEqual(r["returns"]["1m"],12.0)
        self.assertEqual(r["relative"]["XLK"]["1m"],7.0)
        self.assertEqual(r["relative"]["SPY"]["1m"],9.0)
        self.assertEqual(r["relative"]["QQQ"]["1m"],8.0)
    def test_missing_anchor_never_fake(self):
        self.assertIsNone(stocks.compute_single({"2026-10-05":100.0},self.benchmark()))
    def test_missing_period_baseline_is_none(self):
        r=stocks.compute_single({"2026-11-04":112.0},self.benchmark())
        self.assertIsNone(r["returns"]["1m"])
        self.assertIsNone(r["relative"]["XLK"]["1m"])
    def test_equal_weighted_requires_80_percent_coverage(self):
        universe=[{"ticker":"A","sector":"바이오·제약","market":"미국"},
                  {"ticker":"B","sector":"바이오·제약","market":"미국"},
                  {"ticker":"C","sector":"바이오·제약","market":"미국"},
                  {"ticker":"D","sector":"바이오·제약","market":"미국"},
                  {"ticker":"E","sector":"바이오·제약","market":"미국"}]
        rows={"_benchmarkAsOf":"2026-11-04"}
        for i in range(3):
            rows[universe[i]["ticker"]]={"asOf":"2026-11-04",
                "returns":{"1m":i+1.0},"relative":{"XLK":{"1m":i-1.0}}}
        report=stocks.summarize(rows,universe)
        self.assertFalse(report["바이오·제약"]["1m"]["ready"])
        self.assertIsNone(report["바이오·제약"]["1m"]["equalWeightedReturn"])
        rows["D"]={"asOf":"2026-11-04",
                    "returns":{"1m":4.0},"relative":{"XLK":{"1m":2.0}}}
        report=stocks.summarize(rows,universe)
        self.assertTrue(report["바이오·제약"]["1m"]["ready"])
        self.assertEqual(report["바이오·제약"]["1m"]["count"],4)
        self.assertEqual(report["바이오·제약"]["1m"]["aboveBenchmarkCount"],2)
        self.assertEqual(report["바이오·제약"]["1m"]["equalWeightedReturn"],2.5)
    def test_stale_stock_cannot_enter_current_breadth(self):
        university=[{"ticker":"A","sector":"패션","market":"미국"}]
        rows={"_benchmarkAsOf":"2026-11-04","A":{
            "asOf":"2026-10-30","returns":{"3m":30.0},
            "relative":{"XLK":{"3m":40.0}}}}
        result=stocks.summarize(rows,university)
        self.assertEqual(result["패션"]["3m"]["count"],0)
        self.assertIsNone(result["패션"]["3m"]["equalWeightedReturn"])

if __name__=="__main__":
    unittest.main()
