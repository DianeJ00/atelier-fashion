#!/usr/bin/env python3
"""Source-aware, privacy-minimizing public YouTube product-review theme sampler.

Searches independent-looking product-review videos via official Data API v3.
Counts *keywords* in a non-representative recent sample of top-level comments.
Does not retain raw comments, authors, usernames or sentiment conclusions.
"""
from __future__ import annotations
import json
import os
import re
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "consumer-samples.json"
NOW = datetime.now(timezone.utc)
KEY = os.environ.get("YOUTUBE_API_KEY", "").strip()
MAX_VIDEOS = 5
MAX_COMMENTS = 60
DAYS_LOOKBACK = 90

# Broad public-video discovery: 5 searches per weekly run (~500 search quota units).
REVIEW_QUERIES = [
    ("TPR", "Coach Brooklyn bag review"),
    ("RL", "Ralph Lauren polo sweater review"),
    ("GAP", "Old Navy jeans denim review"),
    ("LEVI", "Levi's jeans fit review"),
    ("URBN", "Free People clothing review"),
]
BRAND_REGEX = {
    "TPR": r"\bcoach\b|brooklyn bag",
    "RL": r"ralph lauren|\bpolo\b",
    "GAP": r"old navy",
    "LEVI": r"\blevi'?s\b|\blevis\b",
    "URBN": r"free people",
}
TOPICS = {
    "가격·할인": [r"\bprice\b", r"\bexpensive\b", r"\baffordabl", r"\bworth\b", "가격", "비싸"],
    "핏·사이즈": [r"\bfit\b", r"\bsiz(?:e|ing)\b", r"\bbaggy\b", r"\boversize", "핏", "사이즈"],
    "품질·소재": [r"\bquality\b", r"\bfabric\b", r"\bleather\b", r"\bmaterial\b", r"\bstitch", "소재", "품질"],
    "디자인·색상": [r"\bdesign\b", r"\bstyle\b", r"\bcolou?r\b", r"\blook\b", "디자인", "색상"],
    "구매·반품": [r"\bbought\b", r"\bbuy\b", r"\bpurchas", r"\breturn(?:ed|ing)?\b", "구매", "반품"],
}
REVIEW_WORDS = re.compile(r"review|try.?on|wear test|fit|outfit|styling|haul|unboxing|honest|vs\b", re.I)

def api(endpoint, params):
    url = "https://www.googleapis.com/youtube/v3/" + endpoint + "?" + urlencode({**params, "key": KEY})
    req = Request(url, headers={"User-Agent": "ATELIER-Public-Research/2.0", "Accept": "application/json"})
    with urlopen(req, timeout=24) as response:
        return json.load(response)

def discover_video(ticker, query):
    after = (NOW - timedelta(days=DAYS_LOOKBACK)).isoformat().replace("+00:00", "Z")
    data = api("search", {
        "part": "snippet", "q": query, "type": "video", "order": "date",
        "publishedAfter": after, "maxResults": 12, "relevanceLanguage": "en",
        "videoDuration": "medium",
    })
    options = []
    for item in data.get("items", []):
        snippet = item.get("snippet", {})
        vid = item.get("id", {}).get("videoId")
        title = snippet.get("title", "")
        if not re.fullmatch(r"[a-zA-Z0-9_-]{11}", vid or ""):
            continue
        if not re.search(BRAND_REGEX[ticker], title, re.I):
            continue
        # Search and naming are not proof of independence, sponsorship or ownership.
        score = (2 if REVIEW_WORDS.search(title) else 0) + (
            1 if not re.search(r"official|brand channel|trailer|shorts", title, re.I) else 0
        )
        options.append({
            "id": vid, "title": title, "creator": snippet.get("channelTitle", ""),
            "date": snippet.get("publishedAt", ""), "score": score,
            "reviewQuery": query, "brandTicker": ticker
        })
    options.sort(key=lambda x: (x["score"], x["date"]), reverse=True)
    return options[:1]

