#!/usr/bin/env python3
"""Fail closed if a workflow is not operating on the current tested main revision.

No git reset/rebase of validated JSON onto unrelated source changes is allowed.
The final push still uses Git's fast-forward protection.
"""
from __future__ import annotations

import re
import subprocess
import sys

SHA_RE = re.compile(r"^[a-f0-9]{40}$")

def revision_matches(local, remote):
    return bool(SHA_RE.fullmatch(local) and SHA_RE.fullmatch(remote) and local == remote)

def git(*args):
    return subprocess.check_output(["git", *args], text=True).strip()

def check_main():
    subprocess.run(["git", "fetch", "--no-tags", "origin", "main"], check=True)
    local = git("rev-parse", "HEAD")
    latest = git("rev-parse", "refs/remotes/origin/main")
    if not revision_matches(local, latest):
        raise RuntimeError(
            f"Concurrent main change detected: checked out {local}, main {latest}. "
            "Rejecting this release rather than mixing verified data with new code. "
            "A new run against the updated main must validate and publish."
        )
    print(f"ATELIER verified main revision {local}")
    return local

if __name__ == "__main__":
    try:
        check_main()
    except (OSError, subprocess.CalledProcessError, RuntimeError) as error:
        print(f"::error::{error}", file=sys.stderr)
        raise SystemExit(1)
