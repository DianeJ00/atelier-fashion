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
 querySelector(selector){return selector.includes("data-a3-note")?{value:"공식 실적 비교 후 담당자가 기록"}:null}
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
 {ticker:"UBER",periodStart:"2026-07-01",periodEnd:"2026-09-30",
  url:"https://www.sec.gov/test",metrics:{
   revenue:{value:14000000000,yoy:{percent:9.6,comparison:{start:"2025-07-01",end:"2025-09-30",value:13000000000}},
           qoq:{percent:4.3,comparison:{start:"2026-04-01",end:"2026-06-30",value:13500000000}}}
  }}
 ]};
const feed={"atelier-weekly.json":weekly,"sec-trends.json":trend};
const ctx={window,document,localStorage,URL,console,Date,
 fetch:async url=>({ok:true,json:async()=>feed[String(url).replace("./","")]})};
vm.runInNewContext(read("research3.js"),ctx,{timeout:3000});
const click=(kind,id,choice)=>{
 const b={dataset:{a3:kind,id,choice}};
 listeners.click({target:{closest:()=>b},preventDefault(){},stopImmediatePropagation(){}});
};
(async()=>{
 await window.ATELIER3.load();
 assert.ok(window.ATELIER3.overview().includes("UBER · 매출"));
 assert.ok(window.ATELIER3.weekly("전체").includes("SEC 10-Q"));
 assert.ok(!window.ATELIER3.weekly("패션").includes("UBER · 매출"));
 const q=window.ATELIER3.secComparison("UBER");
 assert.ok(q.includes("+9.6%")&&q.includes("+4.3%"));
 assert.ok(q.includes("2025-07-01")&&q.includes("2026-06-30"));
 const company={id:"US:UBER",ticker:"UBER",name:"Uber",focus:"수익화",risk:"할인 경쟁"};
 const before=window.ATELIER3.recordCard(company);
 assert.ok(before.includes("담당자 확정 전"));
 click("choose","US:UBER","강화");
 assert.equal(Object.keys(storage).length,0,"selection must not persist without Save");
 assert.ok(window.ATELIER3.recordCard(company).includes("is-selected"));
 assert.ok(window.ATELIER3.recordCard(company).includes("담당자 확정 전"));
 click("save","US:UBER");
 assert.ok(window.ATELIER3.recordCard(company).includes("확정: 강화"));
 assert.ok(Object.values(storage)[0].includes("공식 실적 비교 후 담당자가 기록"));
 click("clear","US:UBER");
 assert.ok(window.ATELIER3.recordCard(company).includes("담당자 확정 전"));
 assert.ok(read("index.html").includes("research3.js"));
 assert.ok(read("index.html").includes("research3.css"));
 console.log("ATELIER 2.3 smoke: weekly source, SEC period compare, local-only thesis decision PASS");
})().catch(e=>{console.error(e);process.exitCode=1});
