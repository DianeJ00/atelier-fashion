/* ATELIER private backup: browser-only, explicit user download and restore. */
(()=>{"use strict";
const NOTE_KEY="atelierNotes",THESIS_KEY="ATELIER_V23_THESIS_LOCAL_ONLY";
const SCHEMA="atelier-private-backup-v1",MAX_BYTES=2*1024*1024;
function ownObject(x){return x!==null&&typeof x==="object"&&!Array.isArray(x)}
function unpack(text,kind){
 const value=JSON.parse(text??(kind==="notes"?"[]":"{}"));
 if(kind==="notes"){
  if(!Array.isArray(value)||value.length>5000||value.some(x=>!ownObject(x)))throw Error("개인 노트 형식 오류");
 }else{
  if(!ownObject(value)||Object.keys(value).length>1000)throw Error("투자 판단 기록 형식 오류");
  if(Object.entries(value).some(([id,entry])=>
   id==="__proto__"||id==="constructor"||id==="prototype"||id.length>160||!ownObject(entry)))
   throw Error("투자 판단 기록 형식 오류");
 }
 return value;
}
function make(){
 const notes=unpack(localStorage.getItem(NOTE_KEY),"notes");
 const theses=unpack(localStorage.getItem(THESIS_KEY),"theses");
 const payload={schema:SCHEMA,exportedAt:new Date().toISOString(),notes,theses};
 if(JSON.stringify(payload).length>MAX_BYTES)throw Error("백업 파일 제한 용량 초과");
 return payload;
}
function validate(payload){
 if(!ownObject(payload)||payload.schema!==SCHEMA)throw Error("ATELIER 통합 백업 파일이 아닙니다");
 if(typeof payload.exportedAt!=="string"||!Number.isFinite(Date.parse(payload.exportedAt)))
  throw Error("백업 생성 시각이 올바르지 않습니다");
 if(!Array.isArray(payload.notes)||!ownObject(payload.theses))
  throw Error("개인 기록 구조가 올바르지 않습니다");
 const notes=unpack(JSON.stringify(payload.notes),"notes");
 const theses=unpack(JSON.stringify(payload.theses),"theses");
 if(JSON.stringify(payload).length>MAX_BYTES)throw Error("백업 파일 제한 용량 초과");
 return {notes,theses};
}
function restore(payload){
 const value=validate(payload);
 const oldNotes=localStorage.getItem(NOTE_KEY),oldTheses=localStorage.getItem(THESIS_KEY);
 const nextNotes=JSON.stringify(value.notes),nextTheses=JSON.stringify(value.theses);
 try{
  localStorage.setItem(NOTE_KEY,nextNotes);
  localStorage.setItem(THESIS_KEY,nextTheses);
 }catch(e){
  try{
   if(oldNotes===null)localStorage.removeItem(NOTE_KEY);
   else localStorage.setItem(NOTE_KEY,oldNotes);
   if(oldTheses===null)localStorage.removeItem(THESIS_KEY);
   else localStorage.setItem(THESIS_KEY,oldTheses);
  }catch(_){
   throw Error("복원에 실패했고 자동 원상복구도 실패했습니다. 기존 백업 파일을 보관하고 브라우저 저장 공간을 확인하세요");
  }
  throw Error("복원 중 저장 공간 오류가 발생해 기존 기록을 유지했습니다");
 }
 return {notes:value.notes.length,theses:Object.keys(value.theses).length};
}
function tell(message){
 const status=document.getElementById("personal-backup-status");
 if(status)status.textContent=message;
}
function exportFile(){
 try{
  const payload=make(),json=JSON.stringify(payload,null,2);
  const blob=new Blob([json],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;
  link.download="ATELIER_개인기록_"+new Date().toISOString().slice(0,10)+".json";
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  tell("개인 메모 "+payload.notes.length+"건·투자 판단 "+Object.keys(payload.theses).length+"건 백업 파일을 생성했습니다.");
 }catch(e){tell(e.message||"백업 파일을 만들 수 없습니다")}
}
async function importFile(file){
 if(!file)return;
 try{
  if(file.size>MAX_BYTES)throw Error("2MB를 초과하는 파일은 불러올 수 없습니다");
  const payload=JSON.parse(await file.text());
  const records=validate(payload);
  const resultText="기존 개인 메모·투자 판단 기록을 이 파일 내용으로 모두 교체합니다. 현재 기록을 먼저 백업했는지 확인하세요.\n\n"+
   "교체할 기록: 메모 "+records.notes.length+"건, 투자 판단 "+Object.keys(records.theses).length+"건.\n계속할까요?";
  if(!window.confirm(resultText)){tell("기록 복원을 취소했습니다.");return}
  const result=restore(payload);
  tell("메모 "+result.notes+"건·투자 판단 "+result.theses+"건 복원 완료. 화면을 다시 불러옵니다.");
  window.location.reload();
 }catch(e){tell(e.message||"복원 파일을 확인할 수 없습니다")}
}
document.addEventListener("click",event=>{
 const node=event.target.closest?.("[data-personal-backup]");
 if(!node)return;
 const action=node.dataset.personalBackup;
 if(action==="export"){event.preventDefault();exportFile()}
 else if(action==="import"){
  event.preventDefault();
  document.getElementById("personal-backup-input")?.click();
 }
});
document.addEventListener("change",event=>{
 if(event.target?.id!=="personal-backup-input")return;
 const file=event.target.files?.[0];
 event.target.value="";
 importFile(file);
});
window.ATELIER_BACKUP=Object.freeze({make,validate,restore,exportFile,importFile});
})();