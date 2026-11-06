"""Checks the independent daily source freshness guard without network calls."""
import sys,unittest
from datetime import datetime,timezone,timedelta
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
import check_daily_freshness as guard

UTC=timezone.utc
AT=datetime(2026,11,6,2,10,tzinfo=UTC)
def example(at=AT):
    s=at.isoformat()
    return {"generatedAt":s,
            "items":[{"id":name,"status":"live","covered":12,"checkedAt":s}
                     for name in guard.CRITICAL]}

class DailyFreshnessTest(unittest.TestCase):
    def test_same_day_is_accepted_without_market_license(self):
        self.assertEqual(guard.issues(example(),AT),[])
    def test_yesterday_refresh_is_flagged(self):
        d=example(AT-timedelta(days=1))
        self.assertTrue(any("오늘" in x for x in guard.issues(d,AT)))
    def test_missing_critical_source_does_not_pass(self):
        d=example()
        d["items"][0]["status"]="blocked"
        self.assertTrue(any("fashion_sec" in x for x in guard.issues(d,AT)))
    def test_missing_check_timestamp_does_not_pass(self):
        d=example()
        del d["items"][1]["checkedAt"]
        self.assertTrue(any("consumer_sec" in x and "확인" in x for x in guard.issues(d,AT)))
    def test_optional_market_and_dart_are_not_required(self):
        d=example()
        d["items"].append({"id":"market","status":"blocked","covered":0})
        self.assertEqual(guard.issues(d,AT),[])

if __name__=="__main__":unittest.main()
