/* Dynamic market-data regression: tested against both licensed-live and fallback snapshots. */
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const read=s=>fs.readFileSync(path.join(root,s),"utf8");
const inputs=[
 "research-universe.json","market-relative.json","market-reviewed.json",
 "research-pipeline.json","clinical-trials.json","stock-relative.json",
 "consumer-official.json","data-health.json"
];
const resources=Object.fromEntries(inputs.map(s=>[s,JSON.parse(read(s))]));
const handler={},headerNodes={};
const w={renders:0,atelierRerender(){this.renders++}};
const context={
 window:w,
 document:{
  addEventListener(t,fn){handler[t]=fn},
  getElementById(id){return headerNodes[id]??(headerNodes[id]={textContent:""})}
 },
 URL,console,encodeURIComponent,
 fetch:async s=>({ok:true,json:async()=>resources[String(s).replace("./","")]})
};
vm.runInNewContext(read("atelier-data.js"),context);
vm.runInNewContext(read("consumer2.js"),context);
vm.runInNewContext(read("research2.js"),context);
vm.runInNewContext(read("health.js"),context);
function validateCommon(markup){
 assert.ok(markup.includes("시장 대비 산업 상대강도"));
 assert.ok(markup.includes("TradingView"));
 assert.ok(markup.includes("최근 거래일까지 자동 반영되는 ETF 비교 차트"));
 assert.ok(markup.includes("아래 표는 별도 데이터 기준일"));
 assert.ok(markup.includes("XRT는 패션 전용이 아닌 미국 유통 ETF"));
 assert.ok(!markup.includes("NaN"));
 assert.ok(read("market-live.js").includes("embed-widget-advanced-chart.js"));
 for(const etf of ["AMEX:XLK","AMEX:XBI","AMEX:XLY","AMEX:XRT"])
  assert.ok(read("market-live.js").includes(etf),"comparison ETF missing: "+etf);
 assert.ok(read("index.html").includes('market-live.js'));
}
(async()=>{
 await w.ATELIER2.load();
 await w.ATELIER_HEALTH.load();
 const market=resources["market-relative.json"],snap=resources["market-reviewed.json"];
 const chosen=w.ATELIER_DATA.effectiveMarket(market,snap);
 assert.equal(w.ATELIER2.prices.status,chosen.status);
 assert.equal(w.ATELIER2.prices.asOf,chosen.asOf);
 const report=w.ATELIER2.overview();
 validateCommon(report);
 assert.ok(report.includes(chosen.asOf),"rendered reference date must follow actual data");
 const expected=chosen.returns?.XBI?.["3m"]-chosen.returns?.XLK?.["3m"];
 if(Number.isFinite(expected)){
   const formatted=(expected>0?"+":"")+expected.toFixed(2)+"%";
   assert.ok(report.includes(formatted),"rendered excess return must match data, not a fixed value");
 }
 assert.ok(!report.includes("배당·분할 조정 종가 기준, 실제 제공 시에만 계산"),"snapshot must never be claimed as licensed total return");
 assert.ok(headerNodes["top-datum"].textContent.includes("마지막 자료 수집 점검"));
 assert.ok(!headerNodes["top-datum"].textContent.includes("2026-11-03"),"legacy date must not be site-wide freshness");
 assert.ok(read("index.html").includes("최신 자료 점검 확인 중 · 시세는 출처별 기준일"));
 const audit=w.ATELIER_HEALTH.panel();
 assert.ok(audit.includes("지금 실제로 확인되는 자료와 남은 작업"));
 assert.ok(read(".github/workflows/weekly-research.yml").includes("data-health.json"));

 // Synthetic licensed feed: this stays stable while operational market data changes.
 w.ATELIER_DATA.invalidate("market");
 resources["market-relative.json"]={
  status:"ok",asOf:"2026-12-01",
  periodDates:{"3m":"2026-09-01"},
  returns:{
    XLK:{"3m":10.50},XBI:{"3m":13.75},XLY:{"3m":11.25},
    XRT:{"3m":8.25},SPY:{"3m":7.50},QQQ:{"3m":12.50}
  },referenceURLs:{}
 };
 w.ATELIER_DATA.invalidate("health");
 resources["data-health.json"]={
  ...resources["data-health.json"],
  generatedAt:"2026-12-01T14:00:00+00:00",
  items:(resources["data-health.json"].items||[]).map(x=>x.id==="market"
   ?{...x,status:"live",asOf:"2026-12-01",checkedAt:"2026-12-01T14:00:00+00:00"}:x)
 };
 await w.ATELIER2.load();
 await w.ATELIER_HEALTH.load();
 const licensed=w.ATELIER2.overview();
 validateCommon(licensed);
 assert.equal(w.ATELIER2.prices.status,"ok");
 assert.ok(licensed.includes("2026-12-01"));
 assert.ok(licensed.includes("+3.25%"),"licensed XBI excess return should be calculated from same-period ETF closes");
 assert.ok(!licensed.includes("원문을 대조한 날짜 고정 스냅샷"));
 assert.ok(headerNodes["snapshot-short"].textContent.includes("2026-12-01"));
 assert.ok(headerNodes["status-short"].textContent.includes("ETF 종가 자료 수집"));

 // A disconnected licensed feed must not silently present empty market prices.
 w.ATELIER_DATA.invalidate("market");
 resources["market-relative.json"]={status:"key_required",asOf:null,returns:{}};
 await w.ATELIER2.load();
 assert.equal(w.ATELIER2.prices.status,snap.status);
 assert.ok(w.ATELIER2.overview().includes("원문을 대조한 날짜 고정 스냅샷"));
 console.log("ATELIER daily market regression: live / fallback / provenance PASS");
})().catch(e=>{console.error(e);process.exitCode=1});
