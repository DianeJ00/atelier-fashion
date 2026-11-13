/* ATELIER 2.3 offline UI verification: decisions remain local until user saves. */
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const read=name=>fs.readFileSync(path.join(root,name),"utf8");
const storage={};
const localStorage={getItem(k){return storage[k]??null},setItem(k,v){storage[k]=v}};
const listeners={};
const document={
 addEventListener(type,fn){listeners[type]=fn},
 querySelector(selector){
  if(selector.includes("data-a3-hypothesis"))return {value:"예약 건수 증가 → 플랫폼 매출·FCF 개선"};
  if(selector.includes("data-a3-risk-override"))return {value:"이용건수는 늘지만 단위 수익성 하락"};
  if(selector.includes("data-a3-note"))return {value:"공식 실적 비교 후 담당자가 기록"};
  if(selector.includes("data-a3-quick-thesis"))return {value:"광고·구독 성장으로 FCF 확대"};
  if(selector.includes("data-a3-quick-entry"))return {value:"오늘 실적 발표와 신규계약을 확인함"};
  return null;
 }
};
const window={renders:0,atelierRerender(){this.renders++},atelierGotoWeekly(){this.renders++}};
const today=new Date().toISOString().slice(0,10);
const weekly={
 schemaVersion:1,periodStart:today,periodEnd:today,items:[
  {id:"SEC:UBER:test",sector:"소비재·서비스",ticker:"UBER",
   eventDate:today,tier:"공식 공시 · GAAP",
   title:"UBER · 매출 전년 대비 +9.6%",observation:"공식 매출 증가",
   investment:"예약액을 이익으로 전환",nextCheck:"현금흐름 확인",
   caveat:"실적 방향을 확정하지 않음",eventType:"10-Q",
   sourceLabel:"SEC 10-Q",sourceUrl:"https://www.sec.gov/test"}
 ],
 reviewCandidates:[
  {companyId:"US:UBER",ticker:"UBER",sector:"소비재·서비스",
   change:"UBER 10-Q 새 보고",evidenceDate:today,
   sourceUrl:"https://www.sec.gov/test"}],
 upcomingClinical:[],staleConsumerKpi:[]};
const trend={companies:[
 {ticker:"UBER",status:"period_compared",periodStart:"2026-07-01",periodEnd:"2026-09-30",
  fiscalYear:2026,fiscalPeriod:"Q3",filed:"2026-11-05",
  url:"https://www.sec.gov/test",metrics:{
   revenue:{value:14000000000,yoy:{percent:9.6,comparison:{start:"2025-07-01",end:"2025-09-30",value:13000000000}},
           qoq:{percent:4.3,comparison:{start:"2026-04-01",end:"2026-06-30",value:13500000000}}},
   operatingIncome:{value:200000000,yoy:{percent:-20,comparison:{value:250000000}}},
   netIncome:{value:130000000,yoy:{percent:5,comparison:{value:123809523}}}
  }}
 ]};
const feed={"atelier-weekly.json":weekly,"sec-trends.json":trend};
const ctx={window,document,localStorage,URL,console,Date,
 fetch:async url=>({ok:true,json:async()=>feed[String(url).replace("./","")]})};
