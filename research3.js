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
function fiscalQuarterLabel(r){
 const year=Number(r?.fiscalYear),quarter=String(r?.fiscalPeriod||"");
 if(Number.isInteger(year)&&year>=2000&&year<=2100&&/^Q[1-4]$/.test(quarter))
  return "FY"+String(year).slice(-2)+" "+quarter.slice(1)+"Q";
 return r?.periodEnd?String(r.periodEnd).slice(0,7).replace("-",".")+" 종료 분기":"회계분기 확인 대기";
}
function peerComparison(company,universe){
 if(company?.market!=="미국"||!gaap?.companies?.length)return "";
 const listed=(universe||[]).filter(x=>x.market==="미국"&&x.sector===company.sector);
 const resolved=listed.map(c=>({company:c,row:gaap.companies.find(r=>r.ticker===c.ticker)}))
  .filter(x=>Number.isFinite(x.row?.metrics?.revenue?.value));
 const selected=resolved.find(x=>x.company.id===company.id);
 if(!selected)return "";
 const others=resolved.filter(x=>x.company.id!==company.id)
  .sort((a,b)=>String(b.row.filed||"").localeCompare(String(a.row.filed||""))).slice(0,4);
 const rows=[selected,...others];
 const html=rows.map(x=>{
  const revenue=x.row.metrics.revenue,operating=x.row.metrics.operatingIncome;
  const margin=Number.isFinite(operating?.value)&&revenue.value>0?format(operating.value/revenue.value*100,1)+"%":"—";
  const yoy=Number.isFinite(revenue.yoy?.percent)?pct(revenue.yoy.percent):"—";
  return '<tr'+(x.company.id===company.id?' class="a3-peer-selected"':'')+'><td><b>'+esc(x.company.ticker)+'</b><small>'+esc(x.company.name)+'</small></td>'+
   '<td>'+esc(x.row.periodEnd||"—")+'</td><td>'+esc(usd(revenue.value))+'</td><td>'+esc(yoy)+'</td><td>'+esc(margin)+'</td>'+
   '<td><a href="'+uri(x.row.url)+'" target="_blank" rel="noopener noreferrer">SEC 원문 ↗</a></td></tr>';
 }).join("");
 return '<details class="a3-peer-compare"><summary>같은 산업 그룹의 공식 분기 실적 비교 ('+rows.length+'개)</summary>'+
  '<div class="r2-table-scroll"><table class="r2-table"><thead><tr><th>기업</th><th>분기 종료</th><th>매출</th><th>전년 동기</th><th>영업이익률</th><th>근거</th></tr></thead><tbody>'+html+'</tbody></table></div>'+
  '<p class="r2-foot">SEC GAAP 기준·기업별 최신 확인 분기. 보고기간·사업 구성은 다르며 같은 산업 그룹이 직접 경쟁사를 뜻하지는 않습니다. 영업이익률은 영업이익/매출 계산치입니다.</p></details>';
}
/* SEC workbench: numerical summaries come only from matched quarter GAAP facts. */
function secNumber(v){
 if(!Number.isFinite(v))return "—";
 const a=Math.abs(v),sign=v<0?"−":"";
 return sign+"$"+(a>=1e9?format(a/1e9,2)+"B":a>=1e6?format(a/1e6,1)+"M":format(a,0));
}
function secDelta(m){
 if(!Number.isFinite(m?.value)||!Number.isFinite(m?.yoy?.comparison?.value))return "전년 비교 없음";
 const current=m.value,prior=m.yoy.comparison.value;
 if(prior>0&&current<0)return "적자 전환";
 if(prior<0&&current>0)return "흑자 전환";
 if(prior<0&&current<0)return Math.abs(current)<Math.abs(prior)?"적자 축소":Math.abs(current)>Math.abs(prior)?"적자 확대":"적자 동일";
 if(prior===0&&current!==0)return "비교 기준 0";
 if(Number.isFinite(m.yoy.percent))return pct(m.yoy.percent);
 return current===prior?"변동 없음":"전년 비교 없음";
}
function secDirection(m){
 if(!Number.isFinite(m?.value)||!Number.isFinite(m?.yoy?.comparison?.value))return null;
 const prior=m.yoy.comparison.value,current=m.value;
 if(prior>=0&&current<0)return "loss";
 if(prior<0&&current>=0)return "recovery";
 if(prior<0&&current<0)return Math.abs(current)<Math.abs(prior)?"recovery":Math.abs(current)>Math.abs(prior)?"loss":"flat";
 return current>prior?"up":current<prior?"down":"flat";
}
function secReadout(r){
 const revenue=r.metrics?.revenue,operating=r.metrics?.operatingIncome;
 const a=secDirection(revenue),b=secDirection(operating);
 if(a==="up"&&b==="up")return "매출·영업이익 동반 증가";
 if(a==="up"&&b==="down")return "매출 증가, 영업이익 감소";
 if(a==="down"&&b==="up")return "매출 감소, 영업이익 개선";
 if(a==="down"&&b==="down")return "매출·영업이익 동반 감소";
 if(a==="up"&&b==="loss")return "매출 증가에도 영업손익 악화";
 if(b==="loss")return "영업손익 악화 확인";
 if(b==="recovery")return "영업손익 개선 확인";
 if(a==="up")return "매출 증가 확인";
 if(a==="down")return "매출 감소 확인";
 return "공식 분기 수치 확인";
}

