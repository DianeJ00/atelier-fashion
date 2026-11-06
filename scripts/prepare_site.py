#!/usr/bin/env python3
"""Assemble GitHub Pages from a validated, version-pinned ATELIER release."""
from __future__ import annotations
import json
import shutil
from pathlib import Path
from validate_release import ROOT, MANIFEST, DATA_FILES, check_manifest, sha

JS_CSS = (
    "atelier-data.js", "research2.js", "research2.css",
    "research3.js", "research3.css",
    "consumer2.js", "consumer2.css", "market-live.js",
    "health.js", "korea.js",
)
MARKER = '<script src="./atelier-data.js"></script>'

def prepare(root: Path = ROOT, output: Path | None = None):
    manifest = check_manifest(root)
    rid = manifest["releaseId"]
    site = output or root / "_site"
    if site.exists():
        shutil.rmtree(site)
    site.mkdir(parents=True)
    immutable = site / "releases" / rid
    immutable.mkdir(parents=True)
    for filename in JS_CSS:
        shutil.copy2(root / filename, site / filename)
    for filename in DATA_FILES:
        source = root / filename
        if sha(source.read_bytes()) != manifest["dataFiles"][filename]["sha256"]:
            raise ValueError(f"{filename}: data changed after validation")
        # Keep legacy root filenames for external deep links; the ATELIER app uses pinned copies.
        shutil.copy2(source, site / filename)
        shutil.copy2(source, immutable / filename)
    shutil.copy2(root / MANIFEST, site / MANIFEST)
    html = (root / "index.html").read_text(encoding="utf-8")
    if html.count(MARKER) != 1:
        raise ValueError("Cannot insert release ID exactly once")
    html = html.replace(MARKER, f'<script>window.ATELIER_RELEASE_ID="{rid}";</script>\n' + MARKER)
    (site / "index.html").write_text(html, encoding="utf-8")
    (site / ".nojekyll").touch()
    print(f"Prepared ATELIER Pages release {rid} ({len(DATA_FILES)} immutable JSON datasets)")
    return site

if __name__ == "__main__":
    prepare()
