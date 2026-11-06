"""ATELIER 2-3A: source integrity, reporting dates and fail-closed Pages releases."""
from __future__ import annotations
import copy
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import validate_release as v
import prepare_site

class ReleaseGateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.records,cls.issues=v.read_data(ROOT)

    def test_current_release_sources_pass_structural_audit(self):
        self.assertEqual(self.issues,[])
        self.assertEqual(v.validate(self.records),[])
        manifest=v.build_manifest(ROOT)
        self.assertEqual(len(manifest["dataFiles"]),len(v.DATA_FILES))
        self.assertRegex(manifest["releaseId"],r"^[a-f0-9]{20}$")

    def test_wrong_issuer_id_rejected(self):
        data=copy.deepcopy(self.records)
        data["research-universe.json"]["companies"][0]["id"]="US:NOTREAL"
        self.assertTrue(any("issuer ID" in x for x in v.validate(data)))

    def test_bad_quarter_dates_rejected(self):
        data=copy.deepcopy(self.records)
        row=data["official-financials.json"]["companies"][0]
        row["status"]="quarter_verified"
        row["quarter"]["periodEnd"]="2027-12-31"
        self.assertTrue(any("reporting period" in x for x in v.validate(data)))

    def test_unlicensed_prices_cannot_be_mislabeled(self):
        data=copy.deepcopy(self.records)
        data["market-relative.json"]["status"]="key_required"
        data["market-relative.json"]["asOf"]="2026-11-06"
        data["market-relative.json"]["returns"]={"XLK":{"1d":5}}
        self.assertTrue(any(x.startswith("market:") and ("blocked" in x or "prices" in x) for x in v.validate(data)))

    def test_stock_and_benchmark_dates_must_match(self):
        data=copy.deepcopy(self.records)
        data["market-relative.json"].update({"status":"ok","asOf":"2026-11-06","returns":{"XLK":{"3m":5}}})
        data["stock-relative.json"].update({"status":"partial","asOf":"2026-11-05"})
        self.assertTrue(any("benchmark and stock" in x for x in v.validate(data)))

    def test_manifest_detects_tamper_and_pins_site(self):
        with tempfile.TemporaryDirectory() as temp:
            base=Path(temp)
            source=base/"source"
            source.mkdir()
            for name in (*v.DATA_FILES, "research-pipeline-seed.json"):
                shutil.copy2(ROOT/name,source/name)
            for name in (*prepare_site.JS_CSS,"index.html"):
                shutil.copy2(ROOT/name,source/name)
            manifest=v.write_manifest(source)
            self.assertEqual(v.check_manifest(source)["releaseId"],manifest["releaseId"])
            site=prepare_site.prepare(source,base/"site")
            self.assertEqual(v.check_site(site,source)["releaseId"],manifest["releaseId"])
            html=(site/"index.html").read_text(encoding="utf-8")
            self.assertIn('window.ATELIER_RELEASE_ID="'+manifest["releaseId"]+'"',html)
            build=v.site_version(source,manifest)
            self.assertIn('window.ATELIER_BUILD_ID="'+build["buildId"]+'"',html)
            self.assertEqual(json.loads((site/"site-version.json").read_text()),build)
            # Code-only changes must invalidate an open tab even if price data is unchanged.
            code_path=source/"research2.js"
            original_code=code_path.read_bytes()
            code_path.write_bytes(original_code+b"\n// code-only update\n")
            new_build=v.site_version(source,manifest)
            self.assertNotEqual(new_build["buildId"],build["buildId"])
            with self.assertRaisesRegex(ValueError,"build version mismatch"):
                v.check_site(site,source)
            code_path.write_bytes(original_code)
            self.assertTrue((site/"releases"/manifest["releaseId"]/"research-universe.json").is_file())
            # A valid-JSON modification after signing must fail the immutable release check.
            target=site/"releases"/manifest["releaseId"]/"research-universe.json"
            target.write_bytes(target.read_bytes()+b"\n")
            with self.assertRaisesRegex(ValueError,"invalid"):
                v.check_site(site,source)
            source_file=source/"research-universe.json"
            source_file.write_bytes(source_file.read_bytes()+b"\n")
            with self.assertRaisesRegex(ValueError,"hashes|releaseId|mismatch"):
                v.check_manifest(source)

if __name__=="__main__":unittest.main()
