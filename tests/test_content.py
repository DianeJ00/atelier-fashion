"""Offline guards: no title-only summarization, unsafe URLs or invented figures."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import build_content_brief as news

class ContentSummaryTests(unittest.TestCase):
    def test_only_allowlisted_https_source_urls(self):
        self.assertFalse(news.is_public_allowed("https://news.google.com/rss/articles/foo"))
        self.assertFalse(news.is_public_allowed("http://www.retaildive.com/news/foo"))
        self.assertFalse(news.is_public_allowed("https://127.0.0.1/admin"))
    def test_date_handling(self):
        self.assertEqual(news.date_only("Mon, 02 Nov 2026 12:00:00 GMT"),"2026-11-02")
        self.assertEqual(news.date_only("garbage"),"")
    def test_only_real_brand_matching(self):
        self.assertIn("GAP", news.review_tickers("Old Navy reshuffles women's merchandising"))
        self.assertEqual(news.review_tickers("How AI transforms generic marketing"),[])
    def test_html_body_cannot_be_inferred_from_headline_only(self):
        sample="<html><head><title>Old Navy</title></head><body><article><h1>Old Navy</h1></article></body></html>"
        p=news.ArticleParser()
        p.feed(sample)
        self.assertLess(len(" ".join(p.parts)),30)
    def test_output_schema_requires_grounding_anchor(self):
        self.assertIn("anchor",news.SCHEMA["required"])
        self.assertIn("publish",news.SCHEMA["required"])

if __name__=="__main__":
    unittest.main()
