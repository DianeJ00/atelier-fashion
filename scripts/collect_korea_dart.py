#!/usr/bin/env python3
"""Optional five-company Korean OpenDART official financial disclosures.

The public site never receives DART_API_KEY. 3-month income statement fields
are kept separate from annual values, and no bank/insurance-specific ratios are
inferred from account totals.
"""
from __future__ import annotations
import json,os,re,time,io,zipfile
import xml.etree.ElementTree as ET
from datetime import datetime,timedelta,timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen,Request

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"korea-dart.json"
TODAY=(datetime.now(timezone.utc)+timedelta(hours=9)).date()
KEY=os.environ.get("DART_API_KEY","").strip()
CODES={"03":("11013","1분기"),"06":("11012","반기"),"09":("11014","3분기"),"12":("11011","연간")}
TAGS={"매출액":("ifrs-full_Revenue","ifrs-full_RevenueFromContractsWithCustomers","dart_Revenue"),
      "영업이익":("dart_OperatingIncomeLoss","ifrs-full_OperatingProfitLoss"),
      "당기순이익":("ifrs-full_ProfitLoss","ifrs_ProfitLoss")}
def fetch(endpoint,kwargs):
    q=urlencode({"crtfc_key":KEY,**kwargs})
    with urlopen(Request("https://opendart.fss.or.kr/api/"+endpoint+"?"+q,
                         headers={"User-Agent":"ATELIER-Research/2.6"}),timeout=27) as f:return json.load(f)
def corp_codes():
    url="https://opendart.fss.or.kr/api/corpCode.xml?"+urlencode({"crtfc_key":KEY})
    with urlopen(Request(url,headers={"User-Agent":"ATELIER-Research/2.6"}),timeout=45) as f:raw=f.read()
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        xml=archive.read(next(x for x in archive.namelist() if x.lower().endswith(".xml")))
    return {str(n.findtext("stock_code") or "").strip():
            (str(n.findtext("corp_code") or "").strip(),str(n.findtext("corp_name") or "").strip())
            for n in ET.fromstring(xml).findall("list") if n.findtext("stock_code")}
def latest(code):
    result=fetch("list.json",{"corp_code":code,"bgn_de":(TODAY-timedelta(days=480)).strftime("%Y%m%d"),
          "end_de":TODAY.strftime("%Y%m%d"),"pblntf_ty":"A","last_reprt_at":"Y",
          "page_count":"100","sort":"date","sort_mth":"desc"})
    if result.get("status")=="013":return None
    if result.get("status")!="000":raise ValueError("DART filing status: "+str(result.get("status")))
    candidates=[]
    for entry in result.get("list",[]):
        name=entry.get("report_nm","")
        match=re.search(r"(사업보고서|반기보고서|분기보고서)\s*\((20\d{2})\.(03|06|09|12)\)",name)
        if not match:continue
        year,month=match.group(2),match.group(3)
        correct="사업보고서" if month=="12" else "반기보고서" if month=="06" else "분기보고서"
        if correct!=match.group(1) or str(entry.get("rcept_dt",""))>TODAY.strftime("%Y%m%d"):continue
        report_code,label=CODES[month]
        receipt=str(entry.get("rcept_no",""))
        candidates.append({"year":year,"month":month,"reportCode":report_code,"label":year+"년 "+label,
                           "received":str(entry.get("rcept_dt","")),"receipt":receipt,
                           "url":"https://dart.fss.or.kr/dsaf001/main.do?rcpNo="+receipt})
    return max(candidates,key=lambda x:(x["year"],x["month"],x["received"])) if candidates else None
def amount(raw):
    try:return int(str(raw).replace(",","").strip()) if raw not in ("",None,"-") else None
    except (TypeError,ValueError):return None
def extract(rows):
    out={}
    for label,ids in TAGS.items():
        for tag in ids:
            matching=[x for x in rows if x.get("sj_div") in ("IS","CIS") and
                      x.get("account_id")==tag and x.get("account_detail") in ("-",None,"")]
            target=next((x for x in matching if amount(x.get("thstrm_amount")) is not None),None)
            if target:
                out[label]={"currentKRW":amount(target.get("thstrm_amount")),
                            "priorYearQuarterKRW":amount(target.get("frmtrm_q_amount")),
                            "tag":tag,"currency":"KRW"}
                break
    return out
def accounts(code,report):
    if not report:return None
    for division in ("CFS","OFS"):
        r=fetch("fnlttSinglAcntAll.json",{"corp_code":code,"bsns_year":report["year"],
                "reprt_code":report["reportCode"],"fs_div":division})
        if r.get("status")=="013":continue
        if r.get("status")!="000":raise ValueError("DART accounts status: "+str(r.get("status")))
        values=extract([x for x in r.get("list",[]) if x.get("fs_div")==division])
        if values:
            return {"basis":"연간 12개월" if report["month"]=="12" else "손익계산서 3개월",
                    "statement":"연결" if division=="CFS" else "별도",
                    "metrics":values}
    return None
def build():
    with open(ROOT/"research-universe.json",encoding="utf-8") as f:universe=json.load(f)
    tracked=[x for x in universe.get("companies",[]) if x.get("market")=="한국"]
    if len(tracked)!=5:raise ValueError("Exactly five Korean coverage companies are expected")
    valid=len(KEY)==40
    mapcodes=corp_codes() if valid else {}
    result=[]
    errors=[]
    for company in tracked:
        ticker=company["ticker"]
        row={"ticker":ticker,"name":company["name"],"status":"dart_key_required" if not valid else "company_unmatched",
             "report":None,"statement":None,"source":"https://dart.fss.or.kr/"}
        if valid:
            identified=mapcodes.get(ticker)
            if identified:
                row["corpCode"],row["officialName"]=identified
                try:
                    row["report"]=latest(row["corpCode"])
                    if row["report"]:
                        row["source"]=row["report"]["url"]
                        row["status"]="filing_verified"
                        row["statement"]=accounts(row["corpCode"],row["report"])
                        if row["statement"]:row["status"]="financials_verified"
                    else:row["status"]="no_recent_filing"
                except Exception as exc:
                    row["status"]="source_error"
                    errors.append({"ticker":ticker,"reason":type(exc).__name__})
        result.append(row)
        if valid:time.sleep(.25)
    out={"schemaVersion":1,"generatedAt":datetime.now(timezone.utc).isoformat(),
         "status":"key_required" if not valid else "partial" if errors else "ok",
         "source":"OpenDART corpCode, list and fnlttSinglAcntAll",
         "count":5,"verified":sum(x["status"]=="financials_verified" for x in result),
         "companies":result,"errors":errors,
         "limitations":[
           "OpenDART의 사업·반기·분기보고서만; 사내 최신 발표와 다를 수 있음",
           "반기·분기 손익계산서의 당기금액은 3개월, 연간은 12개월. 비교기간이 없으면 성장률을 계산하지 않음",
           "은행·보험 매출·NIM·CET1·K-ICS·CSM 및 신약승인 정보는 자동 추정하지 않음",
           "DART_API_KEY는 서버 비밀값. 사이트·자료 JSON에 포함하지 않음",
           "기존 비공개 한국 커버리지 브리프 원본은 연결되지 않음"
         ]}
    OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"OpenDART official statements {out['verified']}/5, status={out['status']}")
if __name__=="__main__":
    build()
