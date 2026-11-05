/* Offline rendering/interaction smoke test for ATELIER 2.0. */
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const read=(name)=>fs.readFileSync(path.join(root,name),"utf8");
const names=["research-universe.json","research-pipeline.json","market-relative.json","clinical-trials.json","stock-relative.json"];
const files=Object.fromEntries(names.map(x=>[x,JSON.parse(read(x))]));
const callbacks={};
const win={rerenders:0,atelierRerender(){this.rerenders++},atelierGotoCompanies(){this.rerenders++}};
const doc={addEventListener(type,fn){callbacks[type]=fn},querySelector(){return null}};
const ctx={window:win,document:doc,URL,encodeURIComponent,
 fetch:async url=>({ok:true,json:async()=>files[String(url).replace("./","")]}),console};
vm.runInNewContext(read("research2.js"),ctx,{timeout:3000});
const click=(key,value)=>callbacks.click({
 target:{closest:()=>({dataset:{r2:key,val:value}})},
 preventDefault(){},stopImmediatePropagation(){}
});
(async()=>{
 await win.ATELIER2.load();
 assert.equal(win.ATELIER2.data.companies.length,52);
 let over=win.ATELIER2.overview();
 assert.ok(over.includes("시장 대비 산업 상대강도"));
 assert.ok(over.includes("바이오 내부의 관심 분야"));
 assert.ok(over.includes("SPY")&&over.includes("QQQ")&&over.includes("XLK"));
 let list=win.ATELIER2.companyPage();
 assert.ok(list.includes("Eli Lilly")&&list.includes("Walmart"));
 click("sector","바이오·제약");
 assert.ok(win.ATELIER2.companyPage().includes("치료 기술"));
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
 assert.ok(win.ATELIER2.weeklyIntro().includes("산업별 주간 리서치"));
 click("sector","내 담당 기업");
 assert.ok(win.ATELIER2.companyPage().includes("인제니아테라퓨틱스"));
 let brief=win.ATELIER2.theses();
 assert.ok(brief.includes("기존 논리와 새 근거"));
 assert.ok(brief.includes("DB손해보험"));
 assert.ok(!over.includes("NaN")&&!list.includes("undefined"));
 assert.equal(files["research-universe.json"].companies.filter(x=>x.market==="미국").length,47);
 assert.equal(files["research-universe.json"].companies.filter(x=>x.market==="한국").length,5);
 // Synthetic, nonproduction fixtures prove the relative-%p display is date gated.
 files["market-relative.json"]={
   status:"ok",asOf:"2026-11-04",periodDates:{"3m":"2026-08-05"},
   returns:{SPY:{"3m":3},QQQ:{"3m":4},XLK:{"3m":5},XBI:{"3m":7}},
   weeklyBreadth:{}
 };
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
 assert.ok(html.includes("legacyCompanyPage"));
 console.log("ATELIER 2.0 smoke: 52 companies, relative-benchmark scaffolding, disease filter, asset details, domestic briefing, legacy fashion OK");
})().catch(err=>{console.error(err);process.exitCode=1});
