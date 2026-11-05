/* ATELIER 2.0: sector-appropriate research modules, independent of legacy fashion app. */
(()=>{'use strict';
const $=(x)=>document.querySelector(x);
const esc=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:'#'}catch{return '#'}};
const fmt=(n,d=1)=>Number.isFinite(n)?n.toLocaleString('ko-KR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const signed=n=>Number.isFinite(n)?(n>0?'+':'')+fmt(n,2)+'%':'—';
let db=null,prices=null,pipeline=null;
const state={sector:'전체',market:'전체',disease:'전체',technology:'전체',search:'',selected:'US:LLY',detailTab:'사업 이해',benchmark:'XLK',period:'3m',legacy:false,weeklySector:'전체'};
const sectorOptions=['전체','바이오·제약','소비재·서비스','패션','내 담당 기업'];
const periods=[['1w','1주'],['1m','1개월'],['3m','3개월'],['6m','6개월'],['1y','1년']];
const allowedBenchmarks=['SPY','QQQ','XLK'];
const industryProxies=[
 {sector:'바이오·제약',symbol:'XBI',label:'미국 바이오 ETF 대리',count:20},
 {sector:'소비재·서비스',symbol:'XLY',label:'경기소비재 ETF 대리',count:15},
 {sector:'패션',symbol:'XRT',label:'미국 유통 ETF 대리',count:12}
];
function companies(){return db?.companies||[]}
function at(id){return companies().find(c=>c.id===id)}
function click(options,value,kind){
 return options.map(t=>{const v=typeof t==='string'?t:t[0],label=typeof t==='string'?t:t[1];return `<button class="r2-chip ${value===v?'is-on':''}" data-r2="${kind}" data-val="${esc(v)}" aria-pressed="${value===v}">${esc(label)}</button>`}).join('');
}
function countBySector(){
 return [{s:'바이오·제약',n:20},{s:'소비재·서비스',n:15},{s:'패션',n:12},{s:'내 담당 기업',n:5}];
}
function priceReturn(sym,term=state.period){const value=prices?.returns?.[sym]?.[term];return Number.isFinite(value)?value:null}
function relative(sym,bench=state.benchmark,term=state.period){
 const x=priceReturn(sym,term),b=priceReturn(bench,term);
 return x===null||b===null?null:Math.round((x-b)*100)/100;
}
function marketReady(){return ['ok','partial'].includes(prices?.status)&&!!prices?.asOf}
function marketBanner(){
 const msg=prices?.status==='key_required'?'시세 API 미설정':
 prices?.status==='display_permission_required'?'외부 표시 라이선스 확인 필요':
 prices?.status==='unavailable'?'이번 수집에서 시세 확인 실패':
 prices?.status==='partial'?'일부 ETF 시세 미확인':'배당·분할 조정 종가 자료 대기';
 return `<div class="r2-data-note">${marketReady()?'기준 종가 '+esc(prices.asOf)+' · 배당·분할 조정 ·':esc(msg)+' ·'} ETF는 산업 대리 지표이며 52개 기업 동일가중 성과가 아닙니다. 해외 ETF와 국내 종목의 원화 수익률은 직접 비교하지 않습니다.</div>`;
}
function marketPanel(){
 const rows=industryProxies.map(x=>{
 const abs=priceReturn(x.symbol),rel=relative(x.symbol);
 const breadth=prices?.weeklyBreadth?.[x.symbol];
 return `<tr><td><b>${esc(x.sector)}</b><small>${esc(x.label)}</small></td>
 <td class="r2-num ${abs===null?'':'r2-'+(abs>=0?'up':'down')}">${signed(abs)}</td>
 <td class="r2-num ${rel===null?'':'r2-'+(rel>=0?'up':'down')}">${signed(rel)}${rel!==null?'<em>p</em>':''}</td>
 <td class="r2-num">${breadth&&breadth.weeksCompared===4?breadth.weeksOutperformed+'/4주':'—'}</td>
 <td><button class="r2-link" data-r2="sector" data-val="${esc(x.sector)}">기업 보기 →</button></td></tr>`;
 }).join('');
 return `<section class="r2-panel"><div class="r2-panel-head"><div><div class="r2-eyebrow">시장 대비 산업 상대강도</div><h2>AI·기술주 대비 바이오·소비재 관심의 확산</h2><p>미국 기술주 대비 산업 ETF 성과를 비교. 개별 기업 성과·자금 유입은 별도 확인</p></div></div>
 <div class="r2-toolbar"><span>비교 지수</span>${click(allowedBenchmarks,state.benchmark,'benchmark')}<span class="r2-spacer"></span><span>기간</span>${click(periods,state.period,'period')}</div>
 <div class="r2-table-scroll"><table class="r2-table"><thead><tr><th>관찰 산업</th><th>ETF 수익률</th><th>${esc(state.benchmark)} 대비</th><th>최근 4주 상회</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
 ${marketBanner()}
 <p class="r2-foot">SPY=S&P 500 대형주 · QQQ=Nasdaq-100 성장주 대리 · XLK=정보기술 업종 · XBI/XLY/XRT=업종 대리 ETF. '상회 4주'는 4개의 주간 구간 중 기술주 대비 강세인 주의 수이며 ETF 자금 유입을 뜻하지 않음.</p>
 </section>`;
}
function overview(){
 if(!db)return '<section class="r2-panel"><p class="r2-empty">통합 산업 데이터 로딩 중…</p></section>';
 return `<div class="r2-overview">
 <div class="r2-stats">${countBySector().map(x=>`<button class="r2-stat" data-r2="sector" data-val="${esc(x.s)}"><strong>${x.n}</strong><span>${esc(x.s)}</span><small>기업 보기 →</small></button>`).join('')}</div>
 ${marketPanel()}
 <div class="r2-panel r2-shortcuts"><h3>산업별 분석 기준</h3>
 <div class="r2-shortcut-grid">
 <button data-r2="sector" data-val="바이오·제약"><b>바이오·제약</b><span>질환 → 약물·기술 → 임상·허가 → 현금</span></button>
 <button data-r2="sector" data-val="소비재·서비스"><b>소비재·서비스</b><span>방문·이용 → 가격·수익화 → 마진·FCF</span></button>
 <button data-r2="sector" data-val="패션"><b>미국 패션</b><span>스타일·브랜드 → 정가 판매 → 동일매장매출</span></button>
 <button data-r2="sector" data-val="내 담당 기업"><b>국내 기존 브리프</b><span>산업별 KPI → 투자 가설의 강화·약화</span></button>
 </div></div></div>`;
}
function visibleCompanies(){
 const search=state.search.trim().toLowerCase();
 return companies().filter(x=>
 (state.sector==='전체'||x.sector===state.sector)&&
 (state.market==='전체'||x.market===state.market)&&
 (state.sector!=='바이오·제약'||state.disease==='전체'||x.disease===state.disease||x.secondaryDiseases?.includes(state.disease))&&
 (state.sector!=='바이오·제약'||state.technology==='전체'||x.technology===state.technology)&&
 (!search||[x.ticker,x.name,x.sector,x.domain,x.disease,x.technology,x.focus,...(x.brands||[])].filter(Boolean).some(y=>String(y).toLowerCase().includes(search)))
 );
}
function pill(text){return `<span class="r2-pill">${esc(text)}</span>`}
function bioFilters(){
 if(state.sector!=='바이오·제약')return '';
 const groups=db?.diseaseGroups||[];
 const technologies=[...new Set(companies().filter(x=>x.sector==='바이오·제약').map(x=>x.technology))].sort();
 return `<div class="r2-bio-filter"><div><b>질환 분야</b><div class="r2-filter-wrap">${click(['전체',...groups],state.disease,'disease')}</div></div>
 <div><b>치료 기술</b><div class="r2-filter-wrap">${click(['전체',...technologies],state.technology,'technology')}</div></div>
 <small>한 기업은 여러 질환에 걸칠 수 있습니다. 약물별 적응증·임상 단계는 별도 기록으로 검증합니다.</small></div>`;
}
function cardsTable(list){
 return `<div class="r2-company-list" role="list" aria-label="기업 목록">${list.slice(0,80).map(x=>`<button role="listitem" class="r2-company-row ${state.selected===x.id?'is-selected':''}" data-r2="company" data-val="${esc(x.id)}"><span class="r2-ticker">${esc(x.ticker)}</span><span class="r2-company-name"><b>${esc(x.name)}</b><small>${esc(x.disease||x.domain||x.sector)}</small></span><span class="r2-market">${esc(x.market)}</span></button>`).join('')}
 ${!list.length?'<div class="r2-empty">조건에 맞는 기업이 없습니다. 필터를 변경해 주세요.</div>':''}</div>`;
}
function detailTabs(company){
 const tabs=['사업 이해','핵심 KPI',company.sector==='바이오·제약'?'질환·파이프라인':'산업·경쟁','투자 가설'];
 return `<div class="r2-detail-tabs">${tabs.map(t=>`<button data-r2="tab" data-val="${esc(t)}" class="${state.detailTab===t?'is-active':''}">${esc(t)}</button>`).join('')}</div>`;
}
function drugPanel(company){
 const rows=(pipeline?.records||[]).filter(x=>x.ticker===company.ticker);
 return `<div class="r2-detail-body"><div class="r2-disease-tags">${pill(company.disease)}${(company.secondaryDiseases||[]).map(pill).join('')}${pill(company.technology)}</div>
 <div class="r2-box-lite"><h4>개별 약물·시험 추적</h4><p>질환 분야와 치료 기전은 회사의 연구 노출을 이해하기 위한 분류. 개별 약물의 임상 단계·허가·NCT 번호는 공시 및 ClinicalTrials.gov 검증 후 표시합니다.</p></div>
 ${rows.length?`<table class="r2-mini-table"><thead><tr><th>약물 관찰 후보</th><th>치료 기술</th><th>검증 상태</th></tr></thead><tbody>${rows.map(r=>`<tr><td><a href="${url(r.link)}" target="_blank" rel="noopener noreferrer">${esc(r.asset)} ↗</a><small>${esc(r.disease)}</small></td><td>${esc(r.modality)}</td><td>공식 단계 확인 전</td></tr>`).join('')}</tbody></table>`:'<p class="r2-empty">추적할 약물·임상 등록번호를 공식 자료와 대조해 추가할 예정입니다.</p>'}
 <div class="r2-check"><b>질환별 체크</b><span>${esc(company.focus)}</span><small>효능·안전성 지표는 질환별로 정의가 다르므로 공통 점수로 합산하지 않습니다.</small></div></div>`;
}
function detailBody(company){
 if(state.detailTab==='핵심 KPI')return `<div class="r2-detail-body"><h4>업종별 핵심 지표</h4><p class="r2-muted">아래는 앞으로 점검할 지표 목록이며 최신 실적 수치를 의미하지 않습니다.</p><div class="r2-kpi-grid">${(company.kpis||[]).map((k,i)=>`<div class="r2-kpi"><span>${i+1<10?'0'+(i+1):i+1}</span><b>${esc(k)}</b><small>공식 자료 대조 대기</small></div>`).join('')}</div>
 <p class="r2-muted">서로 다른 회사의 사업·회계기간·조정 지표를 혼합해 비교하지 않습니다.</p></div>`;
 if(state.detailTab==='질환·파이프라인')return drugPanel(company);
 if(state.detailTab==='산업·경쟁')return `<div class="r2-detail-body"><div class="r2-check"><b>산업 분류</b><span>${esc(company.domain||company.sector)}</span></div><div class="r2-check"><b>사업 검증 질문</b><span>${esc(company.focus)}</span></div><div class="r2-check"><b>비교 항목</b><span>${(company.kpis||[]).map(esc).join(' · ')}</span></div></div>`;
 if(state.detailTab==='투자 가설')return `<div class="r2-detail-body"><div class="r2-check"><b>투자 검증 질문</b><span>${esc(company.focus)}</span></div><div class="r2-check"><b>가설을 훼손할 조건</b><span>${esc(company.risk)}</span></div><div class="r2-box-lite"><h4>브리프 이력</h4><p>${company.market==='한국'?'과거 담당 기업의 원본 브리프 연결 대기. 공개 저장소에 비공개 브리프 원문을 업로드하지 않습니다.':'현재는 초기 조사 항목. 정식 투자 가설로 채택·수정한 기록은 아직 없습니다.'}</p></div></div>`;
 return `<div class="r2-detail-body"><div class="r2-check"><b>사업에서 가장 중요한 질문</b><span>${esc(company.focus)}</span></div><div class="r2-check"><b>산업 내 위치</b><span>${esc(company.disease||company.domain||company.sector)} · ${esc(company.maturity||company.technology||'')}</span></div>
 <div class="r2-check"><b>주의할 위험</b><span>${esc(company.risk)}</span></div>
 <div class="r2-box-lite"><h4>자료 상태</h4><p>${esc(company.status)}. 공식 분기·임상·브랜드 지표는 별도 확인이 필요하며, 상단의 기존 패션 시세와 다른 산업을 직접 비교하지 않습니다.</p></div></div>`;
}
function companyDetail(company){
 if(!company)return '<div class="r2-detail r2-empty">기업을 선택해 주세요.</div>';
 const chosen=state.detailTab==='질환·파이프라인'&&company.sector!=='바이오·제약'?'사업 이해':state.detailTab;
 if(chosen!==state.detailTab)state.detailTab=chosen;
 const isBio=company.sector==='바이오·제약';
 return `<section class="r2-detail">
 <div class="r2-detail-header"><div class="r2-eyebrow">${esc(company.market)} · ${esc(company.sector)}</div>
 <h2>${esc(company.name)} <small>${esc(company.ticker)}</small></h2>
 <p>${esc(company.focus)}</p>
 <div class="r2-disease-tags">${pill(company.domain||company.disease||company.sector)}${isBio?pill(company.technology):''}${company.market==='한국'?pill('기존 담당 기업'):''}</div></div>
 <div class="r2-comparison-mini"><span>지수 비교</span><b>${esc(state.benchmark)} · ${esc(periods.find(x=>x[0]===state.period)?.[1]||'3개월')}</b><small>종목별 상대 수익률 연결 전 · 업종 ETF 성과와 혼동하지 않음</small></div>
 ${detailTabs(company)}${detailBody(company)}
 <div class="r2-detail-footer"><a href="${url(company.sourceURL)}" target="_blank" rel="noopener noreferrer">${company.market==='한국'?'DART 원문 검색':'SEC 공시 검색'} ↗</a>
 ${isBio?`<a href="https://clinicaltrials.gov/search?term=${encodeURIComponent(company.name)}" target="_blank" rel="noopener noreferrer">임상시험 검색 ↗</a>`:''}
 ${company.sector==='패션'?'<button class="r2-link" data-r2="legacy">기존 패션 브랜드 분석 열기 →</button>':''}
 </div></section>`;
}
function companyPage(){
 if(!db)return '<p class="r2-empty">추적 기업 데이터 연결 중입니다.</p>';
 const list=visibleCompanies();
 if(!list.some(x=>x.id===state.selected))state.selected=list[0]?.id||'';
 const c=at(state.selected);
 return `<div class="r2-page"><div class="r2-page-head"><div class="r2-eyebrow">기업 분석 · 52종목 통합 관리</div><h1>산업마다 다른 성장 변수와 반증 조건</h1><p>미국 바이오 20 · 소비재 15 · 기존 패션 12 · 한국 기존 담당 5. 공식 실적을 확인하기 전까지 수치는 임의 입력하지 않습니다.</p></div>
 <div class="r2-panel r2-filters"><div class="r2-filter-wrap">${click(sectorOptions,state.sector,'sector')}</div>
 <div class="r2-filter-row"><label>상장 시장</label><div class="r2-filter-wrap">${click(['전체','미국','한국'],state.market,'market')}</div><div class="r2-search-wrap"><input id="r2-search" value="${esc(state.search)}" type="search" aria-label="기업 또는 제품 검색" placeholder="기업·티커·질환·브랜드 검색"/></div></div>
 ${bioFilters()}<div class="r2-filter-meta">결과 <b>${list.length}</b>개 / 전체 52개 · 바이오 질환 및 기술은 교차 분류</div></div>
 <div class="r2-company-grid"><div>${cardsTable(list)}</div><div>${companyDetail(c)}</div></div>
 <p class="r2-foot">국내 담당 기업은 국내 상장 기준. 바이오 기업의 분류는 대표 노출만 표시하며 임상 적응증·단계를 확정한 자료가 아닙니다. 기존 패션 상세 분석은 해당 기업 선택 후 열 수 있습니다.</p>
 </div>`;
}
function weeklyIntro(){
 const all=companies();
 return `<div class="r2-panel r2-weekly-intro"><div class="r2-panel-head"><div><h2>산업별 주간 리서치</h2><p>패션은 원문 대조한 주간 브리프가 연결되어 있습니다. 다른 산업의 전문 기사·임상·DART 분석은 단계별로 연동합니다.</p></div></div>
 <div class="r2-filter-wrap">${click(sectorOptions,state.weeklySector,'weeklySector')}</div>
 ${state.weeklySector==='전체'?`<div class="r2-weekly-grid">${[["바이오·제약","질환·약물별 임상·허가 공시","추가 수집·검증 대기"],["소비재·서비스","예약·방문·구독과 제품 수익화","추가 수집·검증 대기"],["패션","상품·브랜드 변화와 정가 판매","기존 원문 편집 브리프 연결"],["내 담당 기업","원본 브리프와 최신 DART 비교","비공개 원문 연결 대기"]].map(x=>`<div class="r2-weekly-tile"><b>${esc(x[0])}</b><p>${esc(x[1])}</p><small>${esc(x[2])}</small></div>`).join('')}</div>`:
  `<div class="r2-weekly-single"><b>${esc(state.weeklySector)}</b><p>${state.weeklySector==='패션'?'기존 원문 대조 보고서를 아래에서 확인할 수 있습니다.':'원문 내용을 확인한 자료가 아직 연결되지 않았습니다. 기사 제목만으로 분석 보고서를 생성하지 않습니다.'}</p></div>`}
 </div>`;
}
function weeklyFashionEnabled(){return ['전체','패션'].includes(state.weeklySector)}
function goSector(name){
 state.sector=name;state.market='전체';state.search='';state.disease='전체';state.technology='전체';state.selected='';
 state.legacy=false;
 if(typeof window.atelierGotoCompanies==='function')window.atelierGotoCompanies();
 else renderCurrent();
}
function renderCurrent(){if(typeof window.atelierRerender==='function')window.atelierRerender()}
function act(kind,val){
 if(kind==='sector'){goSector(val);return}
 if(kind==='legacy'){if(typeof window.atelierLegacyFashion==='function')window.atelierLegacyFashion();return}
 if(kind==='company'){state.selected=val;state.detailTab='사업 이해'}
 else if(kind==='tab'){state.detailTab=val}
 else if(kind==='market'){state.market=val;state.selected=''}
 else if(kind==='disease'){state.disease=val;state.selected=''}
 else if(kind==='technology'){state.technology=val;state.selected=''}
 else if(kind==='benchmark'&&allowedBenchmarks.includes(val)){state.benchmark=val}
 else if(kind==='period'&&periods.some(x=>x[0]===val)){state.period=val}
 else if(kind==='weeklySector'){state.weeklySector=val}
 renderCurrent();
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-r2]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();act(b.dataset.r2,b.dataset.val||'');
});
document.addEventListener('input',e=>{
 if(e.target.id!=='r2-search')return;
 const pos=e.target.selectionStart;
 state.search=e.target.value;state.selected='';
 renderCurrent();
 const input=$('#r2-search');if(input){input.focus();try{input.setSelectionRange(pos,pos)}catch(_){}}
});
async function load(){
 const all=await Promise.all(['research-universe.json','market-relative.json','research-pipeline.json'].map(async name=>{
  try{const r=await fetch('./'+name,{cache:'no-store'});return r.ok?await r.json():null}catch(_){return null}
 }));
 db=all[0]?.companies?.length===52?all[0]:null;
 prices=all[1]||null;pipeline=all[2]||null;
 renderCurrent();
}
window.ATELIER2={load,overview,companyPage,weeklyIntro,weeklyFashionEnabled,state,get loaded(){return !!db},get data(){return db},get prices(){return prices}};
})();