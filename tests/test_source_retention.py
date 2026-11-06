"""2-3B: last good market observations survive outages but not revoked display rights."""
import json
import sys
import tempfile
import unittest
from datetime import datetime,timezone,timedelta
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import source_retention as keep
import collect_market_relative as market
import collect_stock_relative as stock
import validate_release as validator

AT=datetime(2026,11,6,6,tzinfo=timezone.utc)
TRADE="2026-11-04"
RETURNS={"XLK":{"3m":5.2},"XBI":{"3m":8.4},"SPY":{"3m":3.1},
         "QQQ":{"3m":4.3},"XLY":{"3m":6.1},"XRT":{"3m":7.2}}
PERIODS={"3m":"2026-08-04"}
def last_market():
    return {"schemaVersion":1,"status":"ok","generatedAt":"2026-11-05T00:00:00Z",
      "asOf":TRADE,"returns":RETURNS,"relative":{"XBI":{"3m":3.2}},
      "periodDates":PERIODS,"weeklyBreadth":{},"publicDisplayAuthorized":True,
      "lastVerified":{"asOf":TRADE,"verifiedAt":"2026-11-05T00:00:00Z","covered":6}}
def last_stock():
    return {"schemaVersion":1,"status":"partial","generatedAt":"2026-11-05T01:00:00Z",
     "asOf":TRADE,"benchmarkDates":PERIODS,
     "companies":{"LLY":{"asOf":TRADE,"updatedAt":"2026-11-05T00:00:00Z",
                          "returns":{"3m":7.0},"relative":{"XLK":{"3m":1.8}}}},
     "summary":{},"verifiedOnBenchmarkDate":1,"publicDisplayAuthorized":True,
     "lastVerified":{"asOf":TRADE,"verifiedAt":"2026-11-05T01:00:00Z","covered":1}}

