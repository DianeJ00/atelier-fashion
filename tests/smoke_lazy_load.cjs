/* Load only overview data on first visit; defer clinical details until needed. */
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const names=["research-universe.json","market-relative.json","market-reviewed.json",
 "stock-relative.json","research-pipeline.json","clinical-trials.json"];
const datasets=Object.fromEntries(names.map(x=>[x,JSON.parse(read(x))]));
const hits=[],window={renders:0,atelierRerender(){this.renders++}};
const document={addEventListener(){},querySelector(){return null}};
const ctx={window,document,URL,console,encodeURIComponent,
 fetch:async url=>{
  const f=String(url).replace("./","");
  hits.push(f);
  return {ok:Boolean(datasets[f]),json:async()=>datasets[f]};
 }};
vm.runInNewContext(read("atelier-data.js"),ctx);
vm.runInNewContext(read("research2.js"),ctx);
(async()=>{
 await window.ATELIER2.load();
 assert.equal(window.ATELIER2.data.companies.length,52);
 for(const file of ["research-universe.json","market-relative.json","stock-relative.json","market-reviewed.json"])
  assert.ok(hits.includes(file),"missing overview dependency "+file);
 for(const file of ["research-pipeline.json","clinical-trials.json"])
  assert.ok(!hits.includes(file),"detail fetched before navigation: "+file);
 const count=hits.length;
 await Promise.all([window.ATELIER2.loadDetails(),window.ATELIER2.loadDetails()]);
 assert.ok(hits.includes("research-pipeline.json"));
 assert.ok(hits.includes("clinical-trials.json"));
 assert.equal(hits.length,count+2,"concurrent detail loads should share requests");
 await window.ATELIER2.loadDetails();
 assert.equal(hits.length,count+2,"detail cache should not refetch");
 const legacy=read("legacy-fashion.js");
 assert.ok(!/render\(\);loadResearchFeed\(\);window\.ATELIER2/.test(legacy),"legacy sources should not eagerly fetch");
 assert.ok(legacy.includes("primePageData(page)"),"menu navigation should trigger scoped data loads");
 assert.ok(legacy.includes("loadResearchFeed().catch"),"full source archive should load on relevant tab");
 console.log("ATELIER lazy data: overview 4 files / deferred clinical 2 files / single-flight PASS");
})().catch(e=>{console.error(e);process.exitCode=1});