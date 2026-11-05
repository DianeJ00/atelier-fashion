/* ATELIER — independently managed official consumer operating metrics. */
(()=>{"use strict";
let data=null;
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const safe=u=>{try{const p=new URL(u);return p.protocol==="https:"?p.href:"#"}catch{return "#"}};
const num=v=>Number(v).toLocaleString("ko-KR",{maximumFractionDigits:2});
function fmt(m){
 if(!m||!Number.isFinite(m.value))return "—";
 const n=m.value;
 if(m.unit==="USD B")return "$"+num(n)+"B";
 if(m.unit==="USD M")return "$"+num(n)+"M";
 if(m.unit==="USD per share")return "$"+num(n);
 if(m.unit==="%")return num(n)+"%";
 if(m.unit==="billion trips")return num(n*10)+"억 건";
 if(m.unit==="million nights")return num(n)+"백만 숙박일";
 if(m.unit==="stores")return num(n)+"개";
 return num(n)+" "+esc(m.unit||"");
}
function get(ticker){return (data?.companies||[]).find(x=>x.ticker===ticker)||null}
function metric(m){
 return '<div class="c2-metric"><small>'+esc(m.label)+'</small><b>'+esc(fmt(m))+'</b><span>'+esc(m.change||"")+'</span><p>'+esc(m.basis||"")+' · '+esc(m.period||"")+'</p></div>';
}
function card(company){
 const r=get(company.ticker);
 if(!r)return '<p class="c2-empty">공식 실적의 기준 분기·원문을 확인하는 중입니다.</p>';
 const sec=r.sec?.status==="quarter_verified"?r.sec.quarter:null;
 let secDetails="";
 if(sec){
   const figures=Object.entries(sec.metrics||{}).filter(([k,v])=>v&&Number.isFinite(v.value)).map(([key,m])=>
     '<span>'+esc(({revenue:"GAAP 매출",operatingIncome:"GAAP 영업이익",netIncome:"GAAP 순이익"})[key]||key)+': <b>'+esc(fmt({value:m.value/1e9,unit:"USD B"}))+'</b></span>'
   ).join("");
   secDetails='<details class="c2-sec"><summary>SEC 10-Q 공식 회계 실적 · 운영 KPI와 분리</summary><div class="c2-sec-facts"><small>기간 '+esc(sec.periodStart)+' ~ '+esc(sec.periodEnd)+'</small>'+figures+'</div><a href="'+safe(sec.url)+'" target="_blank" rel="noopener noreferrer">10-Q 원문 ↗</a></details>';
 }
 return '<section class="c2-panel"><div class="c2-top"><div><span class="c2-kicker">기업 공식 실적 · 운영 KPI</span><h3>'+esc(r.period)+' · '+esc(company.name)+'</h3><p>발표 '+esc(r.publishedAt)+' · 검토 '+esc(r.verifiedAt)+'</p></div><a href="'+safe(r.sourceURL)+'" target="_blank" rel="noopener noreferrer">실적 원문 ↗</a></div>'
 +'<div class="c2-metrics">'+(r.metrics||[]).slice(0,4).map(metric).join("")+'</div><div class="c2-take"><b>투자 연결</b><p>'+esc(r.thesis)+'</p><small>해석 주의 · '+esc(r.risk)+'</small></div>'
 +(r.operatingKpiStatus==="older_than_latest_10q"?'<p class="c2-warning">더 최근 SEC 공시가 있습니다. 위 KPI는 명시된 과거 분기 값입니다.</p>':"")
 +secDetails+'</section>';
}
function small(company){
 const r=get(company.ticker);if(!r)return "";
 return '<div class="c2-quick"><small>최근 검토 분기 '+esc(r.period)+'</small>'
 +(r.metrics||[]).slice(0,2).map(m=>'<span>'+esc(m.label)+' <b>'+esc(fmt(m))+'</b></span>').join("")
 +'<button data-r2="tab" data-val="핵심 KPI">지표 상세 →</button></div>';
}
function latest(){
 const rows=(data?.companies||[]).slice().sort((a,b)=>(b.publishedAt||"").localeCompare(a.publishedAt||""));
 if(!rows.length)return '<p class="c2-empty">공식 실적 데이터 연결 대기</p>';
 return '<div class="c2-intro"><div class="c2-intro-head"><div><b>미국 소비재 공식 실적 요약</b><p>실제 발표일·회계분기 기준으로 정리하며, 기사 제목만으로 실적을 추정하지 않습니다.</p></div><span>'+rows.length+'/15개 확인</span></div>'
 +'<div class="c2-headlines">'+rows.slice(0,5).map(r=>
 '<article class="c2-headline"><div class="c2-headline-meta"><strong>'+esc(r.ticker)+'</strong> · '+esc(r.period)+' · '+esc(r.publishedAt)+'</div><h4>'+esc(r.thesis)+'</h4>'
 +'<div class="c2-headline-values">'+r.metrics.slice(0,2).map(m=>'<span>'+esc(m.label)+' <b>'+esc(fmt(m))+'</b> <small>'+esc(m.change)+'</small></span>').join("")+'</div>'
 +'<p>해석 주의 · '+esc(r.risk)+'</p><div class="c2-article-footer"><a href="'+safe(r.sourceURL)+'" target="_blank" rel="noopener noreferrer">공식 원문 ↗</a><button data-r2="openCompany" data-val="US:'+esc(r.ticker)+'">기업 상세 →</button></div></article>'
 ).join("")+'</div><p class="c2-footer">서로 다른 회계연도와 보고 기간을 혼합한 순위가 아닙니다. 지표 기준 '+esc(data.editedKpiAsOf)+'에 원문 대조한 스냅샷으로, 후속 실적 발표 시 재검증이 필요합니다.</p></div>';
}
function summary(){
 const rows=["UBER","NFLX","CAVA","WMT"].map(get).filter(Boolean);
 if(!rows.length)return "";
 return '<section class="r2-panel c2-overview"><div class="r2-panel-head"><div><div class="r2-eyebrow">미국 소비재·서비스 공식 실적</div><h3>방문·구독·예약, 사업별 다른 성장 변수</h3><p>15개 회사 공식 발표. 업종별 지표 정의와 회계분기를 함께 표시합니다.</p></div></div><div class="c2-overview-grid">'
 +rows.map(r=>{const m=r.metrics[0];return '<button data-r2="openCompany" data-val="US:'+esc(r.ticker)+'"><b>'+esc(r.ticker)+' · '+esc(r.period)+'</b><strong>'+esc(fmt(m))+'</strong><small>'+esc(m.label)+' · '+esc(m.change||"")+'</small></button>'}).join("")
 +'</div><p class="c2-footer">예약액·연결 매출·동일매장매출은 서로 다른 지표이므로 숫자 크기만으로 비교할 수 없습니다.</p></section>';
}
async function load(){
 try{const r=await fetch("./consumer-official.json",{cache:"no-store"});const d=r.ok?await r.json():null;data=d?.companies?.length===15?d:null}
 catch(_){data=null}
 if(typeof window.atelierRerender==="function")window.atelierRerender();
}
window.ATELIER_CONSUMER={load,get,card,small,latest,summary,get data(){return data}};
})();