/* Company-specific earnings lens; issuer operating KPIs are editorial snapshots, not GAAP accounts. */
function companyKpiLabels(company){
 const k=(company?.kpis||[]).filter(Boolean);
 return k.length?k.slice(0,3):["매출·수익성","사업별 핵심 지표","현금흐름"];
}
function issuerSnapshot(company,secRow){
 if(company?.sector!=="소비재·서비스")return null;
 const r=window.ATELIER_CONSUMER?.get?.(company.ticker);
 if(!r?.metrics?.length)return null;
 const same=!!(r.periodEnd&&secRow?.periodEnd&&r.periodEnd===secRow.periodEnd);
 const older=r.operatingKpiStatus==="older_than_latest_10q"||!!(r.periodEnd&&secRow?.periodEnd&&r.periodEnd<secRow.periodEnd);
 return {row:r,status:same?"동일 분기":older?"과거 분기":"기간 별도 대조"};
}
function issuerMetricValue(m){
 if(!Number.isFinite(m?.value))return "—";
 const v=format(m.value,2);
 const n=m.value;
 switch(m.unit){
  case "USD B":return "$"+v+"B";
  case "USD M":return "$"+v+"M";
  case "USD per share":return "$"+v;
  case "%":return v+"%";
  case "billion trips":return format(n*10,1)+"억 건";
  case "million nights":return v+"백만 숙박일";
  case "stores":return format(n,0)+"개";
  default:return v+" "+(m.unit||"");
 }
}
function companyEarningsLens(company){
 if(!company)return "";
 const sec=gaap?.companies?.find(r=>r.ticker===company.ticker);
 const labels=companyKpiLabels(company);
 const section=company.sector==="바이오·제약"?
   "제품별 매출·임상·현금 흐름":company.sector==="패션"?
   "브랜드·정가 판매·재고":company.sector==="소비재·서비스"?
   "사업별 운영 지표":"기업별 핵심 지표";
 return '<section class="e8-lens"><div class="e8-lens-top"><h3>실적에서 먼저 볼 것</h3><span>'+esc(section)+'</span></div>'+
  '<div class="e8-focus"><strong>핵심 질문</strong><span>'+esc(company.focus||"사업별 주요 변화 확인")+'</span></div>'+
  '<div class="e8-kpi-line"><b>확인 지표</b><span>'+labels.map(x=>'<em>'+esc(x)+'</em>').join("")+'</span></div>'+
  (company.risk?'<div class="e8-risk"><b>반증·주의</b><span>'+esc(company.risk)+'</span></div>':"")+
  (company.market==="한국"?'<p class="e8-source-state">국내 DART 최신 실적 숫자는 아직 연결되지 않았습니다.</p>':
   company.sector==="바이오·제약"?'<p class="e8-source-state">연결 GAAP 숫자와 제품별 매출·임상 결과는 별개입니다. 임상 진행 상황은 파이프라인 탭에서 확인하세요.</p>':
   company.sector==="패션"?'<p class="e8-source-state">브랜드별 성장·정가 판매·재고는 연결 GAAP 손익과 별도 확인이 필요한 지표입니다.</p>':"")+
  '</section>';
}
function issuerLensBlock(company,secRow){
 if(!company)return "";
 const labels=companyKpiLabels(company);
 const snapshot=issuerSnapshot(company,secRow);
 const values=snapshot?.row?.metrics||[];
 const caution=snapshot?.status==="동일 분기"?"같은 분기 공식 발표 지표":
   snapshot?.status==="과거 분기"?"이전 분기 공식 발표 · 최신 SEC와 구분":"발표 분기 종료일 대조 필요";
 const sectorNote=company.sector==="바이오·제약"?"제품 매출·임상·허가 지표는 연결 GAAP 매출로 대신할 수 없음":
  company.sector==="패션"?"브랜드별 매출·동일매장매출·할인·재고 수치는 연결 GAAP 손익과 별도 확인":
  company.sector==="소비재·서비스"?"예약액·동일매장매출·매장 마진 등은 연결 매출과 정의가 다름":"";
 const facts=values.length?'<div class="e8-issuer-facts">'+values.slice(0,3).map(m=>
  '<div class="e8-issuer-fact"><span>'+esc(m.label)+'</span><strong>'+esc(issuerMetricValue(m))+'</strong>'+
  '<small>'+esc(m.change||"")+'</small><small>'+esc(m.basis||"")+'</small></div>'
 ).join("")+'</div>':"<div class=\"e8-pending-kpis\">"+
  labels.map(x=>'<span>'+esc(x)+' <small>개별 수치 확인 전</small></span>').join("")+"</div>";
 return '<section class="e8-issuer-block"><div class="e8-block-heading"><b>기업별 확인 지표</b><span>'+
  esc(company.sector||"")+'</span></div>'+
  (company.focus?'<div class="e8-block-focus">'+esc(company.focus)+'</div>':"")+
  (values.length?'<div class="e8-metric-caption">'+esc(snapshot.row.period||"기간 미확인")+' · '+esc(caution)+'</div>':"")+
  facts+
  (values.length?'<div class="e8-issuer-source"><a href="'+uri(snapshot.row.sourceURL)+'" target="_blank" rel="noopener noreferrer">회사 발표 원문</a></div>':"")+
  (sectorNote?'<p class="e8-sector-note">'+esc(sectorNote)+'</p>':"")+
  (company.risk?'<div class="e8-block-risk"><b>위험 확인</b><span>'+esc(company.risk)+'</span></div>':"")+
  '</section>';
}
let secSectorFilter="전체";
function applySecArchiveFilter(){
 const search=(document.getElementById("sec-archive-search")?.value||"").trim().toLowerCase();
 const rows=document.querySelectorAll(".sec-record-list .sec-record");
 let count=0;
 rows.forEach(el=>{
  const visible=(secSectorFilter==="전체"||el.dataset.sector===secSectorFilter)&&
   (el.getAttribute("data-search")||"").includes(search);
  el.hidden=!visible;
  if(visible)count++;
 });
 document.querySelectorAll("[data-sec-sector]").forEach(b=>{
  const active=b.dataset.secSector===secSectorFilter;
  b.classList.toggle("is-current",active);
  b.setAttribute("aria-pressed",active?"true":"false");
 });
 const label=document.getElementById("sec-visible-count");
 if(label)label.textContent=count+"개 기업";
 const empty=document.getElementById("sec-search-empty");
 if(empty)empty.hidden=count!==0;
}
document.addEventListener("click",event=>{
 const b=event.target?.closest?.("[data-sec-sector]");
 if(!b)return;
 secSectorFilter=b.dataset.secSector||"전체";
 applySecArchiveFilter();
});

