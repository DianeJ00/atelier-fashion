#!/usr/bin/env python3
"""Strict issuer identity checks for free Google News RSS headline discovery.

Discovery is not an article review: match the published *title*, never assume
that a Google query result belongs to the requested company.
The 12 fashion stocks retain their existing collector. These 40 others rotate
on a 4-day budget, keeping only genuinely dated recent headline links.
"""
from __future__ import annotations

from datetime import date
import re

# ticker: (market, sector, quoted search, title identity aliases, required
# context for ambiguous aliases). Deliberately reject borderline matches.
SPECS = {
 "LLY": ("미국","바이오·제약",'"Eli Lilly" pharmaceutical',("Eli Lilly",),()),
 "JNJ": ("미국","바이오·제약",'"Johnson & Johnson" drug',("Johnson & Johnson","J&J"),()),
 "MRK": ("미국","바이오·제약",'"Merck & Co" pharmaceutical',("Merck & Co","Merck"),()),
 "ABBV": ("미국","바이오·제약",'"AbbVie" drug',("AbbVie",),()),
 "PFE": ("미국","바이오·제약",'"Pfizer" pharmaceutical',("Pfizer",),()),
 "BMY": ("미국","바이오·제약",'"Bristol Myers Squibb" drug',("Bristol Myers Squibb","Bristol-Myers Squibb"),()),
 "AMGN": ("미국","바이오·제약",'"Amgen" biotech',("Amgen",),()),
 "GILD": ("미국","바이오·제약",'"Gilead Sciences" biotech',("Gilead Sciences","Gilead"),()),
 "REGN": ("미국","바이오·제약",'"Regeneron" pharmaceuticals',("Regeneron",),()),
 "VRTX": ("미국","바이오·제약",'"Vertex Pharmaceuticals" drug',("Vertex Pharmaceuticals",),()),
 "ALNY": ("미국","바이오·제약",'"Alnylam" biotech',("Alnylam",),()),
 "BIIB": ("미국","바이오·제약",'"Biogen" drug',("Biogen",),()),
 "VKTX": ("미국","바이오·제약",'"Viking Therapeutics" obesity',("Viking Therapeutics",),()),
 "NBIX": ("미국","바이오·제약",'"Neurocrine Biosciences" drug',("Neurocrine Biosciences","Neurocrine"),()),
 "IONS": ("미국","바이오·제약",'"Ionis Pharmaceuticals" drug',("Ionis Pharmaceuticals","Ionis"),()),
 "INCY": ("미국","바이오·제약",'"Incyte" biotech',("Incyte",),()),
 "EXEL": ("미국","바이오·제약",'"Exelixis" biotech',("Exelixis",),()),
 "MRNA": ("미국","바이오·제약",'"Moderna" vaccine',("Moderna",),()),
 "CRSP": ("미국","바이오·제약",'"CRISPR Therapeutics" drug',("CRISPR Therapeutics",),()),
 "SRPT": ("미국","바이오·제약",'"Sarepta Therapeutics" drug',("Sarepta Therapeutics","Sarepta"),()),
 "UBER": ("미국","소비재·서비스",'"Uber" company earnings',("Uber Technologies","Uber"),()),
 "NFLX": ("미국","소비재·서비스",'"Netflix" streaming',("Netflix",),()),
 "DIS": ("미국","소비재·서비스",'"Disney" company earnings',("Walt Disney","Disney"),()),
 "BKNG": ("미국","소비재·서비스",'"Booking Holdings" travel',("Booking Holdings","Booking.com"),()),
 "WMT": ("미국","소비재·서비스",'"Walmart" retail',("Walmart",),()),
 "TGT": ("미국","소비재·서비스",'"Target" retailer earnings',("Target Corp","Target Corporation","Target"),()),
 "COST": ("미국","소비재·서비스",'"Costco" warehouse',("Costco",),()),
 "TJX": ("미국","소비재·서비스",'"TJX Companies" retail',("TJX Companies","TJX"),()),
 "CAVA": ("미국","소비재·서비스",'"Cava" restaurant chain',("CAVA Group","Cava"),()),
 "CMG": ("미국","소비재·서비스",'"Chipotle Mexican Grill" earnings',("Chipotle Mexican Grill","Chipotle"),()),
 "SBUX": ("미국","소비재·서비스",'"Starbucks" sales',("Starbucks",),()),
 "ELF": ("미국","소비재·서비스",'"e.l.f. Beauty" cosmetics',("e.l.f. Beauty","elf Beauty","e.l.f."),()),
 "ULTA": ("미국","소비재·서비스",'"Ulta Beauty" retail',("Ulta Beauty",),()),
 "EL": ("미국","소비재·서비스",'"Estee Lauder" earnings',("Estée Lauder","Estee Lauder"),()),
 "RH": ("미국","소비재·서비스",'"RH" luxury furniture retailer',("Restoration Hardware","RH"),()),
 "950260": ("한국","내 담당 기업",'"인제니아테라퓨틱스"',("인제니아테라퓨틱스",),()),
 "278470": ("한국","내 담당 기업",'"에이피알" 뷰티',("에이피알",),()),
 "003230": ("한국","내 담당 기업",'"삼양식품"',("삼양식품",),()),
 "105560": ("한국","내 담당 기업",'"KB금융"',("KB금융","KB 금융"),()),
 "005830": ("한국","내 담당 기업",'"DB손해보험"',("DB손해보험","DB 손해보험"),()),
}
SECTOR_BUDGET = {"바이오·제약":6,"소비재·서비스":4,"내 담당 기업":2}
# Some company names are generic in English, demand business context.
CONTEXT = {
 "TGT": ("retail","store","sales","earning","stock","share","target ceo","target corp","target corporation","target profits"),
 "CAVA": ("restaurant","earnings","stock","shares","cava group","chain","food sales","cava ceo"),
 "RH": ("furniture","restoration hardware","stock","shares","earnings","luxury home","retailer","rh ceo"),
 "MRK": ("keytruda","merck & co","merck and co","msd","merck stock","merck shares","merck earnings","pharmaceutical"),
 "UBER": ("ride","delivery","driver","platform","stock","shares","uber technologies","earnings","robotaxi"),
 "DIS": ("disney","theme park","streaming","entertainment"),
}
EXCLUDE = {
 "MRK": ("merck kgaa","merck kg aa","merck group germany","emd serono"),
 "TGT": ("shooting target","targeting","on target","target date","target price","targets for","target to acquire"),
 "CAVA": ("cava wine","sparkling wine","spanish cava","cava grape"),
 "RH": ("rhesus","relative humidity"),
}

