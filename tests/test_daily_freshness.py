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

class ScheduledRunTest(unittest.TestCase):
    def test_successful_schedule_is_required(self):
        run={"event":"schedule","created_at":"2026-11-06T00:01:00Z",
             "status":"completed","conclusion":"success"}
        self.assertEqual(guard.schedule_issues([run],AT),[])
    def test_manual_push_does_not_count_as_daily_schedule(self):
        push={"event":"push","created_at":"2026-11-06T00:01:00Z",
              "status":"completed","conclusion":"success"}
        self.assertTrue(guard.schedule_issues([push],AT))
    def test_failed_schedule_does_not_pass(self):
        bad={"event":"schedule","created_at":"2026-11-06T00:02:00Z",
             "status":"completed","conclusion":"failure"}
        self.assertTrue(guard.schedule_issues([bad],AT))
    def test_yesterday_success_is_not_todays_schedule(self):
        old={"event":"schedule","created_at":"2026-11-05T00:01:00Z",
             "status":"completed","conclusion":"success"}
        self.assertTrue(guard.schedule_issues([old],AT))
    def test_latest_attempt_is_authoritative(self):
        old={"event":"schedule","created_at":"2026-11-06T00:01:00Z",
             "status":"completed","conclusion":"success"}
        failed={"event":"schedule","created_at":"2026-11-06T01:01:00Z",
                "status":"completed","conclusion":"failure"}
        self.assertTrue(guard.schedule_issues([old,failed],AT))


if __name__=="__main__":unittest.main()
