#!/usr/bin/env python3
"""Retrieve only publicly available RSS headlines into unverified weekly source inbox.

No scraping of private posts or comments. Do not treat titles as verified consumer reviews.
Python standard library only; intended for GitHub Actions.
"""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
NOW = datetime.now(timezone.utc)
START = NOW - timedelta(days=8)
OUT = ROOT / 'weekly-research.json'
UA = 'ATELIER-Research-RSS/1.0 (public RSS weekly headline discovery)'
CHANNELS = {
    'Fashion Roadman': 'UCVmPyrwjL0wepDhmvgzlOcA',
    'Tim Dessaint': 'UCfJrdVVcWZMHLC--a4ovLLQ',
    # Add channels here only after confirming their official YouTube channel ID.
}
COMPANIES = {
    'RL': '"Ralph Lauren" fashion earnings',
    'PVH': '"PVH" "Calvin Klein" fashion',
    'LEVI': '"Levi Strauss" denim',
    'ANF': '"Abercrombie Fitch" clothing',
    'GAP': '"Gap Inc" "Old Navy"',
    'AEO': '"American Eagle Outfitters" Aerie',
    'URBN': '"Urban Outfitters" "Free People" Nuuly',
    'VFC': '"Vans" "VF Corporation"',
    'CPRI': '"Capri Holdings" "Michael Kors"',
    'CAL': '"Caleres" "Famous Footwear"',
    'VSXY': '"Victoria Secret" earnings',
    'TPR': '"Tapestry" "Coach" "Kate Spade"',
}
ATOM = {'a': 'http://www.w3.org/2005/Atom', 'yt': 'http://www.youtube.com/xml/schemas/2015'}


def get(url: str) -> bytes:
    request = Request(url, headers={'User-Agent': UA, 'Accept': 'application/rss+xml,application/atom+xml,application/xml,text/xml'})
    with urlopen(request, timeout=25) as resp:
        return resp.read(4_000_000)


def dated(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace('Z', '+00:00')).astimezone(timezone.utc)
    except ValueError:
        try:
            return parsedate_to_datetime(s).astimezone(timezone.utc)
        except (ValueError, TypeError):
            return None


def record(title, url, date, platform, ticker, brand, creator, source):
    dt = dated(date)
    if not dt or not START <= dt <= NOW + timedelta(days=1):
        return None
    title = re.sub(r'\s+', ' ', (title or '')).strip()[:230]
    url = str(url or '').strip()
    if not title or not url.startswith('https://'):
        return None
    digest = sha256(url.encode('utf-8')).hexdigest()[:15]
    return {'id': 'rss-' + digest, 'title': title, 'url': url,
            'date': dt.isoformat().replace('+00:00', 'Z'), 'platform': platform,
            'ticker': ticker, 'brand': brand, 'creator': creator, 'source': source,
            'reviewStatus': 'needs_review'}


def youtube(name, channel_id):
    url = 'https://www.youtube.com/feeds/videos.xml?' + urlencode({'channel_id': channel_id})
    root = ET.fromstring(get(url))
    result = []
    for entry in root.findall('a:entry', ATOM):
        title = entry.findtext('a:title', '', ATOM)
        vid = entry.findtext('yt:videoId', '', ATOM)
        published = entry.findtext('a:published', '', ATOM)
        if vid:
            row = record(title, 'https://www.youtube.com/watch?v='+vid, published,
                         'YouTube', 'TREND', '', name, name + ' 공식 채널 RSS')
            if row:
                result.append(row)
    return result[:15]


def news(ticker, query):
    url = 'https://news.google.com/rss/search?' + urlencode({'q': query + ' when:8d', 'hl': 'en-US', 'gl': 'US', 'ceid': 'US:en'})
    root = ET.fromstring(get(url))
    result = []
    for item in root.findall('./channel/item'):
        title = item.findtext('title', '')
        link = item.findtext('link', '')
        published = item.findtext('pubDate', '')
        publisher = item.findtext('source', 'Google News RSS')
        row = record(title, link, published, 'Google News', ticker, '', publisher, 'Google News RSS (원문 확인 전)')
        if row:
            result.append(row)
    return result[:2]


def main():
    found, errors = [], []
    for name, cid in CHANNELS.items():
        try:
            found.extend(youtube(name, cid))
        except Exception as e:
            errors.append('YouTube ' + name + ': ' + type(e).__name__)
    for ticker, query in COMPANIES.items():
        try:
            found.extend(news(ticker, query))
        except Exception as e:
            errors.append('Google News ' + ticker + ': ' + type(e).__name__)
    by_url = {}
    for row in found:
        by_url.setdefault(row['url'], row)
    items = sorted(by_url.values(), key=lambda x: x['date'], reverse=True)[:140]
    obj = {
        'generatedAt': NOW.isoformat().replace('+00:00', 'Z'),
        'periodStart': START.date().isoformat(),
        'periodEnd': NOW.date().isoformat(),
        'reviewStatus': 'unverified_headlines_only',
        'note': '헤드라인 자동 발견만 수행. 패션 트렌드 확정·매출 증빙·여론 분석 아님. 기업별 실적은 SEC/IR 별도 확인.',
        'items': items, 'errors': errors,
    }
    OUT.write_text(json.dumps(obj, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(f'Collected {len(items)} headlines, {len(errors)} source errors; wrote {OUT}')


if __name__ == '__main__':
    main()
