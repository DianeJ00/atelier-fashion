"""No DART key is needed for accounting-period parsing and issuer safeguards."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import collect_korea_dart as kr

class OfficialDARTTests(unittest.TestCase):
    def test_amount_and_missing_data(self):
        self.assertEqual(kr.amount("1,234,567"),1234567)
        self.assertEqual(kr.amount("-1,230"),-1230)
        self.assertIsNone(kr.amount("-"))
        self.assertIsNone(kr.amount(""))
    def test_income_statement_requires_standard_xbrl(self):
        rows=[
            {"sj_div":"IS","account_id":"ifrs-full_Revenue","account_detail":"-",
             "thstrm_amount":"3,400,000,000","frmtrm_q_amount":"2,900,000,000"},
            {"sj_div":"BS","account_id":"ifrs-full_ProfitLoss","account_detail":"-",
             "thstrm_amount":"9,999,999,999"},
            {"sj_div":"IS","account_id":"ifrs-full_ProfitLoss","account_detail":"-",
             "thstrm_amount":"1,300,000,000","frmtrm_q_amount":""}
        ]
        result=kr.extract(rows)
        self.assertEqual(result["매출액"]["currentKRW"],3400000000)
        self.assertEqual(result["당기순이익"]["currentKRW"],1300000000)
        self.assertIsNone(result["당기순이익"]["priorYearQuarterKRW"])
        self.assertNotIn("영업이익",result)
    def test_filing_selection_uses_received_date_not_future_label(self):
        sample={
          "status":"000","list":[
            {"report_nm":"분기보고서 (2026.09)","rcept_dt":"20261105","rcept_no":"20261105000001"},
            {"report_nm":"반기보고서 (2026.06)","rcept_dt":"20260819","rcept_no":"20260819000111"},
            {"report_nm":"사업보고서 (2025.12)","rcept_dt":"20260319","rcept_no":"20260319000001"}
          ]
        }
        with patch.object(kr,"fetch",return_value=sample):
            found=kr.latest("00000001")
        self.assertEqual(found["reportCode"],"11014")
        self.assertEqual(found["year"],"2026")
        self.assertTrue(found["url"].startswith("https://dart.fss.or.kr/"))
    def test_all_five_prior_companies_are_distinct(self):
        import json
        d=json.loads((ROOT/"research-universe.json").read_text(encoding="utf-8"))
        codes=[x["ticker"] for x in d["companies"] if x["market"]=="한국"]
        self.assertEqual(len(codes),5)
        self.assertEqual(len(set(codes)),5)
    def test_no_secret_in_public_json(self):
        import json
        row=json.loads((ROOT/"korea-dart.json").read_text(encoding="utf-8"))
        self.assertNotIn("crtfc_key",json.dumps(row).lower())
        self.assertEqual(row["count"],5)

if __name__=="__main__":unittest.main()
