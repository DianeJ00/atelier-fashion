/* ATELIER shared browser data access: canonical source paths and stable issuer IDs.
 * Successful JSON loads are reused per page; failed requests remain retryable.
 * Legacy fashion content is historical and is not overwritten by this loader. */
(()=>{"use strict";
const SOURCES=Object.freeze({
 universe:"research-universe.json",pipeline:"research-pipeline.json",
 market:"market-relative.json",marketReviewed:"market-reviewed.json",
 stocks:"stock-relative.json",clinical:"clinical-trials.json",
 consumer:"consumer-official.json",korea:"korea-dart.json",
 weekly:"atelier-weekly.json",secTrends:"sec-trends.json",
 health:"data-health.json",research:"weekly-research.json",
 official:"official-financials.json",consumerSamples:"consumer-samples.json",
 weeklyInvestment:"weekly-investment.json",weeklyContent:"weekly-content.json",
 biotech:"biotech-financials.json"
});
const cache=new Map(),inflight=new Map();
// Only an explicitly pinned deployed site fetches immutable release paths.
// Developer previews and offline tests without a release marker use source JSON files.
const releaseId=typeof window.ATELIER_RELEASE_ID==="string"
 &&/^[a-f0-9]{20}$/.test(window.ATELIER_RELEASE_ID)
 ?window.ATELIER_RELEASE_ID:null;
const buildId=typeof window.ATELIER_BUILD_ID==="string"
 &&/^[a-f0-9]{20}$/.test(window.ATELIER_BUILD_ID)
 ?window.ATELIER_BUILD_ID:null;
let checkPromise=null,lastVersionCheck=0,updateRequired=false;
function explainStaleTab(message){
 if(typeof document==="undefined"||!document.body?.prepend||document.getElementById("atelier-version-banner"))return;
 const banner=document.createElement("aside");
 banner.id="atelier-version-banner";
 banner.setAttribute("role","alert");
 banner.style.cssText="position:fixed;bottom:12px;right:12px;z-index:3000;max-width:min(94vw,420px);box-sizing:border-box;background:#172b43;color:#fff;padding:14px 16px;border-radius:12px;box-shadow:0 8px 30px #0003;display:flex;align-items:center;flex-wrap:wrap;gap:12px";
 const description=document.createElement("span");
 description.textContent=message;
 const action=document.createElement("button");
 action.type="button";
 action.textContent="사이트 새로고침";
 action.style.cssText="border:1px solid #fff;background:#fff;color:#172b43;padding:8px 10px;border-radius:8px;cursor:pointer;font-weight:600";
 action.onclick=()=>window.location.reload();
 banner.append(description,action);
 document.body.prepend(banner);
}
async function checkForUpdate(force=false){
 if(!buildId)return false;
 if(updateRequired)return true;
 if(checkPromise)return checkPromise;
 if(!force&&Date.now()-lastVersionCheck<60000)return false;
 lastVersionCheck=Date.now();
 checkPromise=(async()=>{
  try{
   const response=await fetch("./site-version.json",{cache:"no-store"});
   if(!response.ok)return false;
   const version=await response.json();
   if(typeof version.buildId==="string"&&version.buildId!==buildId){
    updateRequired=true;
    explainStaleTab("ATELIER가 새 버전으로 갱신됐습니다. 이 탭은 이전 버전이므로 새로고침하세요. 기기에 저장된 개인 기록은 유지됩니다.");
    return true;
   }
  }catch(_){}
  return false;
 })();
 try{return await checkPromise}finally{checkPromise=null}
}
if(typeof document!=="undefined"&&typeof document.addEventListener==="function"){
 document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible")void checkForUpdate();
 });
}
if(typeof window.addEventListener==="function"){
 window.addEventListener("focus",()=>{void checkForUpdate()});
}
function valid(name,value){
 if(!value||typeof value!=="object"||Array.isArray(value))return false;
 const arrayField=({
  universe:"companies",clinical:"assets",consumer:"companies",korea:"companies",
  weekly:"items",secTrends:"companies",health:"items",research:"items",
  official:"companies",weeklyContent:"items",biotech:"companies"
 })[name];
 return !arrayField||Array.isArray(value[arrayField]);
}
async function get(name){
 if(!Object.prototype.hasOwnProperty.call(SOURCES,name))return null;
 if(cache.has(name))return cache.get(name);
 if(inflight.has(name))return inflight.get(name);
 const promise=(async()=>{
  try{
   const response=await fetch("./"+(releaseId?"releases/"+releaseId+"/":"")+SOURCES[name],{cache:"no-store"});
   if(!response.ok){
    if(releaseId&&response.status===404){
     const obsolete=await checkForUpdate(true);
     if(!obsolete)explainStaleTab("이 버전의 자료 파일을 찾지 못했습니다. 개인 기록을 유지한 채 새로고침하여 다시 연결하세요.");
    }
    return null;
   }
   const data=await response.json();
   if(!valid(name,data))return null;
   cache.set(name,data);
   return data;
  }catch(_){return null}
  finally{inflight.delete(name)}
 })();
 inflight.set(name,promise);
 return promise;
}
function many(names){return Promise.all(names.map(get))}
function invalidate(name){
 if(name==null){cache.clear();return}
 if(Object.prototype.hasOwnProperty.call(SOURCES,name))cache.delete(name);
}
function companyById(universe,id){
 if(!universe||!Array.isArray(universe.companies)||typeof id!=="string")return null;
 return universe.companies.find(c=>c.id===id)||null;
}
function companyByTicker(universe,ticker,market="미국"){
 if(typeof ticker!=="string"||!/^[A-Z0-9.]{1,12}$/.test(ticker))return null;
 if(market!=="미국"&&market!=="한국")return null;
 return companyById(universe,(market==="한국"?"KR:":"US:")+ticker);
}
function effectiveMarket(feed,reviewed){
 const hasBenchmark=["ok","partial"].includes(feed?.status)
   &&typeof feed?.asOf==="string"
   &&Number.isFinite(feed?.returns?.XLK?.["3m"]);
 if(hasBenchmark)return feed;
 // A dated prior verified feed can be shown ONLY with current public-display permission.
 // Prefer the independently reviewed fixed snapshot when it is newer.
 const stale=feed?.status==="stale_cached"&&feed?.publicDisplayAuthorized===true
  &&typeof feed?.asOf==="string"&&Number.isFinite(feed?.returns?.XLK?.["3m"]);
 if(stale&&(!reviewed?.asOf||feed.asOf>=reviewed.asOf))return feed;
 return reviewed?.status==="source_verified_snapshot"&&reviewed?.asOf?reviewed:(feed||null);
}
function sourceMeta(item){
 if(!item||typeof item!=="object")return null;
 const checkedAt=typeof item.checkedAt==="string"?item.checkedAt:null;
 const asOf=typeof item.asOf==="string"?item.asOf:null;
 const range=item.periodRange;
 const periodRange=range&&typeof range.earliest==="string"&&typeof range.latest==="string"
  ?{earliest:range.earliest,latest:range.latest}:null;
 return {status:item.status||"unknown",checkedAt,asOf,periodRange};
}
function formatKST(value){
 if(!value||typeof value!=="string")return null;
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return null;
 return new Intl.DateTimeFormat("sv-SE",{
  timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit",
  hour:"2-digit",minute:"2-digit",hour12:false
 }).format(date);
}
function olderThanHours(value,hours,now=Date.now()){
 const date=new Date(value||"");
 return !Number.isFinite(date.getTime())||now-date.getTime()>hours*3600000;
}
window.ATELIER_DATA=Object.freeze({
 sources:SOURCES,releaseId,buildId,get,many,invalidate,checkForUpdate,companyById,companyByTicker,
 effectiveMarket,sourceMeta,formatKST,olderThanHours
});
})();