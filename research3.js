/* ATELIER 2.3 — evidence-first weekly research and local thesis adjudication. */
(()=>{"use strict";
let report=null,gaap=null;
const KEY="ATELIER_V23_THESIS_LOCAL_ONLY";
let records={};
const drafts={};
try{records=JSON.parse(localStorage.getItem(KEY)||"{}")}catch(_){records={}}
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uri=s=>{try{const u=new URL(s);return u.protocol==="https:"?u.href:"#"}catch{return "#"}};
const format=(n,d=1)=>Number.isFinite(n)?Number(n).toLocaleString("ko-KR",{maximumFractionDigits:d,maximumFractionDigits:d}):"—";
const pct=n=>Number.isFinite(n)?(n>0?"+":"")+format(n,1)+"%":"비교 자료 없음";
const usd=n=>Number.isFinite(n)?"$"+format(n/1e9,2)+"B":"—";
const relative=(m,key)=>{
 const x=m?.[key];
 if(!x?.comparison||!Number.isFinite(x.percent))return "<span class='a3-na'>비교 분기 미확인</span>";
 const base=x.comparison;
 return "<strong>"+esc(pct(x.percent))+"</strong><small>비교 "+esc(base.start)+" ~ "+esc(base.end)+"</small>";
};
function secComparison(ticker){
 const r=gaap?.companies?.find(x=>x.ticker===ticker);
 if(!r||r.status==="source_unavailable")return '<p class="a3-source-wait">SEC GAAP 분기 비교 수집 대기 · 공식 확인 이전 수익률 추정 없음</p>';
 const metrics=r.metrics||{};
 const rows=[["revenue","매출"],["operatingIncome","영업이익"],["netIncome","순이익"]].filter(([k])=>metrics[k]);
 if(!rows.length)return '<p class="a3-source-wait">비교 가능한 GAAP 계정 확인 대기</p>';
 return '<section class="a3-sec-panel"><header><div><b>SEC 공시 기준 분기 실적 변화</b><p>'+esc(r.periodStart)+' ~ '+esc(r.periodEnd)+' · 동일 계정/3개월 비교</p></div><a href="'+uri(r.url)+'" target="_blank" rel="noopener noreferrer">10-Q 원문 ↗</a></header><div class="a3-sec-grid">'+rows.map(([k,label])=>{
 const m=metrics[k];return '<div class="a3-sec-tile"><span>'+esc(label)+'</span><b>'+esc(usd(m.value))+'</b><div><small>전년 동기</small>'+relative(m,"yoy")+'</div><div><small>직전 분기</small>'+relative(m,"qoq")+'</div></div>';
 }).join("")+'</div><p class="a3-small">GAAP 연결 회계 실적입니다. 예약액·동일매장매출·유료 가입자 등 회사 고유 KPI와 혼합하지 않습니다. 4분기의 비교 가능한 3개월 사실이 없으면 전분기 비교를 비워둡니다.</p></section>';
}
function itemCard(it,index){
 return '<article class="a3-change"><div class="a3-change-top"><span class="a3-sector">'+esc(it.sector)+'</span><span>'+esc(it.eventDate)+'</span><span>'+esc(it.tier)+'</span></div>'+
 '<div class="a3-title-row"><span class="a3-number">'+String(index+1).padStart(2,"0")+'</span><h3>'+esc(it.title)+'</h3></div>'+
 '<p class="a3-observation">'+esc(it.observation)+'</p>'+
 '<div class="a3-verification"><p><b>투자 연결</b> · '+esc(it.investment)+'</p><p><b>다음 실적·이벤트 검증</b> · '+esc(it.nextCheck)+'</p></div>'+
 '<p class="a3-caveat">'+esc(it.caveat)+'</p><div class="a3-source"><span>'+esc(it.eventType)+(it.period?" · "+esc(it.period):"")+'</span><a href="'+uri(it.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+esc(it.sourceLabel||"공식 원문")+' ↗</a></div></article>';
}
function weekly(sector="전체",preview=false){
 if(!report)return '<section class="a3-report"><p class="a3-source-wait">주간 통합 보고서 수집 대기 · 근거 없이 결론을 채우지 않습니다.</p></section>';
 const items=(report.items||[]).filter(x=>sector==="전체"||x.sector===sector);
 const shown=preview?items.slice(0,3):items;
 const count=items.length;
 const stale=report.staleConsumerKpi||[];
 const more=preview?'<button class="a3-open-weekly" data-a3="openWeekly">통합 주간 보고서 전체 보기 →</button>':"";
 const future=(!preview&&(sector==="전체"||sector==="바이오·제약")&&(report.upcomingClinical||[]).length)?
 '<details class="a3-upcoming"><summary>예정된 바이오 시험 평가 시점 · 이번 주 발생 사건과 구분</summary>'+report.upcomingClinical.map(t=>
 '<div><b>'+esc(t.title)+'</b><small>'+esc(t.date)+'</small><p>'+esc(t.observation)+'</p><a href="'+uri(t.url)+'" target="_blank" rel="noopener noreferrer">등록자료 ↗</a></div>'
 ).join("")+'</details>':"";
 const staleLine=!preview&&(sector==="전체"||sector==="소비재·서비스")&&stale.length?
 '<details class="a3-upcoming"><summary>회사 고유 KPI 재검증 필요 · '+stale.length+'개 기업</summary>'+stale.map(t=>
 '<div><b>'+esc(t.ticker)+' · '+esc(t.period)+'</b><p>'+esc(t.reason)+'</p><small>최신 SEC 기간 '+esc(t.newSECPeriod||"확인 대기")+'</small> <a href="'+uri(t.url)+'" target="_blank" rel="noopener noreferrer">공시 보기 ↗</a></div>'
 ).join("")+'</details>':"";
 return '<section class="a3-report"><div class="a3-head"><div><span class="a3-kicker">ATELIER 통합 투자 리서치 · '+esc(report.periodStart)+' ~ '+esc(report.periodEnd)+'</span><h2>'+
 (preview?"이번 주 투자 논리를 바꿀 근거":sector==="전체"?"산업을 가로질러 이번 주 달라진 것":esc(sector)+" · 최신 확인된 변화")+
 '</h2><p>공식 공시·등록정보·원문 검토 자료만 포함. 실제로 확인된 변화 '+count+'건'+(preview&&count>3?" 중 상위 3건":"")+'</p></div>'+more+'</div>'+
 (shown.length?'<div class="a3-report-cards">'+shown.map(itemCard).join("")+'</div>':
 '<p class="a3-empty">선택한 산업에서는 보고기간 안에 원문으로 확인한 신규 변화가 없습니다. 자료 미확인을 산업 전망의 변화 없음으로 해석하지 않습니다.</p>')+
 future+staleLine+
 (preview?"":'<p class="a3-small">미국 소비재 운영 KPI는 검토한 분기 자료를 별도로 유지합니다. 국내 5개 담당 기업의 비공개 과거 브리프·DART는 아직 자동 연결되지 않았습니다. 보고서의 검토 제안은 매수·매도 의견이 아닙니다.</p>')+'</section>';
}
function reviewFor(companyId){
 const t=report?.reviewCandidates?.find(x=>x.companyId===companyId);
 return t||null;
}
function statusLine(id){
 const item=records[id];
 if(!item)return '<span class="a3-unreviewed">담당자 확정 전</span>';
 return '<span class="a3-reviewed">확정: '+esc(item.choice)+' · '+esc(item.at.slice(0,10))+'</span>';
}
function recordCard(company,compact=false){
 if(!company)return "";
 const id=company.id;
 const proposal=reviewFor(id);
 const old=records[id]||{};
 const selection=drafts[id]?.choice||old.choice||"";
 const source=proposal?.sourceUrl;
 const choices=["판단 보류","강화","유지","약화"];
 return '<div class="a3-review-card"><div class="a3-review-head"><div><b>'+esc(company.ticker)+'</b><span>'+esc(company.name)+'</span></div>'+statusLine(id)+'</div>'+
 '<p><strong>기존 검증 질문</strong> · '+esc(company.focus)+'</p>'+
 '<p><strong>반증 조건</strong> · '+esc(company.risk)+'</p>'+
 (proposal?'<div class="a3-review-change"><b>새로 확인된 근거</b><p>'+esc(proposal.change)+' · '+esc(proposal.evidenceDate)+'</p><a href="'+uri(source)+'" target="_blank" rel="noopener noreferrer">공식·편집 원문 ↗</a><small>이 변화로 투자 논리가 강화·약화됐다는 결론은 아님.</small></div>':
 '<div class="a3-review-change a3-no-change">이번 주 검증된 변경 근거 없음 · 기존 가설 재확인 대기</div>')+
 '<div class="a3-review-choices" aria-label="'+esc(company.ticker)+' 담당자 판단">'+choices.map(c=>
 '<button data-a3="choose" data-id="'+esc(id)+'" data-choice="'+esc(c)+'" class="'+(selection===c?"is-selected":"")+'">'+esc(c)+'</button>').join("")+'</div>'+
 (!compact?'<label class="a3-review-note">담당자 판단 근거<textarea data-a3-note="'+esc(id)+'" rows="2" placeholder="공식 근거와 다음 확인 조건을 직접 기록하세요. 이 브라우저에만 저장됩니다.">'+esc(drafts[id]?.note??old.note??"")+'</textarea></label>':
 '<label class="a3-review-note">판단 근거<textarea data-a3-note="'+esc(id)+'" rows="2" placeholder="브라우저 로컬 기록">'+esc(old.note||"")+'</textarea></label>')+
 '<div class="a3-review-actions"><button data-a3="save" data-id="'+esc(id)+'">내 판단 저장</button><button data-a3="clear" data-id="'+esc(id)+'" class="a3-clear">로컬 기록 지우기</button></div>'+
 '<p class="a3-small">이 기록은 현재 브라우저에만 보관되며 공개 GitHub·다른 기기에 동기화되지 않습니다.</p></div>';
}
function proposals(companies,filter="전체"){
 if(!report)return '<p class="a3-source-wait">새 근거를 연결하는 중입니다.</p>';
 const valid=(companies||[]).filter(c=>filter==="전체"||c.sector===filter);
 const evidence=valid.filter(c=>reviewFor(c.id));
 if(!evidence.length)return '<div class="a3-review-empty">해당 산업에 이번 주 원문 근거가 있는 자동 검토 제안이 없습니다. 기존 기업별 검증 질문은 아래에서 볼 수 있습니다.</div>';
 return '<section class="a3-proposals"><div class="a3-head"><div><span class="a3-kicker">근거 변화 추적 · 담당자 결정 전</span><h2>검토가 필요한 투자 가설 '+evidence.length+'건</h2><p>매수·매도·가설 강화 여부를 자동 확정하지 않습니다. 각 근거를 확인한 뒤 판단을 저장하세요.</p></div></div><div class="a3-review-grid">'+evidence.slice(0,10).map(c=>recordCard(c)).join("")+'</div></section>';
}
function overview(){
 const count=report?.itemCount||0;
 return weekly("전체",true);
}
function saveChoice(id,choice){
 const note=document.querySelector('[data-a3-note="'+id+'"]')?.value??drafts[id]?.note??records[id]?.note??"";
 records[id]={choice,note:note.slice(0,2500),at:new Date().toISOString()};
 delete drafts[id];
 try{localStorage.setItem(KEY,JSON.stringify(records))}catch(_){}
 if(window.atelierRerender)window.atelierRerender();
}
document.addEventListener("click",e=>{
 const b=e.target.closest("[data-a3]");if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();
 const kind=b.dataset.a3,id=b.dataset.id;
 if(kind==="choose"){
   const note=document.querySelector('[data-a3-note="'+id+'"]')?.value||records[id]?.note||"";
   // Selection in memory; explicit save button persists.
   drafts[id]={choice:b.dataset.choice,note};
   if(window.atelierRerender)window.atelierRerender();
 }else if(kind==="save")saveChoice(id,drafts[id]?.choice||records[id]?.choice||"판단 보류");
 else if(kind==="clear"){
   delete records[id];delete drafts[id];try{localStorage.setItem(KEY,JSON.stringify(records))}catch(_){}
   if(window.atelierRerender)window.atelierRerender();
 }else if(kind==="openWeekly"){
   if(window.atelierGotoWeekly)window.atelierGotoWeekly();
 }
});
async function load(){
 const sources=await Promise.all(["atelier-weekly.json","sec-trends.json"].map(async name=>{
  try{const r=await fetch("./"+name,{cache:"no-store"});return r.ok?await r.json():null}catch(_){return null}
 }));
 report=sources[0]&&Array.isArray(sources[0].items)?sources[0]:null;
 gaap=sources[1]&&Array.isArray(sources[1].companies)?sources[1]:null;
 if(window.atelierRerender)window.atelierRerender();
}
window.ATELIER3={load,overview,weekly,proposals,recordCard,secComparison,
 get report(){return report},get gaap(){return gaap},get records(){return records}};
})();