def contained(haystack,needle):
    if not needle:
        return False
    # ASCII word boundaries avoid matching UBER inside grubers, RH inside RHCP.
    exp=r"(?<![A-Za-z0-9])"+re.escape(needle).replace(r"\ ",r"\s+")+r"(?![A-Za-z0-9])"
    return bool(re.search(exp,haystack,re.IGNORECASE))

def title_matches(ticker,title):
    spec=SPECS.get(ticker)
    if not spec or not isinstance(title,str):
        return False
    normalized=title.strip()
    if not normalized or len(normalized)>500:
        return False
    if any(contained(normalized,x) for x in EXCLUDE.get(ticker,())):
        return False
    aliases=spec[3]
    if not any(contained(normalized,x) for x in aliases):
        return False
    context=CONTEXT.get(ticker)
    if context and not any(contained(normalized,x) for x in context):
        return False
    # "Merck" alone can be German Merck KGaA; require explicit US identity.
    if ticker=="MRK" and not any(contained(normalized,x) for x in CONTEXT["MRK"]):
        return False
    return True

def company_specs_for(day):
    """Every sector represented daily; all 40 issuers covered within four days."""
    if not isinstance(day,date):
        raise TypeError("Exchange discovery must specify a date")
    result=[]
    for sector,budget in SECTOR_BUDGET.items():
        pool=[(ticker,spec) for ticker,spec in SPECS.items() if spec[1]==sector]
        if not pool:
            raise ValueError("Empty sector allocation")
        start=(day.toordinal()*budget)%len(pool)
        result.extend(pool[(start+n)%len(pool)] for n in range(budget))
    if len(result)!=sum(SECTOR_BUDGET.values()) or len({key for key,_ in result})!=len(result):
        raise ValueError("Rotating company discovery is not unique")
    return result

def locale(ticker):
    if ticker not in SPECS:
        raise ValueError("Issuer not tracked in extended news")
    return ("ko","KR","KR:ko") if SPECS[ticker][0]=="한국" else ("en-US","US","US:en")

def issuer_id(ticker):
    if ticker not in SPECS:
        return None
    return ("KR:" if SPECS[ticker][0]=="한국" else "US:")+ticker

def confirm_universe(companies):
    actual={(row["ticker"],row["market"],row["sector"]) for row in companies if row["ticker"] in SPECS}
    expected={(ticker,spec[0],spec[1]) for ticker,spec in SPECS.items()}
    if actual!=expected or len(actual)!=len(SPECS) or len(companies)!=52:
        raise ValueError("Extended news identity mapping diverged from 52-issuer universe")
    return True
