/* Embedded provider quote widget: ticker integrity, opt-in, no API data storage. */
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const ROOT=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
const issuerList=JSON.parse(read("research-universe.json")).companies;
let created=0;
const make=tag=>({
 tagName:tag,children:[],style:{},className:"",textContent:"",
 append(...items){this.children.push(...items)},
 replaceChildren(...items){this.children=items},
 get isConnected(){return true}
});
const frame=make("div");
const doc={
 createElement(tag){created++;return make(tag)},
 getElementById(id){return id==="r2-tv-frame"?frame:null}
};
const win={};
vm.runInNewContext(read("atelier-quotes.js"),{document:doc,window:win,URL,encodeURIComponent});
const q=win.ATELIER_QUOTES;
assert.ok(q);
assert.equal(created,0,"no third-party script may load before an explicit click");
assert.equal(issuerList.length,52);
const mapped=issuerList.map(company=>q.quote(company));
assert.ok(mapped.every(Boolean),"all 52 tracked symbols must map to an explicit exchange");
assert.equal(new Set(mapped.map(x=>x.symbol)).size,52);
const item=id=>issuerList.find(x=>x.id===id);
assert.equal(q.quote(item("US:WMT")).symbol,"NASDAQ:WMT");
assert.equal(q.quote(item("US:VSXY")).symbol,"NYSE:VSXY");
assert.equal(q.quote(item("US:LLY")).symbol,"NYSE:LLY");
assert.equal(q.quote(item("KR:950260")).symbol,"KRX:950260");
assert.equal(q.quote(item("KR:950260")).yahoo,"https://finance.yahoo.com/quote/950260.KQ/");
assert.equal(q.quote(item("KR:278470")).yahoo,"https://finance.yahoo.com/quote/278470.KS/");
assert.equal(q.quote(item("US:WMT")).yahoo,"https://finance.yahoo.com/quote/WMT/");
assert.equal(q.quote({...item("US:LLY"),id:"US:HACK"}),null);
assert.equal(q.quote({...item("US:LLY"),ticker:"INJECT<img>"}),null);
assert.equal(q.quote({id:"US:UNKNOWN",ticker:"UNKNOWN",market:"미국"}),null);
assert.equal(q.config(item("US:LLY")).changeMode,"price-and-percent");
assert.equal(q.mount("invalid-target",item("US:LLY")),false);
assert.equal(created,0);
assert.equal(q.mount("r2-tv-frame",item("US:LLY")),true);
assert.equal(frame.children.length,1);
const wrap=frame.children[0];
const script=wrap.children.find(x=>x.tagName==="script");
assert.ok(script);
assert.equal(script.src,"https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js");
assert.equal(JSON.parse(script.textContent).symbols[0][1],"NYSE:LLY|1D");
assert.equal(wrap.children[1].children[0].href,"https://www.tradingview.com/symbols/NYSE-LLY/");
assert.ok(read("index.html").includes('src="./atelier-quotes.js"'));
assert.ok(read("scripts/validate_release.py").includes('"atelier-quotes.js"'));
assert.ok(read("research2.js").includes('data-r2="showQuote"'));
assert.ok(read("research2.js").includes('window.ATELIER_QUOTES?.mount'));
console.log("ATELIER free hosted quotes: 52 issuers, explicit exchanges, opt-in, Yahoo links, source credit PASS");