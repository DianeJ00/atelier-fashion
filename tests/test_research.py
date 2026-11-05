"""Offline guards for quarterly accounting-period and weekly-source integrity."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import collect_official as sec
import build_weekly_brief as brief


class QuarterlyFactTests(unittest.TestCase):
    def setUp(self):
        self.accn = "0000000000-26-000001"
        self.facts = {"facts": {"us-gaap": {
            "RevenueFromContractWithCustomerExcludingAssessedTax": {"units": {"USD": [
                {"accn": self.accn, "form": "10-Q", "filed": "2026-10-28",
                 "start": "2026-07-01", "end": "2026-09-30", "val": 110_000_000, "fy": 2026, "fp": "Q3"},
                {"accn": self.accn, "form": "10-Q", "filed": "2026-10-28",
                 "start": "2025-07-01", "end": "2025-09-30", "val": 100_000_000, "fy": 2026, "fp": "Q3"},
                {"accn": self.accn, "form": "10-Q", "filed": "2026-10-28",
                 "start": "2026-01-01", "end": "2026-09-30", "val": 340_000_000, "fy": 2026, "fp": "Q3"},
                {"accn": "other", "form": "10-Q", "filed": "2026-10-29",
                 "start": "2026-07-01", "end": "2026-09-30", "val": 999_000_000, "fy": 2026, "fp": "Q3"}
            ]}}
        }}}

    def test_same_accn_quarterly_us_gaap(self):
        row = sec.select_metric(self.facts, self.accn, "revenue", "2026-09-30")
        self.assertEqual(row["value"], 110_000_000)
        self.assertEqual(row["start"], "2026-07-01")
        self.assertEqual(row["end"], "2026-09-30")
        self.assertAlmostEqual(row["yoyPercent"], 10.0)

    def test_mismatched_report_end_does_not_fabricate_quarter(self):
        self.assertIsNone(sec.select_metric(self.facts, self.accn, "revenue", "2026-06-30"))

    def test_wrong_accession_rejected(self):
        self.assertIsNone(sec.select_metric(self.facts, "missing", "revenue", "2026-09-30"))


class BriefIntegrityTests(unittest.TestCase):
    def test_no_sources_produce_no_highlights(self):
        self.assertEqual(brief.top3_facts([], {}, [], "2026-10-29"), [])

    def test_new_10k_does_not_get_old_10q_sales(self):
        rows = [{"ticker": "TPR", "officialStatus": "quarter_verified",
                 "officialPeriod": "2026-04-01~2026-06-30", "officialText": "SEC 10-Q 매출 USD 1.0B",
                 "nextCheck": "Coach 성장", "latestReport": {
                     "form": "10-K", "filed": "2026-11-01", "url": "https://www.sec.gov/foo"}}]
        highlights = brief.top3_facts(rows, {}, [], "2026-10-29")
        self.assertEqual(highlights[0]["title"], "SEC 10-K 공시 제출")
        self.assertEqual(highlights[0]["tier"], "공식 공시")

    def test_stock_quote_page_is_not_a_trend(self):
        self.assertFalse(brief.headline_ok({"title": "Some stock price and latest stock news",
                                             "date": "2026-11-04", "url": "https://example.org"}))
        self.assertTrue(brief.headline_ok({"title": "Free People launches denim capsule",
                                            "date": "2026-11-04", "url": "https://example.org"}))


if __name__ == "__main__":
    unittest.main()
