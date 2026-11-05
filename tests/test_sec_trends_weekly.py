"""Offline proof: strict GAAP quarter comparability and evidence-only weekly assembly."""
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import build_sec_trends as sec2
import build_atelier_weekly as weekly

class SECComparableTests(unittest.TestCase):
    def setUp(self):
        self.current={"value":140.0,"usGaapTag":"Revenues",
                      "start":"2026-07-01","end":"2026-09-30"}
        rows=[
            # Exact previous quarter and previous year.
            {"start":"2026-04-01","end":"2026-06-30","val":100.0,
             "filed":"2026-08-01","form":"10-Q","accn":"q2"},
            {"start":"2025-07-01","end":"2025-09-30","val":120.0,
             "filed":"2025-11-01","form":"10-Q","accn":"oldq3"},
            # Nine-month year-to-date value is not a quarter.
            {"start":"2026-01-01","end":"2026-09-30","val":400.0,
             "filed":"2026-11-01","form":"10-Q","accn":"ytd"},
            # Future filed facts are not usable.
            {"start":"2026-04-01","end":"2026-06-30","val":999.0,
             "filed":"2027-01-01","form":"10-Q","accn":"future"}
        ]
        self.facts={"facts":{"us-gaap":{"Revenues":{"units":{"USD":rows}},
                                            "SalesRevenueNet":{"units":{"USD":[
                                                {"start":"2026-04-01","end":"2026-06-30",
                                                 "val":200.0,"filed":"2026-08-01","form":"10-Q"}
                                            ]}}}}}
    def test_previous_quarter_and_yoy(self):
        trend=sec2.metric_trend(self.facts,self.current)
        self.assertEqual(trend["qoq"]["comparison"]["value"],100.0)
        self.assertEqual(trend["qoq"]["percent"],40.0)
        self.assertEqual(trend["yoy"]["comparison"]["value"],120.0)
        self.assertEqual(trend["yoy"]["percent"],16.7)
    def test_no_fabricated_comparison(self):
        self.assertIsNone(sec2.metric_trend({},self.current)["qoq"])
        self.assertIsNone(sec2.metric_trend({},self.current)["yoy"])
    def test_matching_same_gaap_concept(self):
        self.assertEqual(sec2.comparable(self.facts,self.current,(75,115))["usGaapTag"],"Revenues")
    def test_no_growth_rate_from_negative_base(self):
        self.assertIsNone(sec2.compare(50.0,{"value":-2.0}))
        self.assertIsNone(sec2.compare(50.0,{"value":0.0}))
    def test_disallow_old_ytd_and_mismatched_periods(self):
        self.current["start"]="2026-07-21"
        self.assertIsNone(sec2.comparable(self.facts,self.current,(75,115)))
    def test_no_quarter_from_annual_only(self):
        annual={"facts":{"us-gaap":{"Revenues":{"units":{"USD":[
            {"start":"2025-10-01","end":"2026-09-30","val":700,
             "filed":"2026-11-01","form":"10-K"}
        ]}}}}}
        self.assertIsNone(sec2.comparable(annual,self.current,(75,115)))

class WeeklyEvidenceTests(unittest.TestCase):
    def example(self,ticker="UBER",date=None,sector="소비재·서비스"):
        date=date or weekly.END
        return {"ticker":ticker,"filed":date,"periodStart":"2026-07-01",
                "periodEnd":"2026-09-30","url":"https://www.sec.gov/test",
                "metrics":{"revenue":{"value":14000000000,
                           "yoy":{"percent":11.0},"qoq":None}}}
    def test_new_filing_produces_sourced_brief(self):
        item=weekly.make_gaap({"companies":[self.example()]},
             {"UBER":{"sector":"소비재·서비스","focus":"수익화"}},
             {"UBER":{"thesis":"예약액 대비 매출", "metrics":[{"label":"총예약액"}]}})[0]
        self.assertEqual(item["tier"],"공식 공시 · GAAP")
        self.assertIn("11.0%",item["title"])
        self.assertIn("총예약액",item["nextCheck"])
        self.assertEqual(item["sourceLabel"],"SEC 10-Q")
    def test_old_filing_is_not_this_week(self):
        item=self.example(date="2026-03-10")
        self.assertEqual(weekly.make_gaap({"companies":[item]},{},{}),[])
    def test_missing_comparative_is_not_a_growth_claim(self):
        ex=self.example()
        ex["metrics"]["revenue"]["yoy"]=None
        self.assertEqual(weekly.make_gaap({"companies":[ex]},{},{}),[])
    def test_future_clinical_dates_are_not_weekly_changes(self):
        data={"generatedAt":weekly.END+"T00:00:00Z",
              "comparisonTo":weekly.END+"T00:00:00Z",
              "changes":[{"ticker":"BIIB","asset":"lecanemab",
                          "type":"표본에서 새로 포착","nctId":"NCT12345678",
                          "url":"https://clinicaltrials.gov/study/NCT12345678"}],
              "weeklyInterpretation":[{"type":"앞으로 확인할 임상 일정",
                                       "expectedDate":"2027-12-31"}]}
        self.assertEqual(weekly.make_clinical(data),[])
    def test_weekly_ranking_diversifies_sector(self):
        rows=[
           {"id":f"US:{i}","sector":"소비재·서비스","priority":10,"eventDate":weekly.END}
           for i in range(12)]
        rows.append({"id":"F","sector":"패션","priority":2,"eventDate":weekly.END})
        chosen=weekly.select(rows)
        self.assertLessEqual(len(chosen),8)
        self.assertTrue(any(x["sector"]=="패션" for x in chosen))
        self.assertLessEqual(sum(x["sector"]=="소비재·서비스" for x in chosen),4)

if __name__=="__main__":
    unittest.main()
