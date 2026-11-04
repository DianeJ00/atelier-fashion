#!/usr/bin/env python3
"""Optional public YouTube comment theme COUNTS (no PII or raw comment storage).

A few recent top-level comments, sampled by recency, cannot establish consumer
sentiment or representative product demand. Requires YouTube Data API v3 key.
"""
from __future__ import annotations

import json
import os
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode, urlparse, parse_qs
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "consumer-samples.json"
FEED = ROOT / "weekly-research.json"
NOW = datetime.now(timezone.utc)
KEY = os.environ.get("YOUTUBE_API_KEY", "").strip()
MAX_VIDEOS = 5
MAX_COMMENTS = 60

# Topic presence only. These are not approval/disapproval labels or sentiment.
TOPICS = {
    "가격·할인": (r"\bprice\b", r"\bexpensive\b", r"\baffordabl", r"\bcheap\b", r"\bworth\b", "가격", "비싸"),
    "핏·실루엣": (r"\bfit\b", r"\bsiz(e|ing)\b", r"\boversize", r"\bbaggy\b", r"\bsilhouette\b", "핏", "사이즈"),
    "품질·소재": (r"\bquality\b", r"\bfabric\b", r"\bleather\b", r"\bmaterial\b", r"\bstitch", "소재", "품질"),
    "디자인·색상": (r"\bdesign\b", r"\bstyle\b", r"\bcolor\b", r"\bcolour\b", r"\blook\b", "디자인", "색상"),
    "구매·반품": (r"\bbought\b", r"\bbuy\b", r"\bpurchas", r"\breturned\b", r"\bordered\b", "구매", "반품"),
}
BRANDS = {
    "RL": (r"ralph lauren", r"\bpolo\b"),
    "PVH": (r"calvin klein", r"tommy hilfiger"),
    "LEVI": (r"levi'?s", r"\blevis\b"),
    "ANF": (r"abercrombie", r"hollister"),
    "GAP": (r"old navy", r"\bgap\b", r"athleta"),
    "AEO": (r"american eagle", r"\baerie\b"),
    "URBN": (r"free people", r"urban outfitters", r"nuuly"),
    "VFC": (r"\bvans\b", r"north face", r"timberland"),
    "CPRI": (r"michael kors", r"jimmy choo"),
    "CAL": (r"sam edelman", r"stuart weitzman"),
    "VSXY": (r"victoria'?s secret", r"\bpink\b"),
    "TPR": (r"\bcoach\b", r"kate spade"),
}

def video_id(url):
    p = urlparse(url)
    if p.hostname not in ("www.youtube.com", "youtube.com", "youtu.be"):
        return None
    v = p.path.strip("/") if p.hostname == "youtu.be" else parse_qs(p.query).get("v", [""])[0]
    return v if re.fullmatch(r"[A-Za-z0-9_-]{11}", v or "") else None

def get_comments(vid):
    url = "https://www.googleapis.com/youtube/v3/commentThreads?" + urlencode({
        "part": "snippet", "videoId": vid, "maxResults": MAX_COMMENTS,
        "order": "time", "textFormat": "plainText", "key": KEY
    })
    req = Request(url, headers={"User-Agent": "ATELIER Fashion Research"})
    with urlopen(req, timeout=20) as response:
        data = json.load(response)
    results = []
    for row in data.get("items", []):
        top = row.get("snippet", {}).get("topLevelComment", {}).get("snippet", {})
        text = str(top.get("textOriginal") or top.get("textDisplay") or "")
        if text:
            results.append(text[:1500])
    return results

def main():
    output = {
        "generatedAt": NOW.isoformat(), "source": "YouTube Data API v3 / published top-level comments",
        "status": "key_required" if not KEY else "no_matching_videos",
        "method": "최근 영상별 최신순 상위 댓글 최대 60개에서 주제 단어 포함 건수만 집계. 답글·삭제 댓글은 제외.",
        "caveat": "댓글은 자기선택 편향이 있는 비대표 표본. 단어 출현은 호감·구매·매출 증가 증거가 아니며 긍부정 자동 판단 없음.",
        "videos": [], "errors": []
    }
    if not KEY:
        OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
        print("YouTube comments: API key not configured (explicitly unavailable)")
        return
    try:
        feed = json.loads(FEED.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        feed = {}
    candidates = []
    for item in feed.get("items", []):
        if item.get("platform") != "YouTube":
            continue
        vid = video_id(item.get("url", ""))
        if not vid:
            continue
        title = (item.get("title") or "").lower()
        linked = [ticker for ticker, terms in BRANDS.items()
                  if any(re.search(term, title, re.I) for term in terms)]
        candidates.append((bool(linked), item, vid, linked))
    candidates.sort(key=lambda x: (x[0], x[1].get("date", "")), reverse=True)
    for _, item, vid, linked in candidates[:MAX_VIDEOS]:
        try:
            comments = get_comments(vid)
            counts = Counter()
            for text in comments:
                for label, patterns in TOPICS.items():
                    if any(re.search(pattern, text, re.I) for pattern in patterns):
                        counts[label] += 1
            output["videos"].append({
                "videoTitle": item["title"], "videoUrl": item["url"],
                "creator": item.get("creator"), "videoDate": item.get("date", "")[:10],
                "titleMatchedTickers": linked,
                "sampledTopLevelComments": len(comments),
                "themeCounts": dict(counts),
                "samplingNote": "최신순 공개 최상위 댓글 일부. 각 댓글은 여러 주제에 중복 집계될 수 있음.",
            })
        except Exception as e:
            output["errors"].append({"videoUrl": item["url"], "reason": type(e).__name__})
    output["status"] = (
        "sampled" if output["videos"] else
        "source_error" if output["errors"] else "no_matching_videos"
    )
    OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(f"YouTube comment samples: videos={len(output['videos'])}, errors={len(output['errors'])}")

if __name__ == "__main__":
    main()