def sample_comments(video):
    data = api("commentThreads", {
        "part": "snippet", "videoId": video["id"], "order": "time",
        "maxResults": MAX_COMMENTS, "textFormat": "plainText"
    })
    comments = []
    for item in data.get("items", []):
        snippet = item.get("snippet", {}).get("topLevelComment", {}).get("snippet", {})
        content = str(snippet.get("textOriginal") or snippet.get("textDisplay") or "")[:1200]
        if content.strip():
            comments.append(content)
    topics = Counter()
    comments_with_topic = 0
    for raw in comments:
        matched = False
        for label, patterns in TOPICS.items():
            if any(re.search(term, raw, flags=re.I) for term in patterns):
                topics[label] += 1
                matched = True
        if matched:
            comments_with_topic += 1
    # No raw comments, names, user ids, or comment identifiers are written to disk.
    return {
        "videoTitle": video["title"],
        "videoUrl": "https://www.youtube.com/watch?v=" + video["id"],
        "creator": video["creator"], "videoDate": video["date"][:10],
        "titleMatchedTickers": [video["brandTicker"]],
        "selection": "공식 YouTube 검색에서 찾은 브랜드 상품 리뷰 후보 · 영상·협찬 여부 검토 전",
        "reviewQuery": video["reviewQuery"],
        "sampledTopLevelComments": len(comments),
        "commentsWithTrackedTopic": comments_with_topic,
        "themeCounts": dict(topics),
        "samplingNote": "공개 최상위 댓글 최신순 일부; 댓글·작성자 정보 미저장; 언급 건수는 호감·불호 판단이 아님",
    }

def main():
    output = {
        "generatedAt": NOW.isoformat(), "source": "YouTube Data API v3",
        "status": "key_required" if not KEY else "no_matching_videos",
        "method": "브랜드 상품 리뷰 후보 최대 5개를 공식 검색, 영상당 최근 공개 최상위 댓글 최대 60건의 주제 단어만 계산",
        "caveat": "선정 영상은 협찬·광고·편향 여부를 확인하지 않았고 댓글은 비대표 표본. 자동 감성 판단·구매율 추정 금지.",
        "quotaNote": "YouTube search.list 5회/실행은 일반적으로 약 500 API quota units를 사용. 공식 쿼터 확인 필요.",
        "videos": [], "errors": [], "searches": []
    }
    if not KEY:
        OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("Public comment analysis inactive: YOUTUBE_API_KEY missing")
        return
    choices = []
    for ticker, query in REVIEW_QUERIES:
        try:
            matches = discover_video(ticker, query)
            choices.extend(matches)
            output["searches"].append({"ticker": ticker, "query": query,
                                       "status": "found" if matches else "not_found",
                                       "count": len(matches)})
        except (HTTPError, Exception) as exc:
            reason = "HTTP_" + str(exc.code) if isinstance(exc, HTTPError) else type(exc).__name__
            output["errors"].append({"stage": "search", "ticker": ticker, "reason": reason})
            output["searches"].append({"ticker": ticker, "query": query, "status": "error", "count": 0})
    seen = set()
    for video in choices:
        if video["id"] in seen:
            continue
        seen.add(video["id"])
        try:
            output["videos"].append(sample_comments(video))
        except Exception as exc:
            reason = "HTTP_" + str(exc.code) if isinstance(exc, HTTPError) else type(exc).__name__
            output["errors"].append({"stage": "comments", "ticker": video["brandTicker"],
                                     "videoUrl": "https://www.youtube.com/watch?v="+video["id"], "reason": reason})
        if len(output["videos"]) >= MAX_VIDEOS:
            break
    output["status"] = (
        "sampled_with_errors" if output["videos"] and output["errors"] else
        "sampled" if output["videos"] else
        "source_error" if output["errors"] else "no_matching_videos"
    )
    OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Brand-video research: {len(output['videos'])} videos, {len(output['errors'])} errors")

if __name__ == "__main__":
    main()
