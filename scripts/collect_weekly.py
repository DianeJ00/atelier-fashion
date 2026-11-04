#!/usr/bin/env python3
"""Retrieve only publicly available RSS headlines into unverified weekly source inbox.

No scraping of private posts or comments. Do not treat titles as verified consumer reviews.
Python standard library only; intended for GitHub Actions.
"""
from __future__ import annotations
from collections import Counter
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import json
import os
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
}
# Optional YouTube API access can resolve channel handles directly, avoiding stale IDs.
API_CHANNEL_HANDLES = {'Fashion Roadman': '@FashionRoadman', 'Tim Dessaint': '@timdessaint', 'HauteLeMode': '@hautelemode'}
MEDIA_QUERIES = {
    'Vogue Runway': 'site:vogue.com/fashion-shows runway collection',
    'WWD': 'site:wwd.com fashion trend runway',
    'Business of Fashion': 'site:businessoffashion.com luxury fashion brands',
}
TOPIC_TERMS = [
    ('데님·핏', ('denim', 'jeans', 'silhouette', 'wide-leg', 'baggy')),
    ('신발·스니커즈', ('sneaker', 'footwear', 'shoe', 'vans', 'loafers')),
    ('패션쇼·디자인', ('runway', 'fashion week', 'collection', 'designer', 'couture')),
    ('브랜드·제품', ('capsule', 'collab', 'campaign', 'product', 'launch', 'handbag')),
    ('기업 실적', ('earnings', 'sales', 'revenue', 'margin', 'guidance', 'quarterly')),
]
COMPANY_CHECK = {
    'RL':'평균 판매단가·아시아 매출', 'PVH':'Calvin Klein·Tommy 매출',
    'LEVI':'미국 직접판매 동일매장매출·재고', 'ANF':'Hollister 성장·마진',
    'GAP':'Old Navy 동일매장매출·Athleta', 'AEO':'Aerie 성장·연결 이익률',
    'URBN':'Free People 동일매장매출·Nuuly 마진', 'VFC':'Vans 매출·재고',
    'CPRI':'Michael Kors 매출·정가 판매', 'CAL':'Famous Footwear 동일매장매출',
    'VSXY':'PINK 성장·정가 판매', 'TPR':'Coach 성장·Kate Spade 손익',
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


def classify(title):
    lower = title.lower()
    for category, words in TOPIC_TERMS:
        if any(word in lower for word in words):
            return category
    return '기타 뉴스·콘텐츠'


def record(title, url, date, platform, ticker, brand, creator, source):
    dt = dated(date)
    if not dt or not START <= dt <= NOW + timedelta(days=1):
        return None
    title = re.sub(r'\s+', ' ', (title or '')).strip()[:230]
    url = str(url or '').strip()
    if not title or not url.startswith('https://'):
        return None
    if re.search(r'META_TITLE|stock price, news, quote|stock quote and history|latest stock news and headlines|wall street zen upgrades', title, re.I):
        return None
    digest = sha256(url.encode('utf-8')).hexdigest()[:15]
    return {'id': 'rss-' + digest, 'title': title, 'url': url,
            'date': dt.isoformat().replace('+00:00', 'Z'), 'platform': platform,
            'ticker': ticker, 'brand': brand, 'creator': creator, 'source': source,
            'topic': classify(title), 'reviewStatus': 'needs_review'}


def youtube(name, channel_id):
    last_error = None
    for base in ('https://www.youtube.com/feeds/videos.xml', 'https://www.youtube.com/xml/feeds/videos.xml'):
        try:
            url = base + '?' + urlencode({'channel_id': channel_id})
            root = ET.fromstring(get(url))
            result = []
            for entry in root.findall('a:entry', ATOM):
                title = entry.findtext('a:title', '', ATOM)
                vid = entry.findtext('yt:videoId', '', ATOM)
                published = entry.findtext('a:published', '', ATOM)
                if vid:
                    row = record(title, 'https://www.youtube.com/watch?v='+vid, published,
                                 'YouTube', 'TREND', '', name, name + ' 공식 채널 RSS · 제목만 확인')
                    if row:
                        result.append(row)
            return result[:15]
        except Exception as e:
            last_error = e
    raise RuntimeError('YouTube RSS connection failed: '+type(last_error).__name__)


def youtube_api(name, handle, key):
    api = 'https://www.googleapis.com/youtube/v3/'
    channel = json.loads(get(api+'channels?'+urlencode({'part':'contentDetails','forHandle':handle,'key':key})))
    if not channel.get('items'):
        raise ValueError('YouTube channel handle not found')
    playlist = channel['items'][0]['contentDetails']['relatedPlaylists']['uploads']
    res = json.loads(get(api+'playlistItems?'+urlencode({
        'part':'snippet','playlistId':playlist,'maxResults':40,'key':key})))
    found = []
    for video in res.get('items', []):
        snippet = video.get('snippet', {})
        vid = snippet.get('resourceId', {}).get('videoId')
        if vid:
            row = record(snippet.get('title'), 'https://www.youtube.com/watch?v='+vid,
                         snippet.get('publishedAt'), 'YouTube', 'TREND', '', name,
                         name + ' · 공식 YouTube API, 제목만 확인')
            if row:
                found.append(row)
    return found[:20]


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


def weekly_digest(items, previous):
    counts = Counter(x['platform'] for x in items)
    topics = Counter(x['topic'] for x in items)
    company_counts = Counter(x['ticker'] for x in items if x['ticker'] in COMPANY_CHECK)
    watch_priority = ['TPR', 'RL', 'GAP', 'URBN', 'LEVI', 'CPRI', 'VFC', 'ANF', 'AEO', 'PVH', 'VSXY', 'CAL']
    ranked_topics = [(k, v) for k, v in topics.most_common() if k != '기타 뉴스·콘텐츠'][:4]
    previous_ids = {x.get('id') for x in previous.get('items', [])}
    previous_date = previous.get('generatedAt')
    return {
        'status': '자동 요약 · 원문 미검증',
        'counts': [{'source': k, 'count': v} for k, v in sorted(counts.items())],
        'topics': [{'name': k, 'count': v} for k, v in ranked_topics],
        'uncategorizedCount': topics['기타 뉴스·콘텐츠'],
        'previousCollectedAt': previous_date,
        'newSincePrevious': sum(x['id'] not in previous_ids for x in items) if previous_date else None,
        'companyFocus': [
            {'ticker': ticker, 'count': count, 'check': COMPANY_CHECK[ticker],
             'headlines': [{'title': x['title'], 'url': x['url'], 'date': x['date'][:10]}
                           for x in items if x['ticker'] == ticker][:2]}
            for ticker, count in sorted(company_counts.items(), key=lambda kv: (watch_priority.index(kv[0]) if kv[0] in watch_priority else 99, -kv[1]))[:6]
        ],
        'reviewNote': '기사·영상 제목을 출처별로 묶은 자동 초안이며 유행 확정, 소비자 평가, 실적 분석이 아닙니다.',
    }


def main():
    previous = {}
    if OUT.exists():
        try:
            previous = json.loads(OUT.read_text(encoding='utf-8'))
        except (OSError, ValueError):
            pass
    found, errors, health = [], [], []
    key = os.environ.get('YOUTUBE_API_KEY', '').strip()
    channels = API_CHANNEL_HANDLES if key else CHANNELS
    for name, identifier in channels.items():
        try:
            rows = youtube_api(name, identifier, key) if key else youtube(name, identifier)
            found.extend(rows)
            health.append({'name': name, 'source': 'YouTube API' if key else 'YouTube RSS',
                           'status': '수집 완료', 'count': len(rows)})
        except Exception as e:
            errors.append('YouTube '+name+': '+type(e).__name__)
            health.append({'name': name, 'source': 'YouTube API' if key else 'YouTube RSS',
                           'status': '연결 실패', 'count': 0})
    news_errors = 0
    for ticker, query in COMPANIES.items():
        try:
            found.extend(news(ticker, query))
        except Exception as e:
            errors.append('Google News '+ticker+': '+type(e).__name__)
            news_errors += 1
    for source, query in MEDIA_QUERIES.items():
        try:
            found.extend(news('TREND', query))
        except Exception as e:
            errors.append('Fashion media '+source+': '+type(e).__name__)
            news_errors += 1
    by_url = {}
    for row in found:
        by_url.setdefault(row['url'], row)
    items = sorted(by_url.values(), key=lambda x: x['date'], reverse=True)[:160]
    health.append({'name':'공개 뉴스·패션 매체', 'source':'Google News RSS',
                   'status':'일부 오류' if news_errors else '수집 완료',
                   'count':sum(x['platform']=='Google News' for x in items)})
    obj = {
        'generatedAt': NOW.isoformat().replace('+00:00', 'Z'),
        'periodStart': START.date().isoformat(), 'periodEnd': NOW.date().isoformat(),
        'reviewStatus': 'unverified_headlines_only',
        'note': '기사·영상 제목을 자동 발견·분류. 트렌드 확정, 소비자 의견 분석, 재무 실적 검증 아님.',
        'items': items,
        'weeklyDigest': weekly_digest(items, previous),
        'sourceHealth': health,
        'errors': errors,
    }
    OUT.write_text(json.dumps(obj, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(f'Collected {len(items)} unverified headlines, {len(errors)} source errors; wrote {OUT}')


if __name__ == '__main__':
    main()
