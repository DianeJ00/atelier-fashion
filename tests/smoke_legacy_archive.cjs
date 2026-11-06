/* Browser-independent integrity checks for the preserved historical fashion app. */
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const dataSource=read("legacy-fashion-data.js"),logic=read("legacy-fashion.js");
const window={};
vm.runInNewContext(dataSource,{window});
const data=window.FASHION_DATA;
assert.ok(data,"historical fashion snapshot should load as an external file");
assert.equal(data.meta.snapshotDate,"2026-11-03");
assert.equal(data.peers.length,12);
assert.ok(data.peers.every(x=>typeof x.ticker==="string"));
assert.ok(logic.includes("function legacyOverviewArchive()"));
assert.ok(logic.includes("function legacyCompanyPage"));
assert.ok(logic.includes("localStorage.getItem('atelierNotes')"));
const html=read("index.html");
for(const name of ["legacy-fashion-data.js","legacy-fashion.js"]){
 assert.ok(html.includes('<script src="./'+name+'"></script>'),"missing external archive script "+name);
 assert.ok(read("scripts/validate_release.py").includes('"'+name+'"'),"must publish archive script");
}
assert.ok(html.indexOf('src="./legacy-fashion-data.js"')<html.indexOf('src="./legacy-fashion.js"'),"data before archive logic");
assert.ok(!html.includes("window.FASHION_DATA ="),"historical snapshot must not be embedded in HTML");
assert.ok(!html.includes("function legacyOverviewArchive()"),"historical app logic should be isolated from shell");
console.log("ATELIER legacy fashion: historical data / 12 peers / DOM boot order / private notes key PASS");
