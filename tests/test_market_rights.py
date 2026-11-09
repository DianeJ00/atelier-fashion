"""Rights expiry and redaction are independent of an API key's validity."""
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/"scripts"))
import market_rights

TODAY = datetime(2026, 11, 9, 6, 0, tzinfo=timezone.utc)
def granted():
    return {
        "MARKET_DERIVED_PUBLIC_OK":"true",
        "MARKET_DERIVED_GIT_STORAGE_OK":"true",
        "MARKET_DERIVED_LICENSE_REF":"internal-approval-2026A",
        "MARKET_DERIVED_LICENSE_SCOPE":market_rights.SCOPE,
        "MARKET_DERIVED_LICENSE_VALID_FROM":"2026-11-01",
        "MARKET_DERIVED_LICENSE_VALID_UNTIL":"2027-10-31",
    }

class RightsPreflightTests(unittest.TestCase):
    def check(self, env=None, display=True, key=True, today=TODAY):
        return market_rights.assess(has_key=key, display=display,
                                    environ=granted() if env is None else env,
                                    now=today)

    def test_signed_operator_grant_allows_only_active_scope(self):
        self.assertEqual(self.check()["reason"], "operator_attested_active_grant")
        self.assertTrue(self.check()["approved"])
        self.assertFalse(self.check(key=False)["approved"])
        self.assertFalse(self.check(display=False)["approved"])

    def test_flags_alone_do_not_turn_on_live_price_alerts(self):
        self.assertEqual(self.check({"MARKET_DERIVED_PUBLIC_OK":"true",
                                     "MARKET_DERIVED_GIT_STORAGE_OK":"true"})["reason"],
                         "written_grant_reference_missing")
        for key, failure in (
            ("MARKET_DERIVED_PUBLIC_OK", "derived_public_unapproved"),
            ("MARKET_DERIVED_GIT_STORAGE_OK", "derived_git_unapproved"),
            ("MARKET_DERIVED_LICENSE_SCOPE", "license_scope_unconfirmed"),
            ("MARKET_DERIVED_LICENSE_VALID_UNTIL", "license_dates_invalid"),
        ):
            with self.subTest(key=key):
                env=granted()
                env.pop(key)
                self.assertEqual(self.check(env)["reason"],failure)

    def test_grant_expires_and_review_becomes_overdue(self):
        env=granted()
        self.assertEqual(self.check(env,today=datetime(2028,1,1,tzinfo=timezone.utc))["reason"],
                         "license_expired")
        env["MARKET_DERIVED_LICENSE_VALID_UNTIL"]="2029-12-31"
        self.assertEqual(self.check(env,today=datetime(2027,12,2,tzinfo=timezone.utc))["reason"],
                         "license_review_overdue")
        env["MARKET_DERIVED_LICENSE_VALID_FROM"]="2026-12-01"
        self.assertEqual(self.check(env)["reason"],"license_not_yet_valid")

    def test_invalid_dates_cannot_enable(self):
        for value in ("2027-02-30","2027/02/28","2027-1-02",""):
            with self.subTest(value=value):
                env=granted()
                env["MARKET_DERIVED_LICENSE_VALID_UNTIL"]=value
                self.assertFalse(self.check(env)["approved"])

    def test_no_reference_or_key_leaks_into_status(self):
        env=granted()
        result=self.check(env)
        self.assertNotIn(env["MARKET_DERIVED_LICENSE_REF"],repr(result))
        self.assertNotIn("TWELVEDATA_API_KEY",repr(result))
        with patch.dict("os.environ",{
            "TWELVEDATA_API_KEY":"secret-sensitive-key",
            "MARKET_DATA_DISPLAY_OK":"true",
            **env,
        }, clear=True):
            from io import StringIO
            with patch("sys.stdout",new_callable=StringIO) as capture:
                self.assertEqual(market_rights.main(),0)
            self.assertNotIn("secret-sensitive-key",capture.getvalue())
            self.assertNotIn(env["MARKET_DERIVED_LICENSE_REF"],capture.getvalue())

    def test_workflow_requires_rights_scope_and_secret_ref(self):
        workflow=(ROOT/".github/workflows/weekly-research.yml").read_text(encoding="utf-8")
        self.assertIn("python scripts/market_rights.py",workflow)
        self.assertIn("MARKET_DERIVED_LICENSE_REF: ${{ secrets.MARKET_DERIVED_LICENSE_REF }}",workflow)
        self.assertIn("MARKET_DERIVED_LICENSE_VALID_UNTIL:",workflow)
        self.assertIn("MARKET_DERIVED_LICENSE_SCOPE:",workflow)
        collector=(ROOT/"scripts/collect_stock_relative.py").read_text(encoding="utf-8")
        self.assertIn("event_feed.licensed(market.KEY,market.DISPLAY,now=NOW)",collector)

    def test_no_timezone_naive_datetime(self):
        with self.assertRaises(ValueError):
            self.check(today=datetime(2026,11,9))

if __name__=="__main__":
    unittest.main()