function secArchive(universe=[]){
 secSectorFilter="전체";
 const rows=(gaap?.companies||[]).filter(r=>r.status==="period_compared"&&Number.isFinite(r.metrics?.revenue?.value))
  .sort((a,b)=>String(b.filed||"").localeCompare(String(a.filed||""))||String(a.ticker).localeCompare(String(b.ticker)));
 if(!rows.length)return '<section class="sec-explorer"><div class="desk-page-title"><h1>SEC 공시·분기 실적</h1></div><p class="sec-empty">공식 분기 자료를 불러오는 중입니다.</p></section>';
 const names=new Map(universe.map(c=>[c.ticker,c]));
 const renderRow=r=>{
  const co=names.get(r.ticker),metrics=r.metrics||{};
  const revenue=metrics.revenue,operating=metrics.operatingIncome,net=metrics.netIncome;
  const margin=Number.isFinite(operating?.value)&&revenue?.value>0?format(operating.value/revenue.value*100,1)+"%":"—";
  const actualName=co?.name||r.companyName||r.ticker;
  const headline=secReadout(r);
  const period=fiscalQuarterLabel(r);
  const check=(co?.kpis||[]).slice(0,2).join(" · ");
  const focus=co?.focus||"";
  const columns=[["매출",revenue],["영업이익",operating],["순이익",net]].map(([name,m])=>
   '<div class="sec-metric"><span>'+esc(name)+'</span><strong>'+secNumber(m?.value)+'</strong><small>전년 동기 '+esc(secDelta(m))+'</small></div>').join("");
  return '<details class="sec-record" data-sector="'+esc(co?.sector||"미분류")+'" data-search="'+esc([r.ticker,actualName,co?.sector||"",co?.focus||"",...(co?.kpis||[])].join(" ").toLowerCase())+'">'+
   '<summary><span class="sec-identity"><b>'+esc(r.ticker)+'</b><span>'+esc(actualName)+'</span></span>'+
   '<span class="sec-period">'+esc(period)+'</span>'+
   '<span class="sec-readout">'+esc(headline)+'<small>'+esc((co?.kpis||[])[0]||"")+'</small></span>'+
   '<span class="sec-primary">'+esc(secDelta(revenue))+'<small>매출 전년 대비</small></span>'+
   '<span class="sec-chevron" aria-hidden="true">⌄</span></summary>'+
   '<div class="sec-record-body"><div class="sec-metrics">'+columns+'</div>'+
   '<div class="sec-result-line"><b>실적 해석</b><span>'+esc(headline)+' · 영업이익률 '+esc(margin)+'</span></div>'+
   (focus?'<div class="sec-result-line"><b>검증 관점</b><span>'+esc(focus)+' <small>· 기존 관찰 질문, 이번 분기 검증 완료를 뜻하지 않음</small></span></div>':"")+
   (check?'<div class="sec-result-line"><b>다음 확인 지표</b><span>'+esc(check)+' <small>· 투자 검증 질문, 공시 확정 사실 아님</small></span></div>':"")+
   issuerLensBlock(co,r)+
   '<div class="sec-record-footer"><span>3개월 GAAP · '+esc(r.periodStart||"")+" ~ "+esc(r.periodEnd||"")+' · 접수 '+esc(r.filed||"")+'</span>'+
   '<a href="'+uri(r.url)+'" target="_blank" rel="noopener noreferrer">SEC 공시 원문 ↗</a></div></div></details>';
 };
 return '<section class="sec-explorer"><div class="desk-page-title"><h1>SEC 공시·분기 실적</h1>'+
  '<span>미국 기업 '+rows.length+'개 · '+esc(String(gaap?.generatedAt||"").slice(0,10))+' 자료</span></div>'+
  '<div class="sec-workbench-head"><strong>기업별 최근 분기 실적</strong>'+
  '<span>매출 · 영업이익 · 순이익</span></div>'+
  '<div class="e8-sector-filter" role="group" aria-label="산업별 분기 실적">'+["전체","바이오·제약","소비재·서비스","패션"].map(x=>
   '<button type="button" data-sec-sector="'+esc(x)+'" class="'+(secSectorFilter===x?'is-current':'')+'" aria-pressed="'+(secSectorFilter===x?'true':'false')+'">'+esc(x)+'</button>').join("")+'</div>'+ 
  '<div class="sec-find"><input type="search" id="sec-archive-search" autocomplete="off" aria-label="SEC 분기 실적 기업 검색" placeholder="기업명 · 티커 · 산업 검색"/>'+
  '<span id="sec-visible-count">'+rows.length+'개 기업</span></div>'+
  '<div class="sec-list-heading"><span>기업</span><span>회계 분기</span><span>확인된 변화</span><span>매출 증감</span><span></span></div>'+
  '<div class="sec-record-list">'+rows.map(renderRow).join("")+'</div>'+
  '<p class="sec-empty" id="sec-search-empty" hidden>검색 결과 없음</p>'+
  '<p class="sec-method-note">SEC GAAP 약 3개월 분기 기준. 전년 동기와 동일 계정을 비교한 결과이며, ‘실적 해석’은 수치의 증감만 표현합니다. 원인·가이던스·투자 판단은 원문과 회사 발표 자료를 추가 확인해야 합니다. 한국 기업 DART 실적은 현재 이 목록에 포함되지 않습니다.</p>'+
  '</section>';
}
document.addEventListener("input",event=>{
 if(event.target?.id==="sec-archive-search")applySecArchiveFilter();
});

