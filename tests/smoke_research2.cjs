/* Offline rendering/interaction smoke test for ATELIER 2.0. */
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const read=(name)=>fs.readFileSync(path.join(root,name),"utf8");
const names=["research-universe.json","research-pipeline.json","market-relative.json","clinical-trials.json","stock-relative.json","consumer-official.json","price-events.json","weekly-research.json","weekly-content.json"];
const files=Object.fromEntries(names.map(x=>[x,JSON.parse(read(x))]));
const callbacks={};
const win={rerenders:0,atelierRerender(){this.rerenders++},atelierGotoCompanies(){this.rerenders++}};
const doc={addEventListener(type,fn){callbacks[type]=fn},querySelector(){return null}};
const ctx={window:win,document:doc,URL,encodeURIComponent,
 fetch:async url=>({ok:true,json:async()=>files[String(url).replace("./","")]}),console};
vm.runInNewContext(read("atelier-data.js"),ctx,{timeout:3000});
vm.runInNewContext(read("consumer2.js"),ctx,{timeout:3000});
vm.runInNewContext(read("atelier-quotes.js"),ctx,{timeout:3000});
vm.runInNewContext(read("research2.js"),ctx,{timeout:3000});
const click=(key,value)=>callbacks.click({
 target:{closest:()=>({dataset:{r2:key,val:value}})},
 preventDefault(){},stopImmediatePropagation(){}
});
(async()=>{
 await win.ATELIER2.load();
 await win.ATELIER2.loadDetails();
 await win.ATELIER_CONSUMER.load();
 assert.equal(win.ATELIER2.data.companies.length,52);
 assert.equal(win.ATELIER_CONSUMER.data.companies.length,15);
 const uber=win.ATELIER_CONSUMER.card({ticker:"UBER",name:"Uber Technologies"});
 assert.ok(uber.includes("총예약액")&&uber.includes("41억 건"));
 assert.ok(uber.includes("실적 원문")&&uber.includes("2026 Q3"));
 const retail=win.ATELIER_CONSUMER.card({ticker:"TGT",name:"Target"});
 assert.ok(retail.includes("동일매장매출")&&retail.includes("3.8%"));
 assert.ok(win.ATELIER_CONSUMER.latest().includes("CAVA"));
 let over=win.ATELIER2.overview();
 assert.ok(over.includes("시장 대비 산업 상대강도"));
 assert.ok(!over.includes("바이오 내부의 관심 분야"),"biotech category detail belongs in company analysis, not homepage");
 assert.ok(over.includes("SPY")&&over.includes("QQQ")&&over.includes("XLK"));
 let list=win.ATELIER2.companyPage();
 assert.ok(list.includes("Eli Lilly")&&list.includes("Walmart"));
 assert.ok(list.includes("실적·이슈")&&list.includes("나의 메모"));
 assert.ok(!list.includes('>투자 판단</button>'));
 assert.ok(list.includes("주가 · 일간 등락률 · 차트"));
 assert.ok(list.includes("https://finance.yahoo.com/quote/LLY/"));
 assert.ok(list.includes("주가·차트 보기"));
 assert.ok(!list.includes("embed-widget-symbol-overview.js"),"widget external JS loads only after click");
 click("sector","바이오·제약");
 assert.ok(win.ATELIER2.companyPage().includes("관심 질환"));
 assert.ok(!win.ATELIER2.companyPage().includes('data-r2="technology"'));
 click("diseaseJump","비만·대사");
 assert.ok(win.ATELIER2.companyPage().includes("Viking Therapeutics"));
 click("company","US:LLY");
 click("tab","질환·파이프라인");
 assert.ok(win.ATELIER2.companyPage().includes("tirzepatide"));
 const clinical=win.ATELIER2.clinical||{};
 if(clinical.assets?.some(x=>x.trials?.length)){
   const first=clinical.assets.find(x=>x.ticker==="LLY"&&x.trials?.length);
   if(first)assert.ok(win.ATELIER2.companyPage().includes(first.trials[0].nctId));
 }
 assert.ok(win.ATELIER2.weeklyIntro().includes("이번 주 투자 리서치"));
 click("weeklySector","바이오·제약");
 assert.ok(win.ATELIER2.weeklyIntro().includes("바이오 등록시험 · 질환별 연구 일정·원자료 자세히 보기"));
 if(win.ATELIER2.clinical?.weeklyInterpretation?.length){
   assert.ok(win.ATELIER2.weeklyIntro().includes("다음에 확인할 것"));
 }
 click("weeklySector","소비재·서비스");
 assert.ok(win.ATELIER2.weeklyIntro().includes("미국 소비재 공식 실적 요약"));
 click("sector","소비재·서비스");
 click("company","US:UBER");
 click("tab","핵심 KPI");
 assert.ok(win.ATELIER2.companyPage().includes("총예약액"));
 click("sector","패션");
 click("company","US:LEVI");
 click("tab","실적·이슈");
 const newsDetail=win.ATELIER2.companyPage();
 assert.ok(newsDetail.includes("최근 주요 이슈"));
 assert.ok(newsDetail.includes("기사 제목 · 본문 미확인"),"RSS title must not be labeled reviewed");
 assert.ok(newsDetail.includes("Yahoo Finance 뉴스"));
 assert.ok(!newsDetail.includes("업종별 핵심 지표"),"empty KPI tiles replaced");
 // New cross-industry RSS titles require canonical issuerId and remain unverified.
 const rss=files["weekly-research.json"];
 files["weekly-research.json"]={...rss,items:[
  ...rss.items,
  {id:"rss-fake-ll",title:"Eli Lilly reports research trial progress",
   url:"https://news.google.com/rss/articles/ll",date:"2026-11-09T01:00:00Z",
   platform:"Google News",ticker:"LLY",issuerId:"US:LLY",brand:"",
   creator:"Reuters",reviewStatus:"needs_review",discoveryMethod:"dated_rss_title_issuer_match"},
  {id:"rss-fake-cross",title:"Wrong company accidentally matched",
   url:"https://news.google.com/rss/articles/cross",date:"2026-11-09T01:00:00Z",
   platform:"Google News",ticker:"LLY",issuerId:"US:UBER",brand:"",
   creator:"Wrong",reviewStatus:"needs_review"},
  {id:"rss-fake-kr",title:"KB금융 이사회 공시 분석",
   url:"https://news.google.com/rss/articles/kr",date:"2026-11-09T01:00:00Z",
   platform:"Google News",ticker:"105560",issuerId:"KR:105560",brand:"",
   creator:"연합뉴스",reviewStatus:"needs_review",discoveryMethod:"dated_rss_title_issuer_match"}
 ]};
 win.ATELIER_DATA.invalidate("research");
 await win.ATELIER2.loadDetails();
 click("sector","바이오·제약");
 click("company","US:LLY");
 click("tab","실적·이슈");
 const llIssues=win.ATELIER2.companyPage();
 assert.ok(llIssues.includes("Eli Lilly reports research trial progress"));
 assert.ok(llIssues.includes("기사 제목 · 본문 미확인"));
 assert.ok(!llIssues.includes("Wrong company accidentally matched"));
 click("sector","내 담당 기업");
 click("company","KR:105560");
 click("tab","실적·이슈");
 assert.ok(win.ATELIER2.companyPage().includes("KB금융 이사회 공시 분석"));

 click("sector","내 담당 기업");
 assert.ok(win.ATELIER2.companyPage().includes("인제니아테라퓨틱스"));
 let brief=win.ATELIER2.theses();
 assert.ok(brief.includes("기존 논리와 새 근거"));
 assert.ok(brief.includes("DB손해보험"));
 // No licensed quotes: production feed must never invent an alert or event reason.
 win.ATELIER_DATA.invalidate("priceEvents");
 files["price-events.json"]={
   schemaVersion:1,status:"partial",publicDerivedAuthorized:true,
   asOf:"2026-11-04",coverage:{screened:1,attempted:5,notVerified:4,notAttempted:42,totalUS:47},
   eligibleEvents:1,
   events:[{
     issuerId:"US:LLY",ticker:"LLY",tradeDate:"2026-11-04",
     previousTradeDate:"2026-11-03",changePct:12.5,volatilityMultiple:3.1,
     evidenceState:"공식 사건 동기간 확인 · 인과 미확정",
     causalityConfirmed:false,source:{provider:"fixture",url:"https://example.org"},
     evidence:[{title:"공식 보고서 원문",publishedAt:"2026-11-04",
       sourceType:"sec_filing",url:"https://www.sec.gov/Archives/edgar/data/1/test"}]
   }]
 };
 await win.ATELIER2.load();
 const moveOverview=win.ATELIER2.overview();
 assert.ok(moveOverview.includes("일간 급등락 · 확인할 움직임"));
 assert.ok(moveOverview.includes("+12.50%"));
 assert.ok(moveOverview.includes("일부 종목만 확인"));
 assert.ok(moveOverview.includes("수집 시도 5개"));
 assert.ok(moveOverview.includes("확인 실패 4개"));
 assert.ok(moveOverview.includes("미시도 42개"));
 assert.ok(moveOverview.includes('data-r2="openCompany"'));
 click("sector","바이오·제약");
 click("company","US:LLY");
 const moveDetail=win.ATELIER2.companyPage();
 assert.ok(moveDetail.includes("가격 이벤트 · 기준일 2026-11-04"));
 assert.ok(moveDetail.includes("인과 미확정"));
 assert.ok(moveDetail.includes("https://www.sec.gov/Archives/edgar/data/1/test"));
 assert.ok(!moveDetail.includes("확정된 급등 원인"));
 // Revoking rights removes every derived price event from the UI.
 win.ATELIER_DATA.invalidate("priceEvents");
 files["price-events.json"]={
  schemaVersion:1,status:"permission_required",publicDerivedAuthorized:false,
  asOf:null,events:[],coverage:{screened:0,totalUS:47}
 };
 await win.ATELIER2.load();
 assert.ok(win.ATELIER2.overview().includes("일간 급등락 감지 · 시세 연동 대기"));
 assert.ok(!win.ATELIER2.companyPage().includes("가격 이벤트 · 기준일"));
 assert.ok(!over.includes("NaN")&&!list.includes("undefined"));
 assert.equal(files["research-universe.json"].companies.filter(x=>x.market==="미국").length,47);
 assert.equal(files["research-universe.json"].companies.filter(x=>x.market==="한국").length,5);
 // Synthetic, nonproduction fixtures prove the relative-%p display is date gated.
 win.ATELIER_DATA.invalidate("market");
 files["market-relative.json"]={
   status:"ok",asOf:"2026-11-04",periodDates:{"3m":"2026-08-05"},
   returns:{SPY:{"3m":3},QQQ:{"3m":4},XLK:{"3m":5},XBI:{"3m":7}},
   weeklyBreadth:{}
 };
 win.ATELIER_DATA.invalidate("stocks");
 files["stock-relative.json"]={
   status:"partial",asOf:"2026-11-04",
   companies:{LLY:{asOf:"2026-11-04",returns:{"3m":8},
     relative:{SPY:{"3m":5},QQQ:{"3m":4},XLK:{"3m":3}}}},
   summary:{}
 };
 await win.ATELIER2.load();
 click("sector","바이오·제약");
 click("company","US:LLY");
 const priced=win.ATELIER2.companyPage();
 assert.ok(priced.includes("종목 +8.00%"));
 assert.ok(priced.includes("지수 대비 +3.00%p"));
 click("market","한국");
 const domestic=win.ATELIER2.companyPage();
 assert.ok(domestic.includes("국내")||domestic.includes("조건에 맞는 기업이 없습니다"));
 const html=read("index.html");
 assert.ok(html.includes("./research2.js")&&html.includes("./research2.css"));
 assert.ok(html.includes("./consumer2.js")&&html.includes("./consumer2.css"));
 assert.ok(read("legacy-fashion.js").includes("legacyCompanyPage"));
 console.log("ATELIER 2.0 smoke: 52 companies, relative-benchmark scaffolding, disease filter, asset details, domestic briefing, legacy fashion OK");
})().catch(err=>{console.error(err);process.exitCode=1});
