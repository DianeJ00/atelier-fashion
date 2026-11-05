/* Offline rendering/interaction smoke test for ATELIER 2.0. */
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const read=(name)=>fs.readFileSync(path.join(root,name),"utf8");
const names=["research-universe.json","research-pipeline.json","market-relative.json"];
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
 click("sector","내 담당 기업");
 assert.ok(win.ATELIER2.companyPage().includes("인제니아테라퓨틱스"));
 let brief=win.ATELIER2.theses();
 assert.ok(brief.includes("기존 논리와 새 근거"));
 assert.ok(brief.includes("DB손해보험"));
 assert.ok(!over.includes("NaN")&&!list.includes("undefined"));
 assert.equal(files["research-universe.json"].companies.filter(x=>x.market==="미국").length,47);
 assert.equal(files["research-universe.json"].companies.filter(x=>x.market==="한국").length,5);
 const html=read("index.html");
 assert.ok(html.includes("./research2.js")&&html.includes("./research2.css"));
 assert.ok(html.includes("legacyCompanyPage"));
 console.log("ATELIER 2.0 smoke: 52 companies, relative-benchmark scaffolding, disease filter, asset details, domestic briefing, legacy fashion OK");
})().catch(err=>{console.error(err);process.exitCode=1});