function secComparison(ticker){
 const r=gaap?.companies?.find(x=>x.ticker===ticker);
 if(!r||r.status==="source_unavailable")return '<p class="a3-source-wait">SEC GAAP 분기 비교 수집 대기 · 공식 확인 이전 수익률 추정 없음</p>';
 const metrics=r.metrics||{};
 const rows=[["revenue","매출"],["operatingIncome","영업이익"],["netIncome","순이익"]].filter(([k])=>metrics[k]);
 if(!rows.length)return '<p class="a3-source-wait">비교 가능한 GAAP 계정 확인 대기</p>';
 return '<section class="a3-sec-panel"><header><div><b>SEC 공식 실적 · '+esc(fiscalQuarterLabel(r))+'</b><p>분기 종료 '+esc(r.periodEnd)+' · 회계연도(FY) 기준 · 동일 계정/3개월 비교 · 접수 '+esc(r.filed||"확인 대기")+'</p></div><a href="'+uri(r.url)+'" target="_blank" rel="noopener noreferrer">10-Q 원문 ↗</a></header><div class="a3-sec-grid">'+rows.map(([k,label])=>{
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
 const more=preview?'<button class="a3-open-weekly" data-a3="openWeekly">통합 주간 보고서 전체 보기 →</button>':'<button class="a3-open-weekly" data-a3="download" data-sector="'+esc(sector)+'">주간 보고서 저장 ↓</button>';
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

/* Thesis workspace: one company at a time, original research questions != adopted theses. */
const thesisUI={sector:"전체",mode:"전체",search:"",selected:"",saveError:""};
function thesisEvidence(company){
 if(!report||company.market!=="미국")return [];
 return (report.items||[]).filter(x=>x.ticker===company.ticker&&x.sector===company.sector);
}
function thesisStatus(id){
 const item=records[id];
 if(!item||!item.at)return "미기록";
 return item.choice==="판단 보류"?"검토 보류":"판단 기록";
}
function thesisItems(universe){
 const q=thesisUI.search.trim().toLowerCase();
 return (universe||[]).filter(c=>{
  const recent=thesisEvidence(c).length>0;
  if(thesisUI.sector!=="전체"&&c.sector!==thesisUI.sector)return false;
  if(thesisUI.mode==="새 근거"&&!recent)return false;
  if(thesisUI.mode==="기록 있음"&&!records[c.id]?.at)return false;
  if(thesisUI.mode==="미기록"&&records[c.id]?.at)return false;
  if(!q)return true;
  return [c.name,c.ticker,c.sector,c.focus,c.disease,c.domain,c.risk]
    .filter(Boolean).some(x=>String(x).toLowerCase().includes(q));
 }).sort((a,b)=>{
  const x=thesisEvidence(a).length?1:0,y=thesisEvidence(b).length?1:0;
  if(x!==y)return y-x;
  const doneA=records[a.id]?.at?1:0,doneB=records[b.id]?.at?1:0;
  if(doneA!==doneB)return doneA-doneB;
  return a.ticker.localeCompare(b.ticker);
 });
}
function thesisFilterButtons(options,active,kind){
 return options.map(option=>'<button type="button" data-a3="'+kind+'" data-value="'+esc(option)+'" class="'+(active===option?"is-selected":"")+'" aria-pressed="'+String(active===option)+'">'+esc(option)+'</button>').join("");
}
function thesisCompanyList(rows){
 if(!rows.length)return '<div class="t4-list-empty">선택한 조건에 맞는 기업이 없습니다. 산업 또는 상태 필터를 변경해 주세요.</div>';
 return rows.map(c=>{
  const recent=thesisEvidence(c).length;
  const local=thesisStatus(c.id);
  const chosen=thesisUI.selected===c.id;
  return '<button type="button" class="t4-company'+(chosen?" is-active":"")+'" data-a3="thesisSelect" data-id="'+esc(c.id)+'" aria-pressed="'+String(chosen)+'">'+
   '<span class="t4-company-heading"><strong>'+esc(c.ticker)+'</strong><span>'+esc(c.name)+'</span></span>'+
   '<span class="t4-company-meta"><span>'+esc(c.sector)+'</span><span class="'+(recent?"t4-has-source":"")+'">'+(recent?"이번 주 근거 "+recent+"건":local==="미기록"?"근거 대기":esc(local))+'</span></span>'+
   '</button>';
 }).join("");
}
function thesisSourceCards(c){
 const rows=thesisEvidence(c);
 if(!rows.length)return '<p class="t4-evidence-empty">이번 보고기간에 해당 기업의 신규 확인 근거는 없습니다. 기존 가설이 맞거나 틀렸다는 의미는 아닙니다.</p>';
 return rows.slice(0,3).map(x=>
  '<article class="t4-source-card"><div class="t4-source-meta"><span>'+esc(x.eventDate)+'</span><span>'+esc(x.tier||x.eventType||"확인 자료")+'</span></div>'+
  '<h4>'+esc(x.title)+'</h4><p>'+esc(x.observation||"")+'</p>'+
  '<div class="t4-source-analysis"><p><b>실적·기업가치 연결</b> '+esc(x.investment||"별도 검증 필요")+'</p>'+
  '<p><b>다음 확인 지표</b> '+esc(x.nextCheck||"공식 실적 원문 대조 필요")+'</p></div>'+
  '<p class="t4-source-caveat">'+esc(x.caveat||"단일 자료만으로 투자 판단을 확정하지 않음.")+'</p>'+
  '<a href="'+uri(x.sourceUrl)+'" target="_blank" rel="noopener noreferrer">공식·검토 원문 ↗</a></article>'
 ).join("");
}
function safeTextArea(value,prop,id,placeholder,rows){
 return '<textarea data-a3-'+prop+'="'+esc(id)+'" rows="'+(rows||3)+'" maxlength="2500" placeholder="'+esc(placeholder||"")+'">'+esc(value||"")+'</textarea>';
}
/* Simple, dated company journal. The original schema and all legacy fields remain intact. */
function memoDate(iso){
 if(typeof iso!=="string"||!Number.isFinite(Date.parse(iso)))return "날짜 미확인";
 return new Date(iso).toLocaleString("ko-KR",{
  year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false
 });
}
function memoEntries(record){
 return Array.isArray(record?.memoEntries)?
  record.memoEntries.filter(e=>e&&typeof e.id==="string"&&typeof e.text==="string"&&
   e.text.trim()&&typeof e.at==="string"&&Number.isFinite(Date.parse(e.at))).slice(-100).reverse():[];
}
function memoEntryCard(entry,id){
 return '<article class="t4-journal-entry"><div class="t4-journal-meta"><time datetime="'+esc(entry.at)+'">'+esc(memoDate(entry.at))+'</time>'+
 '<button type="button" data-a3="memoDelete" data-id="'+esc(id)+'" data-memo-id="'+esc(entry.id)+'" aria-label="이 메모 삭제">삭제</button></div>'+
 '<p>'+esc(entry.text)+'</p></article>';
}
function companyMemo(c){
 if(!c)return '<p class="t4-no-choice">기업을 선택해 주세요.</p>';
 const id=c.id,old=records[id]||{},entries=memoEntries(old),hyp=String(old.hypothesis||"");
 const shown=entries.slice(0,5),more=entries.slice(5);
 const hasLegacy=Boolean(old.note||old.riskOverride||old.choice);
 const lastUpdate=old.at?'마지막 저장 '+esc(memoDate(old.at)):'아직 저장한 기록 없음';
 return '<section class="t4-quickmemo">'+
 '<div class="t4-quickmemo-head"><h3>나의 메모</h3><small>'+lastUpdate+'</small></div>'+
 '<div class="t4-baseline"><b>투자 논리 · 초기 검증 질문</b><p>'+esc(c.focus||"기업 공식 자료를 확인한 뒤 투자 논리를 작성하세요.")+'</p>'+
 '<small>위 문장은 출발점이며 확정된 투자 가설이 아닙니다.</small></div>'+
 (()=>{const event=reviewFor(id);if(!event)return "";
  const done=evidenceReviewed(id,event);
  return '<section class="t4-evidence-review"><div><b>새로 확인할 근거</b><small>'+esc(event.evidenceDate||"날짜 미확인")+'</small></div>'+
   '<p>'+esc(event.change||"원문 확인 필요")+'</p>'+
   '<a href="'+uri(event.sourceUrl)+'" target="_blank" rel="noopener noreferrer">근거 원문 확인 ↗</a>'+
   (done?'<span class="t4-evidence-done">검토 완료로 기록됨</span>':
   '<button type="button" data-a3="reviewEvidence" data-id="'+esc(id)+'">원문 검토 후 확인 완료</button>')+
   '<small>메모와 독립된 확인 상태이며, 투자 판단 강화·약화를 자동 확정하지 않습니다.</small></section>';
 })()+
 '<label class="t4-field"><span>나의 투자 논리 <em>한 줄 · 직접 수정 가능</em></span>'+
 '<textarea data-a3-quick-thesis="'+esc(id)+'" rows="2" maxlength="600" placeholder="예: 광고 성장과 구독 수익화 → 영업이익·FCF 증가">'+esc(hyp)+'</textarea></label>'+
 '<label class="t4-field"><span>새 메모 <em>저장 시 날짜·시각 자동 기록</em></span>'+
 '<textarea data-a3-quick-entry="'+esc(id)+'" rows="3" maxlength="2500" placeholder="오늘 확인한 공시·이슈, 다음에 볼 숫자, 내 생각의 변화 등을 짧게 기록"></textarea></label>'+
 '<div class="t4-save-row"><button type="button" class="t4-save" data-a3="memoSave" data-id="'+esc(id)+'">메모 저장</button>'+
 '<span class="t4-save-state">이 기기에만 저장 · 기록은 누적 보존</span></div>'+
 (thesisUI.saveError?'<p class="t4-save-error">'+esc(thesisUI.saveError)+'</p>':'')+
 '<div class="t4-journal"><h4>날짜별 기록 <small>'+entries.length+'건</small></h4>'+
 (shown.map(x=>memoEntryCard(x,id)).join("")||
 '<p class="t4-journal-empty">저장된 날짜별 메모가 없습니다. 위에서 첫 기록을 남겨보세요.</p>')+
 (more.length?'<details class="t4-journal-archive"><summary>이전 기록 '+more.length+'건 더 보기</summary>'+
 more.map(x=>memoEntryCard(x,id)).join("")+'</details>':'')+
 '</div>'+
 (hasLegacy?'<details class="t4-legacy-details"><summary>기존 투자 판단·반증 기록 보관</summary>'+
 '<div class="t4-legacy-content">'+(old.choice?'<p><b>기존 판단</b> '+esc(old.choice)+'</p>':'')+
 (old.riskOverride?'<p><b>반증 조건</b> '+esc(old.riskOverride)+'</p>':'')+
 (old.note?'<p><b>기존 판단 메모</b> '+esc(old.note)+'</p>':'')+
 '<small>이전 형식의 원문을 그대로 보존합니다. 기존 개인 기록 백업·복원에도 포함됩니다.</small></div></details>':'')+
 '<p class="t4-privacy">메모는 이 브라우저에만 저장되며 서버로 전송하지 않습니다. 자료실의 개인 기록 백업 기능을 이용하세요.</p>'+
 '</section>';
}
function thesisEditor(c,embedded=false){
 if(!c)return '<div class="t4-no-choice">왼쪽에서 검토할 기업을 선택해 주세요.</div>';
 const id=c.id,previous=records[id]||{},draft=drafts[id]||{};
 const choice=draft.choice||previous.choice||"";
 const hasLocal=Boolean(previous.at);
 const savedHypothesis=previous.hypothesis||"";
 const savedRisk=previous.riskOverride||"";
 const h=draft.hypothesis??savedHypothesis,r=draft.riskOverride??savedRisk,n=draft.note??previous.note??"";
 const sector=(c.market==="한국"?"국내 기존 담당 · ":"")+c.sector;
 const recent=thesisEvidence(c);
 const metrics=(c.kpis||[]).slice(0,4);
 const finance=(c.market==="미국"&&c.sector!=="바이오·제약"?
  '<details class="t4-sec-details"><summary>SEC 공식 분기 실적 변화 확인 (GAAP)</summary>'+secComparison(c.ticker)+'</details>':"");
 const legacy=(window.atelierLegacyThesesFor?.(c.ticker)||[])[0];
 const archive=legacy?'<details class="t4-sec-details t4-fashion-archive"><summary>과거 패션 투자 가설 · 원본 편집 기록 펼치기</summary><div class="t4-fashion-history"><b>'+esc(legacy.title||'과거 투자 가설')+'</b>'+
 '<p><strong>기존 점검</strong> · '+esc(legacy.test||'')+'</p><p><strong>개선 시나리오</strong> · '+esc(legacy.bull||'')+'</p><p><strong>반증 조건</strong> · '+esc(legacy.bear||'')+'</p>'+
 '<small>이전 패션 분석 스냅샷. 최근 공시로 재검증하기 전까지 현재 확정 의견이 아닙니다.</small></div></details>':'';
 return '<div class="t4-editor">'+(embedded?'':'<div class="t4-editor-header">'+
  '<div><div class="t4-eyebrow">'+esc(sector)+'</div><h2>'+esc(c.name)+' <span>'+esc(c.ticker)+'</span></h2>'+
  '<p>'+(savedHypothesis?'<strong>내가 작성한 투자 가설</strong>':'<strong>초기 분석 단계</strong>')+
  ' · '+(hasLocal?"최종 기록 "+esc((previous.at||"").slice(0,10)):"담당자 판단 미저장")+'</p></div>'+
  '<button type="button" class="t4-open-company" data-a3="thesisOpenCompany" data-id="'+esc(id)+'">기업 상세 →</button></div>')+
  '<section class="t4-step"><div class="t4-step-heading"><span class="t4-step-num">01</span><div><h3>투자 논리</h3><p>앞으로 1~3년 실적·가치를 움직일 변화를 한 문장으로 정리</p></div></div>'+
  '<div class="t4-baseline"><b>초기 검증 질문 · 아직 확정된 투자 가설 아님</b><p>'+esc(c.focus)+'</p></div>'+
  '<label class="t4-field"><span>나의 투자 가설 <em>직접 작성 · 선택</em></span>'+
  safeTextArea(h,"hypothesis",id,"예: 고객 수 증가 → 단위 수익성 개선 → FCF 확대처럼 사업과 재무의 연결을 작성",3)+'</label>'+archive+'</section>'+
  '<section class="t4-step"><div class="t4-step-heading"><span class="t4-step-num">02</span><div><h3>새롭게 확인된 근거</h3><p>최신 원문이 기존 가설에 어떤 정보를 더했는지 확인</p></div><span class="t4-evidence-count">'+recent.length+'건</span></div>'+
  '<div class="t4-evidence-list">'+thesisSourceCards(c)+'</div>'+(embedded?'':finance)+'</section>'+
  '<section class="t4-step"><div class="t4-step-heading"><span class="t4-step-num">03</span><div><h3>반증 조건과 다음 확인</h3><p>무엇이 틀어지면 투자 논리를 다시 검토해야 하는가</p></div></div>'+
  '<div class="t4-baseline"><b>초기 위험 질문</b><p>'+esc(c.risk)+'</p></div>'+
  '<label class="t4-field"><span>내 반증 조건 <em>직접 작성 · 선택</em></span>'+
  safeTextArea(r,"risk-override",id,"가설이 깨지는 정량 KPI·이벤트·경쟁 상황을 구체적으로 기록",2)+'</label>'+
  (metrics.length?'<div class="t4-kpi-strip"><b>다음 점검 KPI</b><div>'+metrics.map(k=>'<span>'+esc(k)+'</span>').join("")+'</div></div>':"")+'</section>'+
  '<section class="t4-step t4-decision"><div class="t4-step-heading"><span class="t4-step-num">04</span><div><h3>나의 판단 기록</h3><p>자동 분석은 방향을 확정하지 않음 · 아래 선택은 저장 전까지 임시</p></div></div>'+
  '<div class="t4-choices">'+["판단 보류","강화","유지","약화"].map(val=>
  '<button type="button" data-a3="choose" data-id="'+esc(id)+'" data-choice="'+esc(val)+'" aria-pressed="'+String(choice===val)+'" class="'+(choice===val?"is-selected":"")+'">'+esc(val)+'</button>').join("")+'</div>'+
  '<label class="t4-field"><span>판단 근거 / 다음 확인 일정</span>'+
  safeTextArea(n,"note",id,"원문 확인 결과와 선택한 판단의 이유를 기록하세요.",3)+'</label>'+
  '<div class="t4-save-row"><button type="button" class="t4-save" data-a3="save" data-id="'+esc(id)+'">내 판단 저장</button>'+
  '<button type="button" class="t4-clear" data-a3="clear" data-id="'+esc(id)+'">이 기업의 로컬 기록 지우기</button>'+
  '<span class="t4-save-state">'+(hasLocal?"저장 완료 · "+esc((previous.at||"").slice(0,10)):"아직 저장되지 않음")+'</span></div>'+
  (thesisUI.saveError?'<p class="t4-save-error">'+esc(thesisUI.saveError)+'</p>':'')+
  '<p class="t4-privacy">이 화면의 작성 내용은 현재 브라우저에만 저장됩니다. 기기 간 동기화되지 않으며 브라우저 데이터를 삭제하면 사라질 수 있습니다.</p></section>'+
  '</div>';
}
function thesisWorkspace(universe){
 const rows=thesisItems(universe);
 if(!rows.some(x=>x.id===thesisUI.selected))thesisUI.selected=rows[0]?.id||"";
 const chosen=rows.find(x=>x.id===thesisUI.selected)||null;
 const count=universe?.length||0;
 const newCount=(universe||[]).filter(c=>thesisEvidence(c).length).length;
 const savedCount=(universe||[]).filter(c=>records[c.id]?.at).length;
 const sectors=["전체","내 담당 기업","바이오·제약","소비재·서비스","패션"];
 return '<div class="t4-workspace">'+
  '<header class="t4-title-row"><div><span class="t4-eyebrow">ATELIER · 투자 판단 워크스페이스</span><h1>투자 가설</h1>'+
  '<p>기업의 핵심 논리 → 새 근거 → 반증 조건 → 담당자 판단 순서로 검토합니다.</p></div>'+
  '<span class="t4-data-note">'+esc(report?.periodStart||"자료 수집 대기")+' ~ '+esc(report?.periodEnd||"")+' · 이번 주 근거 기준</span></header>'+
  '<div class="t4-summary">'+
  '<div><span>추적 기업</span><strong>'+count+'</strong><small>미국 47 · 국내 5</small></div>'+
  '<div><span>이번 주 새 근거</span><strong>'+newCount+'</strong><small>원문 확인 기업</small></div>'+
  '<div><span>내 판단 기록</span><strong>'+savedCount+'</strong><small>현재 브라우저 기준</small></div>'+
  '<div><span>아직 미기록</span><strong>'+(count-savedCount)+'</strong><small>미정의 기업 포함</small></div></div>'+
  '<div class="t4-toolbar"><div class="t4-toolbar-group"><b>산업</b><div class="t4-chips">'+thesisFilterButtons(sectors,thesisUI.sector,"thesisSector")+'</div></div>'+
  '<div class="t4-toolbar-group"><b>검토 상태</b><div class="t4-chips">'+thesisFilterButtons(["전체","새 근거","기록 있음","미기록"],thesisUI.mode,"thesisMode")+'</div></div></div>'+
  '<div class="t4-layout"><aside class="t4-company-panel"><div class="t4-list-top"><h2>기업 목록 <span>'+rows.length+'개</span></h2>'+
  '<label for="t4-company-search">기업·티커·가설 검색</label><input id="t4-company-search" type="search" data-a3-search="true" value="'+esc(thesisUI.search)+'" placeholder="종목명, 티커 또는 검증 질문"/></div>'+
  '<div class="t4-company-scroll" aria-label="투자 가설 검토 기업">'+thesisCompanyList(rows)+'</div></aside>'+
  '<main class="t4-main">'+thesisEditor(chosen)+'</main></div>'+
  '<p class="t4-workspace-foot">초기 질문은 리서치 출발점이며 확정된 매수·매도 의견이 아닙니다. 국내 담당 기업의 비공개 브리프 원본은 아직 연결되지 않았습니다.</p></div>';
}

function reviewFor(companyId){
 const t=report?.reviewCandidates?.find(x=>x.companyId===companyId);
 return t||null;
}
/* A memo edit is not proof that the investor reviewed the latest evidence. */
function evidenceKey(event){
 return [event?.evidenceDate||"",event?.sourceUrl||"",event?.change||""].join("|");
}
function evidenceReviewed(id,event){
 return !!(event&&records[id]?.reviewedEvidence?.[evidenceKey(event)]);
}
function markEvidenceReviewed(id){
 const event=reviewFor(id);
 if(!event)return false;
 const existing=records[id]||{};
 const next={...existing,reviewedEvidence:{...(existing.reviewedEvidence||{}),[evidenceKey(event)]:new Date().toISOString()}};
 try{
  localStorage.setItem(KEY,JSON.stringify({...records,[id]:next}));
  records[id]=next;thesisUI.saveError="";
  return true;
 }catch(_){
  thesisUI.saveError="검토 확인 상태를 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.";
  return false;
 }
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
 '<label class="a3-review-note">판단 근거<textarea data-a3-note="'+esc(id)+'" rows="2" placeholder="브라우저 로컬 기록">'+esc(drafts[id]?.note??old.note??"")+'</textarea></label>')+
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
function industryOverview(){
 const data=window.ATELIER2?.data?.companies||[];
 const blocks=[
  {sector:"바이오·제약",fallback:20},
  {sector:"소비재·서비스",fallback:15},
  {sector:"패션",fallback:12},
  {sector:"내 담당 기업",fallback:5}
 ];
 return '<section class="a5-industries desk-industries"><div class="desk-section-heading"><h2>산업별</h2><span>기업 탐색</span></div>'+
  '<div class="a5-industry-grid">'+blocks.map(x=>{
   const count=data.length?data.filter(c=>c.sector===x.sector).length:x.fallback;
   const latest=(report?.items||[]).find(r=>r.sector===x.sector);
   const line=latest?esc(latest.ticker+" · "+latest.title):"신규 확인 근거 없음";
   return '<button type="button" class="a5-industry" data-a3="goSector" data-sector="'+esc(x.sector)+'">'+
    '<span class="desk-sector-top"><strong>'+esc(x.sector)+'</strong><b>'+count+'</b></span>'+
    '<span class="desk-sector-summary">'+line+'</span>'+
    '<span class="desk-sector-foot">기업 보기 <span aria-hidden="true">↗</span></span></button>';
  }).join('')+'</div></section>';
}
function overviewSignals(){
 const verified=(report?.items||[]).filter(x=>String(x.tier||"").startsWith("공식 ")||x.tier==="편집 원문 대조");
 const rank=x=>String(x.tier||"").startsWith("공식 ")?0:1;
 const items=verified.slice().sort((a,b)=>rank(a)-rank(b)||String(b.eventDate||"").localeCompare(String(a.eventDate||""))).slice(0,3);
 const universe=window.ATELIER2?.data?.companies||[];
 return '<section class="a5-overview-signals desk-signals"><div class="desk-panel-heading">'+
  '<div class="desk-heading-main"><span class="desk-panel-n">01</span><h2>새로 확인된 변화</h2></div>'+
  '<button type="button" data-a3="openWeekly" class="desk-text-action">전체 보기 <span aria-hidden="true">↗</span></button></div>'+
  (items.length?'<div class="a5-signal-list">'+items.map((x,i)=>{
   const issuer=universe.find(c=>c.ticker===x.ticker&&c.sector===x.sector);
   const official=rank(x)===0;
   return '<button type="button" class="a5-signal" data-a3="openSignalCompany" data-id="'+esc(issuer?.id||"")+'">'+
    '<span class="a5-signal-num">'+String(i+1).padStart(2,"0")+'</span>'+
    '<span class="desk-signal-main"><span class="desk-signal-meta"><span class="desk-signal-ticker">'+esc(x.ticker||x.sector)+'</span><span>'+esc(x.eventDate)+'</span><span>'+esc(official?"공식 공시":"원문 검토")+'</span></span>'+
    '<strong>'+esc(x.title)+'</strong></span><span class="desk-signal-arrow" aria-hidden="true">↗</span></button>';
  }).join('')+'</div>':
  '<p class="desk-empty">새로 확인된 근거 없음</p>')+
  '<div class="desk-panel-note">공식 자료 우선 · 같은 검증 수준은 최근 순</div></section>';
}
function attentionQueue(){
 const pending=(report?.reviewCandidates||[]).filter(x=>!evidenceReviewed(x.companyId,x));
 return '<section class="a5-attention desk-attention"><div class="desk-panel-heading">'+
  '<div class="desk-heading-main"><span class="desk-panel-n">02</span><h2>검토할 기업</h2></div>'+
  '<span class="a5-count">'+pending.length+'</span></div>'+
  (pending.length?'<div class="a5-attention-list">'+pending.slice(0,5).map(x=>
   '<button type="button" data-a3="goDecision" data-id="'+esc(x.companyId)+'"><b>'+esc(x.ticker)+'</b>'+
   '<span>'+esc(x.change)+'</span><span class="desk-review-arrow" aria-hidden="true">↗</span></button>'
  ).join('')+'</div>':'<div class="desk-empty">검토 대기 없음</div>')+
  (pending.length>5?'<button type="button" data-a3="openWeekly" class="desk-review-more">전체 '+pending.length+'건 보기 ↗</button>':'')+
  '<div class="desk-panel-note">메모 저장과 근거 검토는 별도 관리</div></section>';
}
function reviewQueue(sector="전체"){
 if(!report)return '<p class="a5-queue-empty">판단 대기 목록을 불러오는 중입니다.</p>';
 const all=(report.reviewCandidates||[]).filter(x=>sector==="전체"||x.sector===sector);
 const pending=all.filter(x=>!evidenceReviewed(x.companyId,x));
 if(!pending.length)return '<p class="a5-queue-empty">현재 해당 산업에 담당자 판단을 기다리는 신규 근거가 없습니다.</p>';
 return '<section class="a5-review-queue"><div class="a5-section-head"><div><h3>판단이 필요한 기업</h3><p>가설 결론은 기업별 「투자 판단」에서 직접 확정합니다.</p></div><span class="a5-count">'+pending.length+'개</span></div>'+
 '<div class="a5-review-rows">'+pending.map(x=>
 '<button type="button" data-a3="goDecision" data-id="'+esc(x.companyId)+'"><strong>'+esc(x.ticker)+'</strong><span>'+esc(x.change)+'<small>'+esc(x.evidenceDate)+' · 신규 확인 근거</small></span><b>기업 투자 판단 →</b></button>'
 ).join('')+'</div></section>';
}
function openCompanyDecision(id){
 const state=window.ATELIER2?.state;
 if(!state||!id)return;
 state.sector="전체";state.market="전체";state.disease="전체";state.technology="전체";state.search="";
 state.selected=id;state.detailTab="나의 메모";
 if(window.atelierGotoCompanies)window.atelierGotoCompanies();
}
function overview(){return overviewSignals();}
function markdownReport(sector="전체"){
 if(!report)return "# ATELIER 주간 보고서\n\n자료 수집 대기";
 const rows=(report.items||[]).filter(x=>sector==="전체"||x.sector===sector);
 let lines=[
  "# ATELIER | 통합 투자 리서치",
  "",
  "보고기간: "+report.periodStart+" ~ "+report.periodEnd+" ("+(report.timezone||"UTC")+")",
  "산업: "+sector+" · 검증된 신규 변화 "+rows.length+"건",
  "",
  "※ SEC GAAP·임상 등록정보·원문 편집 자료를 구분. 자동 검토 제안은 매매 의견이 아님.",
  ""
 ];
 rows.forEach((r,i)=>{
  lines.push("## "+(i+1)+". ["+r.sector+"] "+r.title,
   "- 사실 확인: "+r.observation,
   "- 투자 연결: "+r.investment,
   "- 다음 검증: "+r.nextCheck,
   "- 해석 한계: "+r.caveat,
   "- 출처: "+r.sourceLabel+" · "+r.eventDate+(r.period?" · "+r.period:""),
   "- 원문: "+r.sourceUrl,"");
 });
 if(!rows.length)lines.push("보고기간 중 원문으로 확인된 신규 변화가 없습니다.","");
 if(sector==="전체"||sector==="바이오·제약"){
  lines.push("## 향후 바이오 시험 일정 (이번 주 발생 사건 아님)","");
  (report.upcomingClinical||[]).forEach(x=>lines.push("- "+x.title+" · "+x.date+" · "+x.nextCheck+" · "+x.url));
  lines.push("");
 }
 if(sector==="전체"||sector==="소비재·서비스"){
  lines.push("## 회사 고유 KPI 갱신 확인 목록","");
  (report.staleConsumerKpi||[]).forEach(x=>lines.push("- "+x.ticker+" · 이전 "+x.period+" / 신규 SEC "+x.newSECPeriod+" · "+x.reason+" · "+x.url));
  lines.push("");
 }
 lines.push("자료 생성: "+(report.generatedAt||"미확인"),"한국 기존 담당 브리프·DART 원본 비교는 아직 미연결.");
 return lines.join("\n");
}
function downloadReport(sector){
 const contents=markdownReport(sector);
 const blob=new Blob([contents],{type:"text/markdown;charset=utf-8"});
 const href=URL.createObjectURL(blob);
 const anchor=document.createElement("a");
 anchor.href=href;
 anchor.download="ATELIER_주간리서치_"+(report?.periodEnd||"기준일미확인")+".md";
 document.body.appendChild(anchor);
 anchor.click();
 anchor.remove();
 setTimeout(()=>URL.revokeObjectURL(href),1200);
}
function captureDraft(id){
 if(!id)return {};
 const current={...(drafts[id]||{})};
 for(const [key,selector] of [["note","note"],["hypothesis","hypothesis"],["riskOverride","risk-override"]]){
  const element=document.querySelector('[data-a3-'+selector+'="'+id+'"]');
  if(element)current[key]=String(element.value||"").slice(0,2500);
 }
 drafts[id]=current;
 return current;
}
function saveChoice(id,choice){
 if(!id)return;
 const unsaved=captureDraft(id);
 const previous=records[id]||{};
 const next={
  ...previous,choice,
  note:(unsaved.note??previous.note??"").slice(0,2500),
  hypothesis:(unsaved.hypothesis??previous.hypothesis??"").slice(0,2500),
  riskOverride:(unsaved.riskOverride??previous.riskOverride??"").slice(0,2500),
  at:new Date().toISOString()
 };
 try{
  localStorage.setItem(KEY,JSON.stringify({...records,[id]:next}));
  records[id]=next;delete drafts[id];thesisUI.saveError="";
 }catch(_){
  thesisUI.saveError="이 브라우저에 저장하지 못했습니다. 저장 공간·개인정보 보호 설정을 확인해 주세요.";
 }
 if(window.atelierRerender)window.atelierRerender();
}
document.addEventListener("click",e=>{
 const b=e.target.closest("[data-a3]");if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();
 const kind=b.dataset.a3,id=b.dataset.id;
 if(kind==="reviewEvidence"){
  if(markEvidenceReviewed(id)){
   b.textContent="근거 검토 완료로 기록됨";b.disabled=true;b.classList.add("is-reviewed");
  }else{
   const line=b.closest(".t4-evidence-review")?.querySelector("small:last-child");
   if(line)line.textContent=thesisUI.saveError;
  }
 }else if(kind==="memoSave"){
   const thesis=document.querySelector('[data-a3-quick-thesis="'+id+'"]');
   const note=document.querySelector('[data-a3-quick-entry="'+id+'"]');
   const previous=records[id]||{};
   const hypothesis=String(thesis?.value??previous.hypothesis??"").trim().slice(0,600);
   const text=String(note?.value||"").trim().slice(0,2500);
   if(!text&&hypothesis===String(previous.hypothesis||"")){
    thesisUI.saveError="새 메모를 쓰거나 투자 논리를 수정한 뒤 저장해 주세요.";
   }else{
    const now=new Date().toISOString();
    const oldEntries=Array.isArray(previous.memoEntries)?previous.memoEntries.slice(-99):[];
    const entries=text?[...oldEntries,{id:"m-"+Date.now()+"-"+Math.random().toString(36).slice(2,8),at:now,text}]:oldEntries;
    const next={...previous,hypothesis,memoEntries:entries,at:now};
    try{
     localStorage.setItem(KEY,JSON.stringify({...records,[id]:next}));
     records[id]=next;delete drafts[id];thesisUI.saveError="";
    }catch(_){thesisUI.saveError="저장할 수 없습니다. 브라우저 저장 공간을 확인하고 개인 기록을 백업해 주세요."}
   }
   if(window.atelierRerender)window.atelierRerender();
 }else if(kind==="memoDelete"){
   const existing=records[id]||{},entries=Array.isArray(existing.memoEntries)?existing.memoEntries:[];
   const key=b.dataset.memoId;
   if(!entries.some(e=>e.id===key))return;
   if(typeof window.confirm==="function"&&!window.confirm("선택한 날짜별 메모 한 건을 삭제할까요?"))return;
   const next={...existing,memoEntries:entries.filter(e=>e.id!==key),at:new Date().toISOString()};
   try{localStorage.setItem(KEY,JSON.stringify({...records,[id]:next}));records[id]=next;thesisUI.saveError=""}
   catch(_){thesisUI.saveError="메모 삭제 내용을 저장하지 못했습니다."}
   if(window.atelierRerender)window.atelierRerender();
 }else if(kind==="choose"){
   const d=captureDraft(id);
   drafts[id]={...d,choice:b.dataset.choice};
   if(window.atelierRerender)window.atelierRerender();
 }else if(kind==="save"){
   saveChoice(id,drafts[id]?.choice||records[id]?.choice||"판단 보류");
 }else if(kind==="clear"){
   delete records[id];delete drafts[id];
   try{localStorage.setItem(KEY,JSON.stringify(records));thesisUI.saveError=""}
   catch(_){thesisUI.saveError="기록 삭제 내용을 브라우저에 저장하지 못했습니다."}
   if(window.atelierRerender)window.atelierRerender();
 }else if(kind==="thesisSelect"){
   captureDraft(thesisUI.selected);
   thesisUI.selected=id;
   if(window.atelierRerender)window.atelierRerender();
 }else if(kind==="thesisSector"){
   captureDraft(thesisUI.selected);
   thesisUI.sector=b.dataset.value||"전체";
   thesisUI.selected="";
   if(window.atelierRerender)window.atelierRerender();
 }else if(kind==="thesisMode"){
   captureDraft(thesisUI.selected);
   thesisUI.mode=b.dataset.value||"전체";
   thesisUI.selected="";
   if(window.atelierRerender)window.atelierRerender();
 }else if(kind==="thesisOpenCompany"||kind==="goDecision"){
   openCompanyDecision(id);
 }else if(kind==="openSignalCompany"){
   const state=window.ATELIER2?.state;
   if(state&&id){
    state.sector="전체";state.market="전체";state.disease="전체";state.search="";
    state.selected=id;state.detailTab="실적·이슈";
    if(window.atelierGotoCompanies)window.atelierGotoCompanies();
   }else if(window.atelierGotoWeekly)window.atelierGotoWeekly();
  }else if(kind==="goSector"){
   const state=window.ATELIER2?.state;
   if(state){
    state.sector=b.dataset.sector||"전체";state.market="전체";state.disease="전체";
    state.selected="";state.search="";state.detailTab="사업 이해";
   }
   if(window.atelierGotoCompanies)window.atelierGotoCompanies();
 }else if(kind==="openWeekly"){
   if(window.atelierGotoWeekly)window.atelierGotoWeekly();
 }else if(kind==="download"){
   downloadReport(b.dataset.sector||"전체");
 }
});
document.addEventListener("input",e=>{
 const el=e.target;
 if(el?.dataset?.a3Search){
  captureDraft(thesisUI.selected);
  const pos=el.selectionStart;
  thesisUI.search=el.value||"";
  thesisUI.selected="";
  if(window.atelierRerender)window.atelierRerender();
  const replacement=document.querySelector("[data-a3-search]");
  if(replacement){
   replacement.focus();
   try{replacement.setSelectionRange(pos,pos)}catch(_){}
  }
  return;
 }
 const fieldMap=[["a3Note","note"],["a3Hypothesis","hypothesis"],["a3RiskOverride","riskOverride"]];
 for(const [dataKey,key] of fieldMap){
  const id=el?.dataset?.[dataKey];
  if(!id)continue;
  drafts[id]={...(drafts[id]||{}),[key]:String(el.value||"").slice(0,2500)};
  return;
 }
});
async function load(){
 const sources=await window.ATELIER_DATA.many(["weekly","secTrends"]);
 report=sources[0]&&Array.isArray(sources[0].items)?sources[0]:null;
 gaap=sources[1]&&Array.isArray(sources[1].companies)?sources[1]:null;
 if(window.atelierRerender)window.atelierRerender();
}
window.ATELIER3={load,overview,industryOverview,overviewSignals,attentionQueue,reviewQueue,companyMemo,peerComparison,secArchive,companyEarningsLens,issuerLensBlock,companyDecision:(c)=>thesisEditor(c,true),weekly,proposals,recordCard,thesisWorkspace,secComparison,markdownReport,
 get report(){return report},get gaap(){return gaap},get records(){return records}};
})();