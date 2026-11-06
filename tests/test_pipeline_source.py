"""Editorial drug watchlist must not be overwritten by registry data collection."""
from __future__ import annotations
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import build_pipeline_review as p
import validate_release as integrity

class PipelineSourceTests(unittest.TestCase):
    def test_immutable_watchlist_matches_generated_asset_identifiers(self):
        seed=json.loads((ROOT/"research-pipeline-seed.json").read_text(encoding="utf-8"))
        derived=json.loads((ROOT/"research-pipeline.json").read_text(encoding="utf-8"))
        self.assertEqual(len(seed["records"]),12)
        self.assertEqual(integrity.validate_pipeline_seed(ROOT,{"research-pipeline.json":derived}),[])
        for r in seed["records"]:
            self.assertEqual(set(r),{"ticker","asset","disease","modality","source","check","link"})
            self.assertNotIn("stage",r)
            self.assertNotIn("approval",r)

    def test_failed_registry_refresh_preserves_old_verified_stage_without_writing_seed(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            original={"ticker":"LLY","asset":"sample drug","disease":"test",
                      "modality":"test","source":"editorial","check":"follow up",
                      "link":"https://clinicaltrials.gov/search?term=sample"}
            source=root/"research-pipeline-seed.json"
            source.write_text(json.dumps({"records":[original]}),encoding="utf-8")
            before=source.read_bytes()
            out=root/"research-pipeline.json"
            last={**original,"stage":"3상 등록시험 확인","trialPhaseObserved":"PHASE3",
                  "clinicalTrialId":"NCT12345678",
                  "clinicalTrialURL":"https://clinicaltrials.gov/study/NCT12345678",
                  "stageVerifiedAt":"2026-11-05T00:00:00Z"}
            out.write_text(json.dumps({"records":[last]}),encoding="utf-8")
            registry=root/"clinical-trials.json"
            registry.write_text(json.dumps({"status":"unavailable","assets":[]}),encoding="utf-8")
            with patch.object(p,"ROOT",root),patch.object(p,"OUT",out),patch.object(p,"SEED",source),patch.object(p,"REGISTRY",registry):
                p.build()
            self.assertEqual(source.read_bytes(),before)
            result=json.loads(out.read_text(encoding="utf-8"))
            self.assertEqual(result["status"],"registry_not_ready")
            row=result["records"][0]
            self.assertEqual(row["stage"],"3상 등록시험 확인")
            self.assertIn("이전 등록시험 확인본",row["reviewStatus"])
            self.assertIsNone(row["approval"])

    def test_new_verified_registry_link_is_derived_not_editorial(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            original={"ticker":"LLY","asset":"sample drug","disease":"test",
                      "modality":"test","source":"editorial","check":"follow up",
                      "link":"https://clinicaltrials.gov/search?term=sample"}
            seed=root/"research-pipeline-seed.json"
            seed.write_text(json.dumps({"records":[original]}),encoding="utf-8")
            before=seed.read_bytes()
            out=root/"research-pipeline.json"
            out.write_text(json.dumps({"records":[]}),encoding="utf-8")
            registry=root/"clinical-trials.json"
            trial={"nctId":"NCT12345678","url":"https://clinicaltrials.gov/study/NCT12345678",
                   "phases":["PHASE2"],"status":"RECRUITING","statusKr":"모집 중",
                   "conditions":["Sample condition"],"primaryCompletion":{"date":"2027-01-01"}}
            registry.write_text(json.dumps({"status":"ok","generatedAt":"2026-11-06T00:00:00Z",
                "assets":[{"ticker":"LLY","asset":"sample drug","trials":[trial]}]}),encoding="utf-8")
            with patch.object(p,"ROOT",root),patch.object(p,"OUT",out),patch.object(p,"SEED",seed),patch.object(p,"REGISTRY",registry):
                p.build()
            self.assertEqual(seed.read_bytes(),before)
            result=json.loads(out.read_text(encoding="utf-8"))
            self.assertEqual(result["status"],"registry_compared")
            self.assertEqual(result["records"][0]["trialPhaseObserved"],"PHASE2")
            self.assertIn("등록시험",result["records"][0]["reviewStatus"])

if __name__=="__main__":unittest.main()
