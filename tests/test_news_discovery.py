"""Cross-sector RSS discovery: no ticker alias accidents and no provider calls."""
import json
import sys
import tempfile
import unittest
from datetime import date,datetime,timedelta,timezone
from pathlib import Path
from email.utils import format_datetime
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import news_discovery as d
import collect_weekly as collector

class CompanyNewsDiscoveryTests(unittest.TestCase):
    def test_all_nonfashion_issuers_mapped_and_distributed(self):
        universe=json.loads((ROOT/"research-universe.json").read_text(encoding="utf-8"))["companies"]
        self.assertTrue(d.confirm_universe(universe))
        self.assertEqual(len(d.SPECS),40)
        self.assertEqual(sum(spec[1]=="바이오·제약" for spec in d.SPECS.values()),20)
        self.assertEqual(sum(spec[1]=="소비재·서비스" for spec in d.SPECS.values()),15)
        self.assertEqual(sum(spec[1]=="내 담당 기업" for spec in d.SPECS.values()),5)
        self.assertEqual({spec[0] for spec in d.SPECS.values()},{"미국","한국"})
        start=date(2026,11,10)
        seen=set()
        for n in range(4):
            today=d.company_specs_for(start+timedelta(days=n))
            self.assertEqual(len(today),12)
            self.assertEqual(len(set(x for x,_ in today)),12)
            self.assertEqual(sum(spec[1]=="바이오·제약" for _,spec in today),6)
            self.assertEqual(sum(spec[1]=="소비재·서비스" for _,spec in today),4)
            self.assertEqual(sum(spec[1]=="내 담당 기업" for _,spec in today),2)
            seen.update(x for x,_ in today)
        self.assertEqual(seen,set(d.SPECS))

    def test_no_homonym_or_contextless_stock_matches(self):
        for ticker,title in [
            ("MRK","Merck KGaA expands semiconductor business"),
            ("MRK","Merck acquires factory in Germany"),
            ("TGT","Police target shooting range"),
            ("TGT","The target price for an unrelated company rises"),
            ("CAVA","Spanish cava wine exports gain"),
            ("RH","RH negative blood type discoveries"),
            ("ELF","The Lord of the Rings: Elf New Season"),
            ("LLY","Lily announces a new drug"),
            ("BKNG","Booking tables at restaurants online"),
            ("950260","인제니어링 기술 기업 혁신"),
            ("105560","KB 부동산 가격 상승"),
            ("278470","APR interest rate changes"),
        ]:
            with self.subTest(ticker=ticker,title=title):
                self.assertFalse(d.title_matches(ticker,title))
        for ticker,title in [
            ("MRK","Merck & Co reports Keytruda sales"),
            ("TGT","Target stores report higher retail sales"),
            ("CAVA","Cava restaurant chain opens new locations"),
            ("RH","RH luxury furniture retailer lifts guidance"),
            ("LLY","Eli Lilly reports obesity drug results"),
            ("BKNG","Booking Holdings earnings rise"),
            ("950260","인제니아테라퓨틱스 신약 임상 발표"),
            ("278470","에이피알 메디큐브 실적 상승"),
            ("003230","삼양식품 신규 공장 가동"),
            ("105560","KB금융 3분기 실적 발표"),
            ("005830","DB손해보험 자동차보험 손해율 상승"),
        ]:
            with self.subTest(ticker=ticker,title=title):
                self.assertTrue(d.title_matches(ticker,title))

    def test_rss_title_and_publisher_are_not_confused(self):
        current=datetime.now(timezone.utc).replace(microsecond=0)
        p=format_datetime(current)
        feed=(
            "<rss><channel>"
            "<item><title>How to calculate a target price - Target Corporation</title>"
            "<source>Target Corporation</source><link>https://news.google.com/rss/articles/fake1</link>"
            f"<pubDate>{p}</pubDate></item>"
            "<item><title>Target stores announce new retail sales plan - Reuters</title>"
            "<source>Reuters</source><link>https://news.google.com/rss/articles/true2</link>"
            f"<pubDate>{p}</pubDate></item>"
            "</channel></rss>"
        ).encode("utf-8")
        with patch.object(collector,"get",return_value=feed) as get:
            rows=collector.news("TGT",d.SPECS["TGT"][2],strict=True)
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]["ticker"],"TGT")
        self.assertEqual(rows[0]["issuerId"],"US:TGT")
        self.assertEqual(rows[0]["creator"],"Reuters")
        self.assertEqual(rows[0]["reviewStatus"],"needs_review")
        self.assertIn("gl=US",get.call_args.args[0])
        self.assertTrue(rows[0]["url"].startswith("https://news.google.com/rss/"))
        with patch.object(collector,"get",return_value=(
            "<rss><channel><item><title>삼양식품 3분기 매출 급증</title>"
            "<link>https://news.google.com/rss/articles/kr1</link>"
            f"<pubDate>{p}</pubDate><source>연합뉴스</source></item></channel></rss>"
        ).encode("utf-8")) as get:
            korean=collector.news("003230",d.SPECS["003230"][2],strict=True)
        self.assertEqual(korean[0]["issuerId"],"KR:003230")
        self.assertIn("ceid=KR%3Ako",get.call_args.args[0])

    def test_main_rotates_and_preserves_only_recent_dated_issuer_links(self):
        universe=json.loads((ROOT/"research-universe.json").read_text(encoding="utf-8"))
        start=date(2026,11,10)
        with tempfile.TemporaryDirectory() as dtmp:
            out=Path(dtmp)/"weekly-research.json"
            counter={"calls":0}
            def fake_news(ticker,query,*,strict=False):
                if not strict:return []
                counter["calls"]+=1
                now=collector.NOW.date().isoformat()
                spec=d.SPECS[ticker]
                title=(spec[3][0] + " records company earnings")
                if spec[0]=="한국":title=spec[3][0]+" 신제품 실적 발표"
                return [{
                    "id":"rss-synthetic-"+ticker,"title":title,
                    "url":"https://news.google.com/rss/articles/"+ticker,
                    "date":now+"T00:00:00Z","platform":"Google News",
                    "ticker":ticker,"issuerId":d.issuer_id(ticker),
                    "brand":"","creator":"가상 뉴스 제공사",
                    "source":"Google News RSS (원문 확인 전)",
                    "topic":"기업 실적","reviewStatus":"needs_review",
                    "discoveryMethod":"dated_rss_title_issuer_match",
                }]
            with patch.object(collector,"OUT",out),patch.object(collector,"news",side_effect=fake_news),\
                 patch.object(collector,"youtube",return_value=[]),\
                 patch.object(collector,"ROOT",ROOT):
                for n in range(4):
                    now=datetime.combine(start+timedelta(days=n),datetime.min.time(),tzinfo=timezone.utc)
                    with patch.object(collector,"NOW",now),\
                         patch.object(collector,"START",now-timedelta(days=8)):
                        collector.main()
                        doc=json.loads(out.read_text(encoding="utf-8"))
                        cov=doc["newsCoverage"]
                        self.assertEqual(cov["scheduledToday"],12)
                        self.assertEqual(cov["succeededToday"],12)
                        self.assertEqual(cov["failedToday"],0)
                        scheduled_union={
                            t for dstep in range(n+1)
                            for t,_ in d.company_specs_for(start+timedelta(days=dstep))
                        }
                        self.assertEqual(len(doc["items"]),len(scheduled_union))
                        self.assertEqual(cov["tracked"],40)
                        self.assertTrue(all(x["reviewStatus"]=="needs_review" for x in doc["items"]))
                        self.assertTrue(all(x.get("issuerId") in (set("US:"+k for k in d.SPECS if d.SPECS[k][0]=="미국")|
                                                                   set("KR:"+k for k in d.SPECS if d.SPECS[k][0]=="한국")) for x in doc["items"]))
                self.assertEqual(counter["calls"],48)
                self.assertEqual(len({x["ticker"] for x in doc["items"]}),40)
                self.assertTrue(any(x.get("carriedOver") is True for x in doc["items"]))
                self.assertTrue(all(x["date"][:10]<=doc["periodEnd"] for x in doc["items"]))
                # Advance 12 days: old articles must expire, not masquerade as new.
                now=datetime.combine(start+timedelta(days=12),datetime.min.time(),tzinfo=timezone.utc)
                with patch.object(collector,"NOW",now),patch.object(collector,"START",now-timedelta(days=8)):
                    collector.main()
                    fresh=json.loads(out.read_text(encoding="utf-8"))
                    self.assertTrue(all(x["date"][:10]>=fresh["periodStart"] for x in fresh["items"]))
                    self.assertEqual(fresh["newsCoverage"]["scheduledToday"],12)

if __name__=="__main__":
    unittest.main()
