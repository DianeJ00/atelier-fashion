"""2-3E fault injection: invalid new release must not overwrite last good Pages output."""
from __future__ import annotations
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import validate_release as release
import prepare_site

class FailedRefreshRecovery(unittest.TestCase):
    def setUp(self):
        self.sandbox=tempfile.TemporaryDirectory()
        self.addCleanup(self.sandbox.cleanup)
        self.path=Path(self.sandbox.name)
        self.source=self.path/"source"
        self.source.mkdir()
        for name in (*release.DATA_FILES,"research-pipeline-seed.json",
                     *prepare_site.JS_CSS,"index.html"):
            shutil.copy2(ROOT/name,self.source/name)
        self.original_manifest=release.write_manifest(self.source)
        self.site=prepare_site.prepare(self.source,self.path/"site")
        self.site_manifest=(self.site/"data-manifest.json").read_bytes()
        self.original_release=self.original_manifest["releaseId"]

    def test_invalid_issuer_candidate_cannot_replace_last_successful_site(self):
        path=self.source/"research-universe.json"
        original=path.read_bytes()
        bad=json.loads(original)
        bad["companies"][0]["id"]="US:WRONG"
        path.write_text(json.dumps(bad,ensure_ascii=False),encoding="utf-8")
        with self.assertRaises(ValueError):
            release.write_manifest(self.source)
        with self.assertRaises(ValueError):
            prepare_site.prepare(self.source,self.site)
        self.assertEqual((self.site/"data-manifest.json").read_bytes(),self.site_manifest)
        self.assertTrue((self.site/"releases"/self.original_release/"research-universe.json").is_file())
        # Roll back the bad candidate, not the deployed site.
        path.write_bytes(original)
        recovered=release.check_manifest(self.source)
        self.assertEqual(recovered["releaseId"],self.original_release)
        self.assertEqual(release.check_site(self.site,self.source)["releaseId"],self.original_release)

    def test_valid_json_tamper_detected_before_publish(self):
        path=self.source/"market-reviewed.json"
        previous=path.read_bytes()
        path.write_bytes(previous+b"\n")
        with self.assertRaisesRegex(ValueError,"mismatch|hashes|releaseId"):
            release.check_manifest(self.source)
        with self.assertRaisesRegex(ValueError,"mismatch|hashes|releaseId"):
            prepare_site.prepare(self.source,self.site)
        self.assertEqual((self.site/"data-manifest.json").read_bytes(),self.site_manifest)
        path.write_bytes(previous)
        self.assertEqual(release.check_site(self.site,self.source)["releaseId"],self.original_release)

    def test_pinned_snapshot_survives_freshness_status_changes(self):
        old=self.site_manifest
        result=release.check_site(self.site,self.source)
        self.assertEqual(result["releaseId"],self.original_release)
        self.assertEqual((self.site/"data-manifest.json").read_bytes(),old)

if __name__=="__main__":unittest.main()
