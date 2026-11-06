"""SEC client: offline cache, official registry, bounded retries and guardrails."""
import io
import sys
import tempfile
import unittest
from pathlib import Path
from urllib.error import HTTPError

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import sec_client

AGENT="ATELIER research contact@example.com"
URL="https://www.sec.gov/files/company_tickers.json"

class Response:
    def __init__(self, body): self.body=body
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def read(self): return self.body

class SECClientTests(unittest.TestCase):
    def test_official_registry_mapping_and_invalid_ciks(self):
        raw={"0":{"ticker":"abc","cik_str":123},"1":{"ticker":"DEF","cik_str":"456"},
             "2":{"ticker":"bad","cik_str":"not a number"}}
        self.assertEqual(sec_client.ticker_ciks(raw),{"ABC":123,"DEF":456})
    def test_disallows_non_sec_hosts_and_anonymous_access(self):
        with self.assertRaises(ValueError):
            sec_client.get_json("https://example.com/path",AGENT)
        with self.assertRaises(ValueError):
            sec_client.get_json(URL,"")
    def test_successful_response_is_cached_for_one_run(self):
        calls=[]
        def opener(req,timeout):
            calls.append(req.full_url)
            self.assertEqual(timeout,18)
            return Response(b'{"0":{"ticker":"ABC","cik_str":123}}')
        with tempfile.TemporaryDirectory() as temp:
            d=Path(temp)
            self.assertIn("0",sec_client.get_json(URL,AGENT,cache_dir=d,opener=opener))
            self.assertIn("0",sec_client.get_json(URL,AGENT,cache_dir=d,opener=opener))
            self.assertEqual(len(calls),1)
            # Removing the existing entry must fetch again instead of silently using old data.
            for p in d.iterdir():p.unlink()
            sec_client.get_json(URL,AGENT,cache_dir=d,opener=opener)
            self.assertEqual(len(calls),2)
    def test_transient_429_retries_but_permanent_403_fails(self):
        calls=[], 
        # Use a list instead of network access.
        retries=[]
        attempts=[]
        def opener(req,timeout):
            attempts.append(1)
            if len(attempts)==1:
                raise HTTPError(URL,429,"rate limited",{},io.BytesIO(b""))
            return Response(b'{"status":"ok"}')
        with tempfile.TemporaryDirectory() as temp:
            value=sec_client.get_json(URL,AGENT,cache_dir=temp,opener=opener,
                                      sleeper=retries.append)
        self.assertEqual(value["status"],"ok")
        self.assertEqual(len(attempts),2)
        self.assertEqual(retries,[1.0])
        def forbidden(req,timeout):
            raise HTTPError(URL,403,"forbidden",{},io.BytesIO(b""))
        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaises(HTTPError):
                sec_client.get_json(URL,AGENT,cache_dir=temp,opener=forbidden,
                                    sleeper=lambda *_:self.fail("403 must not retry"))
    def test_invalid_json_is_not_cached(self):
        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaises(ValueError):
                sec_client.get_json(URL,AGENT,cache_dir=temp,
                                    opener=lambda req,timeout:Response(b"<html>not JSON</html>"))
            self.assertEqual(list(Path(temp).iterdir()),[])

if __name__=="__main__":unittest.main()
