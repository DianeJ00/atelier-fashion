/* Verified market snapshot, no hidden auto-updated price claims, public progress audit. */
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
const handler={};
const w={renders:0,atelierRerender(){this.renders++}};
const context={window:w,document:{addEventListener(t,fn){handler[t]=fn}},URL,console,encodeURIComponent,
fetch:async s=>({ok:true,json:async()=>resources[String(s).replace("./","")]})};
vm.runInNewContext(read("consumer2.js"),context);
vm.runInNewContext(read("research2.js"),context);
vm.runInNewContext(read("health.js"),context);
(async()=>{
 await w.ATELIER2.load();await w.ATELIER_HEALTH.load();
 const prices=w.ATELIER2.prices;
 assert.equal(prices.status,"source_verified_snapshot");
 assert.equal(prices.asOf,"2026-11-04");
 assert.equal(prices.returns.XLK["3m"],-5.56);
 assert.equal(prices.returns.XBI["3m"],4.75);
 const ret=w.ATELIER2.overview();
 assert.ok(ret.includes("시장 대비 산업 상대강도"));
 assert.ok(ret.includes("+10.31%"));
 assert.ok(ret.includes("2026-08-04"));
 assert.ok(ret.includes("2026-11-04"));
 assert.ok(ret.includes("외부")||ret.includes("원문"));
 assert.ok(!ret.includes("배당·분할 조정 종가 기준, 실제 제공 시에만 계산"),"no misleading total-return description on source snapshot");
 assert.ok(ret.includes("TradingView"));
 assert.ok(ret.includes("추적 47개 미국 종목의 상대수익률"));
 assert.ok(!ret.includes('class="r2-breadth"'),"avoid blank 47-stock breadth table");
 assert.ok(read("index.html").includes('market-live.js'));
 const urls=prices.referenceURLs||{};
 for(const t of ["SPY","QQQ","XLK","XBI","XLY","XRT"])
   assert.ok(urls[t].startsWith("https://raymondjames.websol.barchart.com/"));
 const audit=w.ATELIER_HEALTH.panel();
 assert.ok(audit.includes("자료 수집")&&audit.includes("검증"));
 assert.ok(read(".github/workflows/weekly-research.yml").includes("data-health.json"));
 console.log("ATELIER 2.6 market source snapshot, excess returns, live widget and coverage audit PASS");
})().catch(e=>{console.error(e);process.exitCode=1});