class RetentionPolicy(unittest.TestCase):
    def test_provider_outage_retains_licensed_etf_returns_as_stale(self):
        with tempfile.TemporaryDirectory() as td:
            out=Path(td)/"market-relative.json"
            out.write_text(json.dumps(last_market()),encoding="utf-8")
            with patch.object(market,"OUT",out),patch.object(market,"KEY","test"),\
                 patch.object(market,"DISPLAY",True),patch.object(market,"NOW",AT),\
                 patch.object(market,"retrieve",side_effect=OSError("provider offline")),\
                 patch.object(market.time,"sleep",lambda *_:None):
                market.build()
            data=json.loads(out.read_text(encoding="utf-8"))
            self.assertEqual(data["status"],"stale_cached")
            self.assertEqual(data["asOf"],TRADE)
            self.assertEqual(data["returns"],RETURNS)
            self.assertEqual(data["lastVerified"]["verifiedAt"],"2026-11-05T00:00:00Z")
            self.assertEqual(data["lastAttempt"]["status"],"unavailable")
            self.assertEqual(data["lastAttempt"]["errorCount"],6)
            self.assertTrue(data["publicDisplayAuthorized"])
    def test_missing_key_or_display_permission_erases_all_public_figures(self):
        for key,allowed,state in (("test",False,"display_permission_required"),
                                   ("",True,"key_required"),("",False,"key_required")):
            with self.subTest(key=bool(key),display=allowed), tempfile.TemporaryDirectory() as td:
                out=Path(td)/"market-relative.json"
                out.write_text(json.dumps(last_market()),encoding="utf-8")
                with patch.object(market,"OUT",out),patch.object(market,"KEY",key),\
                     patch.object(market,"DISPLAY",allowed),patch.object(market,"NOW",AT):
                    market.build()
                data=json.loads(out.read_text(encoding="utf-8"))
                self.assertEqual(data["status"],state)
                self.assertIsNone(data["asOf"])
                self.assertEqual(data["returns"],{})
                self.assertEqual(data["relative"],{})
                self.assertEqual(data["weeklyBreadth"],{})
                self.assertEqual(data["lastVerified"]["asOf"],TRADE)
                self.assertEqual(data["lastVerified"]["covered"],6)
                self.assertFalse(data["publicDisplayAuthorized"])
                # Repeat: provenance must not disappear on the next unavailable day.
                with patch.object(market,"OUT",out),patch.object(market,"KEY",key),\
                     patch.object(market,"DISPLAY",allowed),patch.object(market,"NOW",AT+timedelta(days=1)):
                    market.build()
                self.assertEqual(json.loads(out.read_text())["lastVerified"]["asOf"],TRADE)
    def test_stock_retains_rows_only_with_matching_authorized_stale_benchmark(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td);path=root/"stock-relative.json";benchmark=root/"market-relative.json"
            path.write_text(json.dumps(last_stock()),encoding="utf-8")
            bench=last_market();bench["status"]="stale_cached"
            benchmark.write_text(json.dumps(bench),encoding="utf-8")
            uni=root/"universe.json"
            uni.write_text(json.dumps({"companies":[{"ticker":"LLY","market":"미국","sector":"바이오·제약"}]}))
            with patch.object(stock,"OUT",path),patch.object(stock,"BENCHMARK",benchmark),\
                 patch.object(stock,"UNIVERSE",uni),patch.object(stock,"NOW",AT),\
                 patch.object(market,"KEY","test"),patch.object(market,"DISPLAY",True):
                stock.main()
            data=json.loads(path.read_text())
            self.assertEqual(data["status"],"stale_cached")
            self.assertEqual(data["asOf"],TRADE)
            self.assertEqual(data["companies"]["LLY"]["returns"]["3m"],7.0)
            self.assertEqual(data["lastAttempt"]["status"],"benchmark_missing")
            # A revoked license clears all published stock figures; metadata survives.
            with patch.object(stock,"OUT",path),patch.object(stock,"BENCHMARK",benchmark),\
                 patch.object(stock,"UNIVERSE",uni),patch.object(stock,"NOW",AT),\
                 patch.object(market,"KEY","test"),patch.object(market,"DISPLAY",False):
                stock.main()
            blocked=json.loads(path.read_text())
            self.assertEqual(blocked["status"],"display_permission_required")
            self.assertEqual(blocked["companies"],{})
            self.assertEqual(blocked["summary"],{})
            self.assertIsNone(blocked["asOf"])
            self.assertEqual(blocked["lastVerified"]["asOf"],TRADE)
            self.assertFalse(blocked["publicDisplayAuthorized"])
    def test_stock_outage_does_not_fake_a_new_verification(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td);path=root/"stock-relative.json";benchmark=root/"market-relative.json"
            path.write_text(json.dumps(last_stock()),encoding="utf-8")
            benchmark.write_text(json.dumps(last_market()),encoding="utf-8")
            uni=root/"universe.json"
            uni.write_text(json.dumps({"companies":[{"ticker":"LLY","market":"미국","sector":"바이오·제약"}]}))
            with patch.object(stock,"OUT",path),patch.object(stock,"BENCHMARK",benchmark),\
                 patch.object(stock,"UNIVERSE",uni),patch.object(stock,"NOW",AT),\
                 patch.object(stock,"MAX_PER_RUN",1),patch.object(stock,"SLEEP_SEC",0),\
                 patch.object(market,"KEY","test"),patch.object(market,"DISPLAY",True),\
                 patch.object(market,"retrieve",side_effect=OSError("outage")):
                stock.main()
            data=json.loads(path.read_text())
            self.assertEqual(data["status"],"partial")
            self.assertEqual(data["updatedThisRun"],0)
            self.assertEqual(data["lastVerified"]["verifiedAt"],"2026-11-05T01:00:00Z")
            self.assertEqual(data["lastAttempt"]["status"],"previous_verified_only")
            self.assertEqual(data["companies"]["LLY"]["asOf"],TRADE)
    def test_atomic_write_never_truncates_prior_file_on_replace_failure(self):
        with tempfile.TemporaryDirectory() as td:
            out=Path(td)/"market.json"
            out.write_text('{"status":"ok"}\n',encoding="utf-8")
            with patch.object(keep.os,"replace",side_effect=OSError("disk full")):
                with self.assertRaises(OSError):
                    keep.atomic_write(out,{"status":"bad"})
            self.assertEqual(out.read_text(encoding="utf-8"),'{"status":"ok"}\n')
            self.assertEqual(len(list(Path(td).iterdir())),1)
    def test_release_gate_rejects_unlicensed_quotes_or_stale_mismatch(self):
        records,errors=validator.read_data(ROOT)
        self.assertEqual(errors,[])
        records["market-relative.json"]=last_market()
        records["stock-relative.json"]={"status":"key_required","asOf":None,
            "companies":{},"summary":{},"verifiedOnBenchmarkDate":0,
            "publicDisplayAuthorized":False}
        self.assertFalse(any("market:" in x or "stocks:" in x for x in validator.validate(records)))
        records["market-relative.json"]["status"]="display_permission_required"
        records["market-relative.json"]["publicDisplayAuthorized"]=False
        self.assertTrue(any("market:" in x for x in validator.validate(records)))
        records["market-relative.json"]["status"]="stale_cached"
        records["market-relative.json"]["publicDisplayAuthorized"]=True
        records["market-relative.json"]["lastAttempt"]={"status":"unavailable","at":"2026-11-06"}
        records["market-relative.json"]["asOf"]="2026-11-03"
        self.assertTrue(any("stale asOf" in x for x in validator.validate(records)))

if __name__=="__main__":unittest.main()
