/* Explicit, local-only backup/restore for both legacy notes and investor decisions. */
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const storage={"atelierNotes":JSON.stringify([{id:"n1",ticker:"RL",title:"매출",url:"https://example.org/a"}]),
 "ATELIER_V23_THESIS_LOCAL_ONLY":JSON.stringify({"US:UBER":{choice:"강화",hypothesis:"FCF",note:"실적",riskOverride:"수익성"}})};
const callbacks={};let shouldConfirm=true,reloads=0,failKey=null,status={textContent:""};
const localStorage={
 getItem:k=>Object.prototype.hasOwnProperty.call(storage,k)?storage[k]:null,
 setItem(k,v){if(failKey===k){failKey=null;throw Error("quota")}storage[k]=String(v)},
 removeItem(k){delete storage[k]}
};
const document={
 addEventListener(type,fn){callbacks[type]=fn},
 getElementById(id){return id==="personal-backup-status"?status:null},
 createElement(){return {click(){}}}
};
const window={confirm(){return shouldConfirm},location:{reload(){reloads++}}};
vm.runInNewContext(read("atelier-backup.js"),{window,document,localStorage,Date,URL,Blob,JSON,setTimeout,console});
const api=window.ATELIER_BACKUP;assert.ok(api);
(async()=>{
 const copy=api.make();
 assert.equal(copy.schema,"atelier-private-backup-v1");
 assert.equal(copy.notes.length,1);
 assert.equal(copy.theses["US:UBER"].choice,"강화");
 const previous={...storage};
 const fresh={...copy,notes:[{id:"new",title:"신규 메모",url:"https://example.org"}],
   theses:{"US:LLY":{choice:"유지",hypothesis:"원문 검증"}}};
 const restored=api.restore(fresh);
 assert.equal(restored.notes,1);
 assert.equal(restored.theses,1);
 assert.equal(JSON.parse(storage.atelierNotes)[0].id,"new");
 assert.equal(JSON.parse(storage.ATELIER_V23_THESIS_LOCAL_ONLY)["US:LLY"].choice,"유지");
 // Restoring the original file must reproduce both pre-existing stores.
 api.restore(copy);
 assert.equal(storage.atelierNotes,previous.atelierNotes);
 assert.equal(storage.ATELIER_V23_THESIS_LOCAL_ONLY,previous.ATELIER_V23_THESIS_LOCAL_ONLY);
 for(const invalid of [{...copy,schema:"not-atelier"},{...copy,notes:{}},
    {...copy,theses:[]},{...copy,theses:JSON.parse('{"__proto__":{}}')}}]){
  assert.throws(()=>api.restore(invalid));
 }
 assert.equal(storage.atelierNotes,previous.atelierNotes);
 // Failure writing second store must revert the first store too.
 failKey="ATELIER_V23_THESIS_LOCAL_ONLY";
 assert.throws(()=>api.restore(fresh),/기존 기록을 유지/);
 assert.equal(storage.atelierNotes,previous.atelierNotes);
 assert.equal(storage.ATELIER_V23_THESIS_LOCAL_ONLY,previous.ATELIER_V23_THESIS_LOCAL_ONLY);
 // UI must not replace local records until the user explicitly confirms.
 const file={size:120,text:async()=>JSON.stringify(fresh)};
 shouldConfirm=false;
 await api.importFile(file);
 assert.equal(reloads,0);
 assert.equal(storage.atelierNotes,previous.atelierNotes);
 shouldConfirm=true;
 await api.importFile(file);
 assert.equal(reloads,1);
 assert.equal(JSON.parse(storage.atelierNotes)[0].id,"new");
 assert.equal(JSON.parse(storage.ATELIER_V23_THESIS_LOCAL_ONLY)["US:LLY"].choice,"유지");
 assert.ok(read("index.html").includes('src="./atelier-backup.js"'));
 assert.ok(read("legacy-fashion.js").includes('data-personal-backup="export"'));
 assert.ok(read("legacy-fashion.js").includes('data-personal-backup="import"'));
 assert.ok(read("scripts/prepare_site.py").includes('"atelier-backup.js"'));
 console.log("ATELIER private backup: both local stores / confirm / rollback / no network / schema PASS");
})().catch(e=>{console.error(e);process.exitCode=1});