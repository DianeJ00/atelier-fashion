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
 const blocks=[
  {sector:"바이오·제약",count:20,hint:"신약 개발·임상·허가"},
  {sector:"소비재·서비스",count:15,hint:"방문·구독·예약과 수익화"},
  {sector:"패션",count:12,hint:"상품 반응·정가 판매·재고"},
  {sector:"내 담당 기업",count:5,hint:"기존 국내 브리프 · 최신 DART 미연결"}
 ];
 return '<section class="a5-industries"><div class="a5-section-head"><div><span class="a3-kicker">02 · 산업별 점검</span><h2>산업별 핵심 변화</h2><p>새 근거가 확인된 경우만 요약합니다. 산업별 상세 숫자·원문은 해당 메뉴로 이동해 확인하세요.</p></div></div>'+
 '<div class="a5-industry-grid">'+blocks.map(x=>{
  const recent=(report?.items||[]).find(a=>a.sector===x.sector);
  const evidence=recent?'<p><b>최근 확인</b> '+esc(recent.title)+'</p><small>'+esc(recent.eventDate)+' · '+esc(recent.eventType||"검증 근거")+'</small>':
   '<p class="a5-no-signal">최근 7일 신규 검증 근거 없음</p><small>자료 부재는 산업 전망의 변화 없음과 다릅니다.</small>';
  return '<article class="a5-industry"><div class="a5-industry-top"><div><h3>'+esc(x.sector)+'</h3><span>'+esc(x.hint)+'</span></div><strong>'+x.count+'개</strong></div>'+
  evidence+'<button type="button" data-a3="goSector" data-sector="'+esc(x.sector)+'">기업 분석 보기 →</button></article>';
 }).join('')+'</div></section>';
}
function overviewSignals(){
 const items=(report?.items||[]).slice(0,3);
 return '<section class="a5-overview-signals"><div class="a5-section-head"><div><span class="a3-kicker">03 · 이번 주 투자 신호</span><h2>원문으로 확인한 변화 TOP 3</h2><p>핵심 제목만 제공합니다. 사실·실적 영향·해석 한계는 주간 리서치에서 확인하세요.</p></div><button type="button" data-a3="openWeekly">전체 주간 보고서 →</button></div>'+
 (items.length?'<div class="a5-signal-list">'+items.map((x,i)=>
 '<div class="a5-signal"><span class="a5-signal-num">'+String(i+1).padStart(2,"0")+'</span><div><b>'+esc(x.title)+'</b><small>'+esc(x.sector)+' · '+esc(x.eventDate)+' · '+esc(x.tier||x.eventType)+'</small></div></div>'
 ).join('')+'</div>':'<p class="a3-empty">현재 보고기간에 원문으로 확인된 신규 사건이 없거나 자료 수집 중입니다.</p>')+'</section>';
}
function attentionQueue(){
 const pending=(report?.reviewCandidates||[]).filter(x=>{
  const recorded=records[x.companyId]?.at;
  return !recorded||String(recorded).slice(0,10)<String(x.evidenceDate||"");
 });
 return '<section class="a5-attention"><div class="a5-section-head"><div><span class="a3-kicker">04 · 투자 판단</span><h2>새 근거를 검토할 기업</h2><p>근거가 생겼지만 담당자가 아직 확인하지 않은 기업입니다. 자동으로 강화·약화를 판정하지 않습니다.</p></div><span class="a5-count">'+pending.length+'개</span></div>'+
 (pending.length?'<div class="a5-attention-list">'+pending.slice(0,5).map(x=>
 '<button type="button" data-a3="goDecision" data-id="'+esc(x.companyId)+'"><b>'+esc(x.ticker)+'</b><span>'+esc(x.change)+'</span><small>투자 판단 검토 →</small></button>'
 ).join('')+'</div>':'<p class="a3-empty">현재 새 근거에 따른 미검토 기업이 없습니다. 전체 기업은 기업 분석에서 확인하세요.</p>')+
 (pending.length>5?'<p class="a3-small">상위 5개 기업만 표시. 각 산업별 검토 목록은 주간 리서치에서 확인하세요.</p>':'')+'</section>';
}
function reviewQueue(sector="전체"){
 const all=(report?.reviewCandidates||[]).filter(x=>sector==="전체"||x.sector===sector);
 const pending=all.filter(x=>!records[x.companyId]?.at||
  String(records[x.companyId].at).slice(0,10)<String(x.evidenceDate||""));
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
 state.selected=id;state.detailTab="투자 판단";
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
 if(kind==="choose"){
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
 const sources=await Promise.all(["atelier-weekly.json","sec-trends.json"].map(async name=>{
  try{const r=await fetch("./"+name,{cache:"no-store"});return r.ok?await r.json():null}catch(_){return null}
 }));
 report=sources[0]&&Array.isArray(sources[0].items)?sources[0]:null;
 gaap=sources[1]&&Array.isArray(sources[1].companies)?sources[1]:null;
 if(window.atelierRerender)window.atelierRerender();
}
window.ATELIER3={load,overview,industryOverview,overviewSignals,attentionQueue,reviewQueue,companyDecision:(c)=>thesisEditor(c,true),weekly,proposals,recordCard,thesisWorkspace,secComparison,markdownReport,
 get report(){return report},get gaap(){return gaap},get records(){return records}};
})();