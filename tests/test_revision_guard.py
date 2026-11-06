"""2-3 boundary: a concurrently changed main must never be silently rebased."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch,call

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
import revision_guard as guard

A="a"*40
B="b"*40
class RevisionBoundaryTests(unittest.TestCase):
    def test_exact_sha_required(self):
        self.assertTrue(guard.revision_matches(A,A))
        self.assertFalse(guard.revision_matches(A,B))
        self.assertFalse(guard.revision_matches("main",A))
        self.assertFalse(guard.revision_matches("f"*39,"f"*39))
    def test_rejects_concurrent_code_change_before_releasing(self):
        with patch.object(guard.subprocess,"run") as run,patch.object(guard,"git",side_effect=[A,B]):
            with self.assertRaisesRegex(RuntimeError,"Concurrent main change"):
                guard.check_main()
            run.assert_called_once_with(["git","fetch","--no-tags","origin","main"],check=True)
    def test_passes_exact_tested_revision(self):
        with patch.object(guard.subprocess,"run") as run,patch.object(guard,"git",side_effect=[A,A]):
            self.assertEqual(guard.check_main(),A)
            self.assertEqual(run.call_count,1)
    def test_workflow_never_mixes_source_and_verified_data(self):
        script=(Path(__file__).resolve().parents[1]/".github/workflows/weekly-research.yml").read_text()
        self.assertNotIn("git reset --mixed origin/main",script)
        self.assertNotIn("git reset --hard origin/main",script)
        self.assertIn("python scripts/revision_guard.py",script)
        self.assertIn("needs.collect-and-build.outputs.verified_sha",script)
        self.assertIn("git push origin HEAD:main",script)
        self.assertIn("python scripts/validate_release.py verify-site _site",script)

if __name__=="__main__":unittest.main()