vm.runInNewContext(read("atelier-data.js"),ctx,{timeout:3000});
vm.runInNewContext(read("research3.js"),ctx,{timeout:3000});
const click=(kind,id,choice,value)=>{
 const b={dataset:{a3:kind,id,choice,value}};
 listeners.click({target:{closest:()=>b},preventDefault(){},stopImmediatePropagation(){}});
};
(async()=>{
 await window.ATELIER3.load();
 assert.ok(window.ATELIER3.overview().includes("UBER · 매출"));
 assert.ok(window.ATELIER3.weekly("전체").includes("SEC 10-Q"));
 assert.ok(window.ATELIER3.weekly("전체").includes("주간 보고서 저장"));
 const markdown=window.ATELIER3.markdownReport("전체");
 assert.ok(markdown.includes("SEC 10-Q")&&markdown.includes("공식 매출 증가"));
 assert.ok(markdown.includes("투자 연결")&&markdown.includes("원문: https://www.sec.gov/test"));
 assert.ok(!window.ATELIER3.weekly("패션").includes("UBER · 매출"));
 const q=window.ATELIER3.secComparison("UBER");
 assert.ok(q.includes("+9.6%")&&q.includes("+4.3%"));
 assert.ok(q.includes("2025-07-01")&&q.includes("2026-06-30"));
 assert.ok(q.includes("FY26 3Q")&&q.includes("분기 종료 2026-09-30"));
 assert.ok(!q.includes("SEC 공시 기준 분기 실적 변화"));
 const fallback=window.ATELIER3.secComparison("UNKNOWN");
 assert.ok(fallback.includes("수집 대기"));
 const company={id:"US:UBER",ticker:"UBER",name:"Uber",focus:"수익화",risk:"할인 경쟁"};
 const universe=JSON.parse(read("research-universe.json")).companies;
 assert.equal(universe.length,52);
 const secDesk=window.ATELIER3.secArchive(universe);
 assert.ok(secDesk.includes("SEC 공시·분기 실적"));
 assert.ok(secDesk.includes("매출 증가, 영업이익 감소"),"summary derived from revenue and operating profit, not speculation");
 assert.ok(secDesk.includes("영업이익률"),"operating margin shown as arithmetic");
 assert.ok(secDesk.includes("전년 동기 -20%"),"verified GAAP year comparison preserved");
 assert.ok(secDesk.includes("https://www.sec.gov/test"),"original filing links are retained");
 assert.ok(!secDesk.includes("AI 수혜")&&!secDesk.includes("매수 추천"),"no invented cause or recommendation");
 const pharma=universe.find(c=>c.ticker==="LLY"),fashion=universe.find(c=>c.ticker==="RL");
 assert.ok(window.ATELIER3.companyEarningsLens(pharma).includes("제품별 매출·임상"),"pharma does not use generic retail KPI");
 assert.ok(window.ATELIER3.companyEarningsLens(fashion).includes("정가 판매·마진"),"fashion checks sales quality");
 assert.ok(window.ATELIER3.issuerLensBlock(pharma,trend.companies[0]).includes("개별 수치 확인 전"),
  "do not invent product-specific earnings when SEC has only consolidated accounts");
 window.ATELIER_CONSUMER={get:()=>({
  period:"2026 Q2",periodEnd:"2026-06-30",
  metrics:[{label:"총예약액",value:59.8,unit:"USD B",change:"20% 증가",basis:"운영 KPI · 매출 아님"}],
  sourceURL:"https://example.org/issuer-q2"
 })};
 const dated=window.ATELIER3.issuerLensBlock(universe.find(c=>c.ticker==="UBER"),trend.companies[0]);
 assert.ok(dated.includes("과거 분기"),"older issuer KPI cannot be presented as the latest SEC quarter");
 assert.ok(dated.includes("$59.8B")&&dated.includes("총예약액"),"official non-GAAP operating metric is identifiable");
 assert.ok(dated.includes("매출과 정의가 다름"),"prevent mixing gross bookings with GAAP revenue");
 const workspace=window.ATELIER3.thesisWorkspace(universe);
 assert.ok(workspace.includes("투자 가설")&&workspace.includes("투자 논리"));
 assert.ok(workspace.includes("새롭게 확인된 근거")&&workspace.includes("반증 조건과 다음 확인"));
 assert.ok(workspace.includes("판단 기록")&&workspace.includes("기업 목록"));
 assert.ok(workspace.includes("최근 원문")||workspace.includes("이번 주 근거"));
 assert.ok(!workspace.includes("r2-thesis-grid"));
 const before=window.ATELIER3.recordCard(company);
 assert.ok(before.includes("담당자 확정 전"));
 click("choose","US:UBER","강화");
 assert.equal(Object.keys(storage).length,0,"selection must not persist without Save");
 assert.ok(window.ATELIER3.recordCard(company).includes("is-selected"));
 assert.ok(window.ATELIER3.recordCard(company).includes("담당자 확정 전"));
 click("save","US:UBER");
 assert.ok(window.ATELIER3.recordCard(company).includes("확정: 강화"));
 assert.ok(Object.values(storage)[0].includes("공식 실적 비교 후 담당자가 기록"));
 const saved=JSON.parse(Object.values(storage)[0])["US:UBER"];
 assert.equal(saved.hypothesis,"예약 건수 증가 → 플랫폼 매출·FCF 개선");
 assert.equal(saved.riskOverride,"이용건수는 늘지만 단위 수익성 하락");
 assert.ok(window.ATELIER3.thesisWorkspace(universe).includes("저장 완료"));
 const journalBefore=window.ATELIER3.companyMemo(company);
 assert.ok(journalBefore.includes("나의 메모"));
 assert.ok(journalBefore.includes("초기 검증 질문"));
 assert.ok(journalBefore.includes("기존 투자 판단·반증 기록 보관"));
 assert.ok(journalBefore.includes("공식 실적 비교 후 담당자가 기록"));
 click("memoSave","US:UBER");
 const afterJournal=JSON.parse(storage["ATELIER_V23_THESIS_LOCAL_ONLY"])["US:UBER"];
 assert.equal(afterJournal.hypothesis,"광고·구독 성장으로 FCF 확대");
 assert.equal(afterJournal.memoEntries.length,1);
 assert.equal(afterJournal.memoEntries[0].text,"오늘 실적 발표와 신규계약을 확인함");
 assert.ok(Number.isFinite(Date.parse(afterJournal.memoEntries[0].at)));
 assert.equal(afterJournal.choice,"강화","old decision must be preserved");
 assert.equal(afterJournal.riskOverride,"이용건수는 늘지만 단위 수익성 하락");
 assert.equal(afterJournal.note,"공식 실적 비교 후 담당자가 기록");
 click("memoSave","US:UBER");
 const two=JSON.parse(storage["ATELIER_V23_THESIS_LOCAL_ONLY"])["US:UBER"];
 assert.equal(two.memoEntries.length,2);
 assert.notEqual(two.memoEntries[0].id,two.memoEntries[1].id);
 assert.ok(window.ATELIER3.companyMemo(company).includes("날짜별 기록"));
 assert.ok(window.ATELIER3.companyMemo(company).includes("2건"));
 click("clear","US:UBER");
 assert.ok(window.ATELIER3.recordCard(company).includes("담당자 확정 전"));
 click("thesisMode","","","새 근거");
 assert.ok(window.ATELIER3.thesisWorkspace(universe).includes("기업 목록"));
 assert.ok(window.ATELIER3.thesisWorkspace(universe).includes("이번 주 근거"));
 click("thesisSector","","","소비재·서비스");
 assert.ok(window.ATELIER3.thesisWorkspace(universe).includes("Uber"));
 assert.ok(!window.ATELIER3.thesisWorkspace(universe).includes("CeeDee Lamb"));
 click("thesisSector","","","전체");
 click("thesisMode","","","전체");
 listeners.input({target:{dataset:{a3Search:"true"},value:"UBER",selectionStart:4}});
 assert.ok(window.ATELIER3.thesisWorkspace(universe).includes("기업 목록 <span>1개"));
 listeners.input({target:{dataset:{a3Search:"true"},value:"",selectionStart:0}});
 assert.ok(window.ATELIER3.thesisWorkspace(universe).includes("기업 목록 <span>52개"));
 assert.ok(read("index.html").includes("research3.js"));
 assert.ok(read("index.html").includes("research3.css"));
 console.log("ATELIER 2.3 smoke: weekly source, SEC period compare, local-only thesis decision PASS");
})().catch(e=>{console.error(e);process.exitCode=1});
