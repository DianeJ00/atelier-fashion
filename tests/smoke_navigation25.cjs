/* ATELIER 2.5: navigation and nonduplicated information architecture smoke tests. */
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const html=read("index.html");
const legacy=read("legacy-fashion.js");
const nav=[...html.matchAll(/<button class="nav-item(?: active)?" data-page="([^"]+)"/g)].map(x=>x[1]);
assert.deepEqual(nav,["overview","insights","companies","hub"]);
assert.ok(!nav.includes("theses"));
assert.ok(legacy.includes("function legacyOverviewArchive()"));
assert.ok(legacy.includes("window.atelierLegacyThesesFor="));
assert.ok(legacy.includes("window.atelierGotoCompanyDecision="));
assert.ok(legacy.includes("function nav(page){if(page==='theses'"));
const legacyStart=legacy.indexOf("function overview(){");
const legacyEnd=legacy.indexOf("function legacyOverviewArchive(){");
assert.ok(legacyStart>=0&&legacyEnd>legacyStart);
const homeSource=legacy.slice(legacyStart,legacyEnd);
assert.ok(homeSource.includes("window.ATELIER2?.overview()"));
assert.ok(!homeSource.includes("weeklyPanel()"));
assert.ok(!homeSource.includes("financialSummary()"));
const dataPaths=[
 "research-universe.json","research-pipeline.json","market-relative.json",
 "clinical-trials.json","stock-relative.json","consumer-official.json",
 "atelier-weekly.json","sec-trends.json"
];
const files=Object.fromEntries(dataPaths.map(p=>[p,JSON.parse(read(p))]));
const calls={renders:0,companies:0,weekly:0,legacy:t=>[]};
const listeners={};
const document={
 addEventListener(type,fn){(listeners[type]||=([])).push(fn)},
 querySelector(){return null}
};
const storage={};
const localStorage={
 getItem:k=>storage[k]??null,
 setItem:(k,v)=>{storage[k]=v}
};
const window={
 atelierRerender(){calls.renders++},
 atelierGotoCompanies(){calls.companies++},
 atelierGotoWeekly(){calls.weekly++},
 atelierLegacyThesesFor(){return []}
};
const ctx={
 window,document,localStorage,URL,encodeURIComponent,console,Date,
 fetch:async u=>({ok:true,json:async()=>files[String(u).replace("./","")]})
};
vm.runInNewContext(read("atelier-data.js"),ctx);
vm.runInNewContext(read("consumer2.js"),ctx);
vm.runInNewContext(read("research3.js"),ctx);
vm.runInNewContext(read("research2.js"),ctx);
function click(key,value){
 let stopped=false;
 const b={dataset:{r2:key,val:value,a3:key,id:value,choice:value}};
 const e={
  target:{closest(q){return q==="[data-a3]"?null:q==="[data-r2]"?b:null}},
  preventDefault(){},stopImmediatePropagation(){stopped=true}
 };
 for(const fn of listeners.click||[]){fn(e);if(stopped)break}
}
(async()=>{
 await window.ATELIER2.load();
 await window.ATELIER2.loadDetails();
 await window.ATELIER3.load();
 await window.ATELIER_CONSUMER.load();
 assert.equal(window.ATELIER2.data.companies.length,52);
 const home=window.ATELIER2.overview();
 const order=[
   home.indexOf("시장 대비 산업 상대강도"),
   home.indexOf("산업별 핵심 변화"),
   home.indexOf("먼저 확인할 변화 3건"),
   home.indexOf("새 근거를 검토할 기업")
 ];
 assert.ok(order.every(v=>v>=0),"all four current stages visible");
 assert.deepEqual(order,order.slice().sort((a,b)=>a-b),"market -> industry -> signals -> decision");
 assert.ok(!home.includes("바이오 치료제 개발·시험 일정"),"no homepage clinical detail duplicate");
 assert.ok(!home.includes("산업별 분석 기준"),"no duplicate shortcut section");
 assert.ok(!home.includes("미국 소비재 공식 실적 요약"),"no duplicate issuer KPI report on home");
 assert.ok(!home.includes('class="a3-change"'),"homepage only headlines, not verbose weekly cards");
 assert.ok(home.includes("공식 공시 우선"),"home explains ranking policy");
 assert.ok(!home.includes("원문으로 확인한 변화 TOP 3"),"avoid ungrounded investment ranking");
 assert.equal((home.match(/class="a5-industry"/g)||[]).length,4);
 const weeklyAll=window.ATELIER2.weeklyIntro();
 assert.ok(weeklyAll.includes("산업별")||weeklyAll.includes("이번 주 투자 리서치"));
 assert.equal((weeklyAll.match(/class="a3-report"/g)||[]).length,1);
 assert.ok(weeklyAll.includes("판단이 필요한 기업")||weeklyAll.includes("담당자 판단"));
 assert.ok(!weeklyAll.includes('class="r2-weekly-grid"'),"no decorative repeated industry tiles");
 click("sector","소비재·서비스");
 click("company","US:UBER");
 click("tab","나의 메모");
 const decision=window.ATELIER2.companyPage();
 assert.ok(decision.includes('class="r2-detail-body r5-decision"'));
 assert.ok(decision.includes("나의 투자 논리"));
 assert.ok(decision.includes("새 메모"));
 assert.ok(decision.includes("초기 검증 질문"));
 assert.ok(decision.includes('data-a3="memoSave"'));
 // The weekly candidates rotate; verify the first actual candidate, not a fixed ticker.
 const candidate=(files["atelier-weekly.json"].reviewCandidates||[])[0];
 if(candidate){
  click("sector","전체");
  click("company",candidate.companyId);
  click("tab","나의 메모");
  const evidenceHTML=window.ATELIER2.companyPage();
  assert.ok(evidenceHTML.includes('data-a3="reviewEvidence"'),"new evidence has explicit review control");
  const reviewed=window.ATELIER3.records;
  reviewed[candidate.companyId]={...(reviewed[candidate.companyId]||{}),at:"2026-11-13T12:00:00Z",
   memoEntries:[{id:"memo-only",at:"2026-11-13T12:00:00Z",text:"memo is not evidence review"}]};
  assert.ok(window.ATELIER3.attentionQueue().includes('data-id="'+candidate.companyId+'"'),"memo edit alone must not clear review queue");
  const confirmButton={dataset:{a3:"reviewEvidence",id:candidate.companyId},textContent:"",disabled:false,classList:{add(){}}};
  const confirmEvent={target:{closest(selector){return selector==="[data-a3]"?confirmButton:null}},preventDefault(){},stopImmediatePropagation(){}};
  for(const fn of listeners.click||[])fn(confirmEvent);
  assert.ok(reviewed[candidate.companyId].reviewedEvidence,"review state is stored separately");
  assert.equal(reviewed[candidate.companyId].at,"2026-11-13T12:00:00Z","review does not alter memo timestamp");
  assert.ok(!window.ATELIER3.attentionQueue().includes('data-id="'+candidate.companyId+'"'),"confirmed evidence leaves review queue");
  click("sector","소비재·서비스");
  click("company","US:UBER");
  click("tab","나의 메모");
 }
 assert.equal((decision.match(/class="t4-step-num"/g)||[]).length,0,"simple journal replaces four-step embedded view");
 assert.ok(!decision.includes("a3-review-card"),"no duplicate mini review");
 assert.ok(!decision.includes("t4-editor-header"),"company title is not repeated in embedded view");
 assert.ok(!decision.includes("r2-thesis-grid"),"no thesis-grid duplicate");
 assert.ok(!decision.includes("이번 주 투자 논리를 바꿀 근거"),"weekly source detail stays in weekly");
 click("company","US:NFLX");
 assert.equal(window.ATELIER2.state.detailTab,"나의 메모","memo tab survives company switch");
 assert.ok(window.ATELIER2.companyPage().includes("Netflix"));
 click("tab","핵심 KPI");
 const kpi=window.ATELIER2.companyPage();
 assert.ok(kpi.includes("회사 공식 실적")||kpi.includes("공식 실적"));
 assert.ok(!kpi.includes('data-a3="memoSave"'),"company results do not repeat memo editor");
 assert.ok(kpi.includes("최근 주요 이슈"));
 click("weeklySector","소비재·서비스");
 const consumerWeekly=window.ATELIER2.weeklyIntro();
 assert.ok(consumerWeekly.includes("소비재 15개 기업"));
 assert.ok(consumerWeekly.includes("<details"),"deep source data is folded by default");
 console.log("ATELIER navigation: verified-first signals, separate evidence review, source-tagged issues, four navigation items PASS");
})().catch(err=>{console.error(err);process.exitCode=1});
