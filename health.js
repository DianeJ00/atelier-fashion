/* ATELIER — source and progress audit. Numbers are emitted by the scheduled build. */
(()=>{"use strict";
let data=null;
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safe=u=>{try{const x=new URL(u);return x.protocol==="https:"?x.href:"#"}catch{return "#"}};
const statuses={live:"자동 수집·공식 대조",reviewed_snapshot:"원문 검토 스냅샷",partial:"일부 확인",blocked:"연결 필요"};
function auditLabel(){
 const d=new Date(data?.generatedAt||"");
 if(!Number.isFinite(d.getTime()))return "마지막 점검 시각 확인 불가";
 const time=new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(d);
 const hours=(Date.now()-d.getTime())/3600000;
 return "마지막 상태 점검 "+time+" (KST) · "+(hours>36?"36시간 이상 경과, 실행 기록 확인 필요":"점검 기록 확인");
}
function panel(){
 if(!data)return '<section class="h7-panel"><h2>자료 수집·검증 현황</h2><p>실제 데이터 범위를 확인하는 중입니다.</p></section>';
 const items=data.items||[];
 const pending=items.filter(x=>x.status!=="live");
 return '<section class="h7-panel"><div class="h7-head"><div><span class="h7-eyebrow">출처·갱신 상태 점검</span><h2>지금 실제로 확인되는 자료와 남은 작업</h2><p>기업 '+esc(data.coverage?.tracked||0)+'개 추적 · SEC 비교 '+esc(data.coverage?.secPeriodCompared??"—")+'개 기업 · '+esc(data.generatedAt?.slice(0,10)||"기준일 미확인")+' 기준 · 매일 09:00 KST 자동 수집 시도 · '+esc(auditLabel())+'</p></div><span class="h7-count">재검증·연결 확인 '+pending.length+'건</span></div>'+
 '<div class="h7-status-overview">'+[
 ['수집·검증',items.filter(x=>x.status==="live").length],
 ['편집 스냅샷',items.filter(x=>x.status==="reviewed_snapshot").length],
 ['일부 확인',items.filter(x=>x.status==="partial").length],
 ['연결 대기',items.filter(x=>x.status==="blocked").length]
 ].map(([name,n])=>'<div><b>'+n+'</b><span>'+esc(name)+'</span></div>').join("")+'</div>'+
 '<details class="h7-details"><summary>전체 데이터 연결·미완료 항목 '+items.length+'건 펼쳐보기</summary>'+
 '<div class="h7-list">'+items.map(x=>{
 const fraction=x.total?'<span>'+esc(x.covered??0)+'/'+esc(x.total)+'</span>':(x.covered!=null?'<span>'+esc(x.covered)+'건</span>':'');
 return '<article class="h7-item"><div class="h7-item-title"><strong>'+esc(x.label)+'</strong><span class="h7-status h7-'+esc(x.status)+'">'+esc(statuses[x.status]||x.status)+'</span>'+fraction+'</div>'+
 '<p>'+esc(x.note)+'</p>'+ (x.asOf?'<small>자료 기준 '+esc(String(x.asOf).slice(0,10))+'</small>':'<small>검증 기준일 없음</small>')+
 (x.nextAction?'<div class="h7-next"><b>남은 작업</b> · '+esc(x.nextAction)+'</div>':'')+
 (x.source?'<a href="'+safe(x.source)+'" target="_blank" rel="noopener noreferrer">데이터 제공사·원문 ↗</a>':'')+'</article>';
 }).join("")+'</div></details>'+
 '<p class="h7-disclaimer">매일 자동 수집은 실시간 정보 제공을 뜻하지 않습니다. 미국 시장 시세는 거래소·제공사 기준이고, 공식 분기 실적·임상·원문 편집의 기준일은 서로 다릅니다. 연결되지 않은 자료는 자동 최신화됐다고 표시하지 않습니다. <a href="https://github.com/DianeJ00/atelier-fashion/actions/workflows/weekly-research.yml" target="_blank" rel="noopener noreferrer">자동 실행 기록 확인 ↗</a></p></section>';
}
function updateHeader(){
 const top=document.getElementById?.("top-datum");
 const status=document.getElementById?.("status-short");
 const sidebar=document.getElementById?.("snapshot-short");
 if(!data){
  if(top)top.textContent="자료 수집 상태 확인 실패 · 시세 기준일 별도";
  if(status)status.textContent="수집 상태 확인 필요";
  if(sidebar)sidebar.textContent="기존 패션 시세 2026-11-03 기준";
  return;
 }
 const date=new Date(data.generatedAt||"");
 const time=Number.isFinite(date.getTime())
  ?new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(date)
  :null;
 const tooOld=time&&Date.now()-date.getTime()>36*3600000;
 const last=time?"마지막 자료 수집 점검 "+time+" KST":"마지막 점검 시각 미확인";
 if(top)top.textContent=last+(tooOld?" · 갱신 지연 확인 필요":" · 실시간 시세 아님");
 const market=(data.items||[]).find(x=>x.id==="market");
 if(status)status.textContent=market?.status==="live"
   ?"ETF 종가 자료 수집 · 거래일 기준"
   :market?.status==="reviewed_snapshot"?"ETF 상대수익률 · 고정 스냅샷":"ETF 시세 연동 확인 필요";
 if(sidebar)sidebar.textContent=market?.asOf
   ?"ETF 표 "+String(market.asOf).slice(0,10)+" 기준 · "+(market.status==="reviewed_snapshot"?"자동 갱신 아님":"거래일 종가")
   :"ETF 기준일 미확인 · 비실시간";
}
async function load(){
 try{const r=await fetch("./data-health.json",{cache:"no-store"});const d=r.ok?await r.json():null;data=d?.items?d:null}
 catch(_){data=null}
 updateHeader();
 if(typeof window.atelierRerender==="function")window.atelierRerender();
}
window.ATELIER_HEALTH={load,panel,get data(){return data}};
})();