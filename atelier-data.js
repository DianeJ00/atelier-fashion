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
   if(!response.ok)return null;
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
 sources:SOURCES,releaseId,get,many,invalidate,companyById,companyByTicker,
 effectiveMarket,sourceMeta,formatKST,olderThanHours
});
})();