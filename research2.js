/* ATELIER 2.0: sector-appropriate research modules, independent of legacy fashion app. */
(()=>{'use strict';
const $=(x)=>document.querySelector(x);
const esc=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:'#'}catch{return '#'}};
const fmt=(n,d=1)=>Number.isFinite(n)?n.toLocaleString('ko-KR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const signed=n=>Number.isFinite(n)?(n>0?'+':'')+fmt(n,2)+'%':'—';
let db=null,prices=null,pipeline=null,clinicalData=null,stockData=null;
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

function stockBreadthPanel(){
 const stats=stockData?.summary?.[state.benchmark]||{};
 const groups=['바이오·제약','소비재·서비스','패션'];
 const rows=groups.map(group=>{
  const v=stats?.[group]?.[state.period]||{};
  const enough=v.ready===true&&Number.isFinite(v.equalWeightedReturn);
  const base=priceReturn(state.benchmark);
  const difference=enough&&base!==null?Math.round((v.equalWeightedReturn-base)*100)/100:null;
  return `<tr><td><b>${esc(group)}</b><small>추적 종목 동일가중 · 기존 기업 구성</small></td>
  <td class="r2-num">${enough?signed(v.equalWeightedReturn):'—'}</td>
  <td class="r2-num">${signed(difference)}${difference!==null?'<em>p</em>':''}</td>
  <td class="r2-num">${enough?String(v.aboveBenchmarkCount)+'/'+String(v.count):'—'}</td>
  <td>${Number(v.count)||0}/${v.universe||'?'}개</td></tr>`;
 }).join('');
 return `<div class="r2-breadth"><div class="r2-breadth-title"><b>ATELIER 추적 종목 기준</b><span>개별 종목 수집률 80% 이상일 때만 바스켓 성과 표시</span></div>
 <div class="r2-table-scroll"><table class="r2-table"><thead><tr><th>산업 바스켓</th><th>동일가중 수익률</th><th>${esc(state.benchmark)} 대비</th><th>기준 상회 기업</th><th>당기 자료 확보</th></tr></thead><tbody>${rows}</tbody></table></div>
 <p class="r2-foot">가격·배당 조정 기준, 같은 거래일 비교. 일부 종목 수집이 늦으면 지수 대리 ETF 성과와 다르게 나타날 수 있습니다. 기준 미달은 빈값으로 표시합니다.</p></div>`;
}
function trialEvents(){
 const assets=clinicalData?.assets||[];
 const upcoming=assets.flatMap(a=>(a.trials||[]).map(t=>({ticker:a.ticker,asset:a.asset,...t})))
 .filter(x=>x.primaryCompletion?.date&&/^\d{4}-\d{2}/.test(x.primaryCompletion.date)&&x.primaryCompletion.date>=new Date().toISOString().slice(0,10))
 .sort((a,b)=>a.primaryCompletion.date.localeCompare(b.primaryCompletion.date)).slice(0,5);
 if(!upcoming.length)return `<div class="r2-empty">확인 가능한 임상 시험의 향후 주요 완료 예정일이 없습니다. 등록되지 않은 일정은 예측하지 않습니다.</div>`;
 return `<div class="r2-trial-events">${upcoming.map(x=>`<div><span>${esc(x.ticker)} · ${esc(x.asset)}</span><a href="${url(x.url)}" target="_blank" rel="noopener noreferrer">임상시험 원문 ↗</a><b>${esc(x.primaryCompletion.date)}</b><small>${x.primaryCompletion.type==='ESTIMATED'?'주요 평가 완료 예상 시점':x.primaryCompletion.type==='ACTUAL'?'등록된 주요 평가 완료 시점':'완료일 구분 미기재'} · ${esc(x.statusKr||x.status)}</small><small>등록번호 ${esc(x.nctId)}</small></div>`).join('')}</div>`;
}
function trialChangesBlock(){
 const changes=clinicalData?.changes||[];
 if(!changes.length)return '';
 return `<div class="r2-trial-changes"><div class="r2-breadth-title"><b>이전 수집 대비 임상 등록 정보 변경</b><span>${changes.length}건 · 원문 확인 필요</span></div>
 ${changes.slice(0,6).map(c=>`<div class="r2-trial-change"><b>${esc(c.ticker)} · ${esc(c.asset)}</b><span>${esc(c.type)}</span><a href="${url(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.nctId)} ↗</a>
 <small>${c.before!=null?esc(c.before)+' → '+esc(c.after||''):esc(c.detail||'등록자료 변경·검증 필요')}</small></div>`).join('')}
 <p class="r2-foot">새로 포착된 시험은 과거 표본에 없었다는 뜻이며 신규 임상 착수·유효성 입증을 의미하지 않습니다.</p></div>`;
}
function clinicalDigest(){
 const entries=clinicalData?.weeklyInterpretation||[];
 if(!entries.length)return `<div class="r2-empty">이번 주 등록시험 해석 자료를 준비 중입니다. 시험 검색 원문은 기업별 화면에서 확인할 수 있습니다.</div>`;
 return `<div class="r2-clinical-digest">${entries.slice(0,4).map(x=>`<article class="r2-clinical-insight">
 <div class="r2-clinical-insight-meta"><span>${esc(x.type)}</span>${x.url?`<a href="${url(x.url)}" target="_blank" rel="noopener noreferrer">시험 등록정보 확인 ↗</a>`:''}</div>
 <h4>${esc(x.title)}</h4><p>${esc(x.observation)}</p>
 ${x.explain?`<p class="r2-clinical-explain">${esc(x.explain)}</p>`:''}
 <p><b>다음에 확인할 것</b> · ${esc(x.investmentCheck)}</p>
 <small>${esc(x.limitation)}</small>
 ${x.nctId?`<small>시험 등록번호: ${esc(x.nctId)} · 원문 추적용 번호</small>`:''}
 </article>`).join('')}</div>`;
}

function clinicalPanel(){
 return `<section class="r2-panel"><div class="r2-panel-head"><div><h3>바이오 치료제 개발·시험 일정</h3><p>어떤 질환에 대한 연구인지와 다음에 확인할 결과를 먼저 설명합니다. 자세한 시험 등록번호는 원문 링크에 표시합니다.</p></div><span class="r2-asof">${esc(clinicalData?.generatedAt?.slice(0,10)||'미수집')}</span></div>
 ${clinicalDigest()}
 <details class="r2-clinical-raw"><summary>등록시험 변경 내역·일정 원자료 펼치기</summary>${trialChangesBlock()}${trialEvents()}</details>
 <p class="r2-foot">등록 시험 ${Number(clinicalData?.verifiedTrialCards)||0}건(상위 표본) · 임상 데이터 상태 ${esc(clinicalData?.status||'조회 전')} · 원문 상태·후원기관 대조, 적응증별 데이터는 계속 보완 중</p></section>`;
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
 <div class="r2-index-strip">${allowedBenchmarks.map(sym=>`<div><small>${sym} ${sym==='SPY'?'· 미국 대형주':sym==='QQQ'?'· Nasdaq-100':'· 정보기술'}</small><strong>${signed(priceReturn(sym))}</strong></div>`).join('')}</div>
 <div class="r2-table-scroll"><table class="r2-table"><thead><tr><th>관찰 산업</th><th>ETF 수익률</th><th>${esc(state.benchmark)} 대비</th><th>최근 4주 XLK 상회</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
 ${stockBreadthPanel()}
 ${marketBanner()}
 <p class="r2-foot">SPY=S&P 500 대형주 · QQQ=Nasdaq-100 성장주 대리 · XLK=정보기술 업종 · XBI/XLY/XRT=업종 대리 ETF. '상회 4주'는 4개의 주간 구간 중 기술주 대비 강세인 주의 수이며 ETF 자금 유입을 뜻하지 않음.</p>
 </section>`;
}
function diseaseMap(){
 const cats=['비만·대사','항암','면역·염증','신경계','희귀·유전','백신·감염'];
 const bios=companies().filter(x=>x.sector==='바이오·제약');
 return `<section class="r2-panel"><div class="r2-panel-head"><div><h3>바이오 내부의 관심 분야</h3><p>질환별로 교차 분류한 추적 기업 수. 같은 회사가 여러 분야에 포함될 수 있습니다.</p></div></div>
 <div class="r2-disease-map">${cats.map(x=>{const matches=bios.filter(c=>c.disease===x||c.secondaryDiseases?.includes(x));return `<button data-r2="diseaseJump" data-val="${esc(x)}"><b>${esc(x)}</b><span>${matches.length}개 기업</span><small>기업·치료 기술 살펴보기 →</small></button>`}).join('')}</div>
 <p class="r2-foot">질환별 기업 수는 주가 성과가 아닙니다. 질환별 수익률은 개별 종목의 공식 시장 데이터와 노출도를 검증한 뒤 계산할 예정입니다.</p></section>`;
}
function overview(){
 if(!db)return '<section class="r2-panel"><p class="r2-empty">통합 산업 데이터 로딩 중…</p></section>';
 return `<div class="r2-overview r5-overview">
 ${marketPanel()}
 ${window.ATELIER3?.industryOverview()||''}
 ${window.ATELIER3?.overviewSignals()||''}
 ${window.ATELIER3?.attentionQueue()||''}
 </div>`;
}
function visibleCompanies(){
 const search=state.search.trim().toLowerCase();
 return companies().filter(x=>
 (state.sector==='전체'||x.sector===state.sector)&&
 (state.market==='전체'||x.market===state.market)&&
 (state.sector!=='바이오·제약'||state.disease==='전체'||x.disease===state.disease||x.secondaryDiseases?.includes(state.disease))&&
 (!search||[x.ticker,x.name,x.sector,x.domain,x.disease,x.technology,x.focus,...(x.brands||[])].filter(Boolean).some(y=>String(y).toLowerCase().includes(search)))
 );
}
function pill(text){return `<span class="r2-pill">${esc(text)}</span>`}
function bioFilters(){
 if(state.sector!=='바이오·제약')return '';
 const groups=db?.diseaseGroups||[];
 return `<div class="r2-bio-filter"><div><b>관심 질환</b><div class="r2-filter-wrap">${click(['전체',...groups],state.disease,'disease')}</div></div>
 <small>먼저 질환별로 기업을 선택하세요. 치료 기술은 기업 상세의 질환·파이프라인 화면에만 표시합니다.</small></div>`;
}
function cardsTable(list){
 return `<div class="r2-company-list" role="list" aria-label="기업 목록">${list.slice(0,80).map(x=>`<button role="listitem" class="r2-company-row ${state.selected===x.id?'is-selected':''}" data-r2="company" data-val="${esc(x.id)}"><span class="r2-ticker">${esc(x.ticker)}</span><span class="r2-company-name"><b>${esc(x.name)}</b><small>${esc(x.disease||x.domain||x.sector)}</small></span><span class="r2-market">${esc(x.market)}</span></button>`).join('')}
 ${!list.length?'<div class="r2-empty">조건에 맞는 기업이 없습니다. 필터를 변경해 주세요.</div>':''}</div>`;
}
function detailTabs(company){
 const tabs=['사업 이해','핵심 KPI',...(company.sector==='바이오·제약'?['질환·파이프라인']:[]),'투자 판단'];
 return `<div class="r2-detail-tabs">${tabs.map(t=>`<button data-r2="tab" data-val="${esc(t)}" class="${state.detailTab===t?'is-active':''}">${esc(t)}</button>`).join('')}</div>`;
}
function trialDate(dateStruct){
 if(!dateStruct?.date)return '일정 미기재';
 return esc(dateStruct.date)+(dateStruct.type==='ESTIMATED'?' · 예상':dateStruct.type==='ACTUAL'?' · 실제':' · 날짜 구분 미기재');
}
function drugPanel(company){
 const rows=(pipeline?.records||[]).filter(x=>x.ticker===company.ticker);
 const registry=clinicalData?.assets||[];
 const extracted=registry.filter(x=>x.ticker===company.ticker);
 return `<div class="r2-detail-body"><div class="r2-disease-tags">${pill(company.disease)}${(company.secondaryDiseases||[]).map(pill).join('')}${pill(company.technology)}</div>
 <div class="r2-box-lite"><h4>공식 등록 임상 · ClinicalTrials.gov</h4><p>같은 약물과 후원·협력기관이 모두 확인된 시험만 연결합니다. 시험 단계는 해당 등록시험 기준으로, 기업 전체 파이프라인 개발 단계나 허가 상태를 뜻하지 않습니다.</p><small>수집 ${esc(clinicalData?.generatedAt?.slice(0,10)||'미실행')} · 상태 ${esc(clinicalData?.status||'연결 전')}</small></div>
 ${rows.length?`<div class="r2-asset-list">${rows.map(r=>{
  const item=extracted.find(x=>x.asset===r.asset);
  const trials=item?.trials||[];
  return `<div class="r2-asset-card"><div class="r2-asset-head"><b>${esc(r.asset)}</b>${pill(r.modality)}<a href="${url(r.link)}" target="_blank" rel="noopener noreferrer">전체 검색 ↗</a></div>
  ${trials.length?`<div class="r2-trial-grid">${trials.map(t=>`<div class="r2-trial-row">
    <div><a href="${url(t.url)}" target="_blank" rel="noopener noreferrer"><strong>시험 상세 ↗</strong></a> ${pill((t.phases||[]).map(z=>({'PHASE3':'3상','PHASE2':'2상','PHASE1':'1상','PHASE4':'4상'}[z]||z)).join('·')||'단계 미기재')} ${pill(t.statusKr||t.status||'상태 미기재')}</div>
    <p>${esc(t.title)}</p>
    <small>등록 기관: ${esc(t.sponsor||'확인 필요')} · 원문 식별번호 ${esc(t.nctId)}</small>
    <small>주요 완료: ${trialDate(t.primaryCompletion)} · 결과 등록 ${t.hasResultsPosted?'있음':'확인 안 됨'}</small>
    ${t.primaryMeasure?`<small>주요 평가변수: ${esc(t.primaryMeasure)}</small>`:''}
    </div>`).join('')}</div>`:
   `<p class="r2-empty">${clinicalData?.status==='unavailable'||!clinicalData?.status||clinicalData?.status==='not_collected'?'공식 API 자료 연결 대기':'검색 범위에서 약물·기관이 함께 확인된 시험 없음. 부재·실패를 의미하지 않음'}</p>`}
  <p class="r2-foot">${esc(r.check)} · 이 자료만으로 효능·승인 여부를 판단하지 않음</p></div>`;
 }).join('')}</div>`:'<p class="r2-empty">약물 관찰 후보 등록 전입니다. 등록시험 검색은 아래 공식 링크를 이용해 주세요.</p>'}
 <div class="r2-check"><b>질환별 체크</b><span>${esc(company.focus)}</span><small>시험의 주요 완료일은 결과 발표일과 다르고, 경쟁 약물의 치료효과를 일률적으로 비교할 수 없습니다.</small></div></div>`;
}
function detailBody(company){
 if(state.detailTab==='핵심 KPI'&&company.sector==='소비재·서비스')return `<div class="r2-detail-body">${window.ATELIER_CONSUMER?.card(company)||'<p class="r2-empty">공식 실적 수집 상태 확인 중</p>'}${window.ATELIER3?.secComparison(company.ticker)||''}<div class="r2-kpi-checklist"><h4>다음 분기 확인할 항목</h4><div class="r2-kpi-list">${(company.kpis||[]).map(x=>`<span>${esc(x)}</span>`).join('')}</div></div></div>`;
 if(state.detailTab==='핵심 KPI')return `<div class="r2-detail-body">${window.ATELIER3?.secComparison(company.ticker)||''}<h4>업종별 핵심 지표</h4><p class="r2-muted">아래는 앞으로 점검할 지표 목록이며 최신 실적 수치를 의미하지 않습니다.</p><div class="r2-kpi-grid">${(company.kpis||[]).map((k,i)=>`<div class="r2-kpi"><span>${i+1<10?'0'+(i+1):i+1}</span><b>${esc(k)}</b><small>공식 자료 대조 대기</small></div>`).join('')}</div>
 <p class="r2-muted">서로 다른 회사의 사업·회계기간·조정 지표를 혼합해 비교하지 않습니다.</p></div>`;
 if(state.detailTab==='질환·파이프라인')return drugPanel(company);
 if(state.detailTab==='투자 판단'&&window.ATELIER3)return `<div class="r2-detail-body r5-decision">${window.ATELIER3.companyDecision(company)}</div>`;
 if(state.detailTab==='투자 판단')return `<div class="r2-detail-body"><div class="r2-check"><b>투자 검증 질문</b><span>${esc(company.focus)}</span></div><div class="r2-check"><b>가설을 훼손할 조건</b><span>${esc(company.risk)}</span></div><div class="r2-box-lite"><h4>브리프 이력</h4><p>${company.market==='한국'?'과거 담당 기업의 원본 브리프 연결 대기. 공개 저장소에 비공개 브리프 원문을 업로드하지 않습니다.':'현재는 초기 조사 항목. 정식 투자 가설로 채택·수정한 기록은 아직 없습니다.'}</p></div></div>`;
 return `<div class="r2-detail-body r5-business">
 <div class="r2-check"><b>사업·산업 범주</b><span>${esc(company.domain||company.disease||company.sector)}</span></div>
 ${company.sector==='바이오·제약'? `<div class="r2-check"><b>주요 연구 분야</b><span>${esc([company.disease,...(company.secondaryDiseases||[])].filter(Boolean).join(' · '))}</span></div><div class="r2-check"><b>치료 기술</b><span>${esc(company.technology||'기술 확인 대기')}</span></div>` : ''}
 ${company.sector==='패션'&&(company.brands||[]).length? `<div class="r2-check"><b>추적 브랜드</b><span>${(company.brands||[]).map(esc).join(' · ')}</span></div>`:''}
 <div class="r2-box-lite"><h4>기업 이해를 위한 자료 기준</h4><p>사업 분류와 관찰 대상은 리서치 범위이며, 제품별 매출 비중이나 산업 점유율을 뜻하지 않습니다. 공식 실적은 ‘핵심 KPI’, 신약 개발 현황은 ‘질환·파이프라인’, 가설·반증은 ‘투자 판단’에서 각각 확인합니다.</p></div>
 </div>`;
}
function companyDetail(company){
 if(!company)return '<div class="r2-detail r2-empty">기업을 선택해 주세요.</div>';
 const chosen=state.detailTab==='투자 가설'?'투자 판단':
  ((state.detailTab==='질환·파이프라인'&&company.sector!=='바이오·제약')||state.detailTab==='산업·경쟁')?'사업 이해':state.detailTab;
 if(chosen!==state.detailTab)state.detailTab=chosen;
 const isBio=company.sector==='바이오·제약';
 return `<section class="r2-detail">
 <div class="r2-detail-header"><div class="r2-eyebrow">${esc(company.market)} · ${esc(company.sector)}</div>
 <h2>${esc(company.name)} <small>${esc(company.ticker)}</small></h2>
 <p>${state.detailTab==='투자 판단'?'근거와 반증 조건을 대조한 뒤 판단을 직접 기록합니다.':'사업 범주·핵심 실적·투자 판단을 분리해 살펴봅니다.'}</p>
 <div class="r2-disease-tags">${pill(company.domain||company.disease||company.sector)}${isBio?pill(company.technology):''}${company.market==='한국'?pill('기존 담당 기업'):''}</div></div>
 <div class="r2-comparison-mini"><span>지수 비교</span><b>${esc(state.benchmark)} · ${esc(periods.find(x=>x[0]===state.period)?.[1]||'3개월')}</b>
 ${(()=>{const row=stockData?.companies?.[company.ticker],current=company.market==='미국'&&stockData?.asOf&&stockData.asOf===prices?.asOf&&row?.asOf===stockData.asOf;
 const abs=current?row?.returns?.[state.period]:null,delta=current?row?.relative?.[state.benchmark]?.[state.period]:null;
 return Number.isFinite(abs)&&Number.isFinite(delta)?
 `<strong>종목 ${signed(abs)} · 지수 대비 ${signed(delta)}p</strong><small>${esc(row.asOf)} · 배당 조정 · 동일 기간</small>`:
 `<small>${company.market==='한국'?'국내 종목은 환율·원화 비교 체계 구축 전':'동일 기준일 개별 주가 확인 대기'}</small>`})()}</div>
 ${company.sector==='소비재·서비스'?window.ATELIER_CONSUMER?.small(company)||'':''}
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

function theses(){
 if(!db)return '<p class="r2-empty">기업별 투자 가설의 기준 정보를 불러오는 중입니다.</p>';
 if(window.ATELIER3?.thesisWorkspace)return window.ATELIER3.thesisWorkspace(companies());
 const options=['내 담당 기업','바이오·제약','소비재·서비스','패션','전체'];
 const group=state.thesisSector||'내 담당 기업';
 const list=companies().filter(x=>group==='전체'||x.sector===group);
 return `<section class="r2-panel r2-thesis-panel">
 ${window.ATELIER3?.proposals(list,group)||''}
 <div class="r2-panel-head"><div><div class="r2-eyebrow">투자 가설 원장 · 초기 검증 질문</div><h2>기존 논리와 새 근거의 차이를 기록하는 곳</h2><p>현재 표시된 문구는 초기 점검 질문이며 확정된 투자 의견이 아닙니다. 원본 브리프와 최신 실적 검증 후 강화·유지·약화 판정을 기록합니다.</p></div></div>
 <div class="r2-filter-wrap" style="margin:12px 0">${click(options,group,'thesisSector')}</div>
 <div class="r2-thesis-grid">${list.map(c=>`<article class="r2-thesis-row"><div><b>${esc(c.ticker)}</b><small>${esc(c.name)} · ${esc(c.market)}</small></div>
 <p><strong>검증 질문</strong> ${esc(c.focus)}</p><p><strong>반증 조건</strong> ${esc(c.risk)}</p>
 <div><span class="r2-pill">최초 상태 · 분석 대기</span><button class="r2-link" data-r2="openCompany" data-val="${esc(c.id)}">기업 상세 →</button></div>
 </article>`).join('')}</div>
 <p class="r2-foot">가설의 상태는 AI가 임의로 결정하지 않습니다. 국내 담당 기업의 과거 브리프 원문은 비공개 보관 경로를 구축한 뒤 연결합니다.</p></section>`;
}

function weeklyIntro(){
 const sector=state.weeklySector;
 const bio=sector==='바이오·제약';
 const consumer=sector==='소비재·서비스';
 return `<section class="r5-weekly">
 <div class="r5-weekly-head"><div><div class="r2-eyebrow">원문을 확인한 산업별 변화</div><h2>이번 주 투자 리서치</h2><p>이번 주 발생한 사건과 과거 실적·향후 일정을 구분합니다. 자세한 해석은 아래 공식 근거에서 확인하세요.</p></div></div>
 <div class="r2-filter-wrap r5-weekly-filter">${click(sectorOptions,sector,'weeklySector')}</div>
 ${window.ATELIER3?.weekly(sector,false)||'<p class="r2-empty">통합 주간 보고서 연결 대기</p>'}
 ${window.ATELIER3?.reviewQueue(sector)||''}
 ${bio?`<details class="r5-source-detail"><summary>바이오 등록시험 · 질환별 연구 일정·원자료 자세히 보기</summary>
 <div class="r5-source-inner">${clinicalDigest()}<details class="r2-clinical-raw"><summary>공식 등록시험 변경·일정 원자료</summary>${trialChangesBlock()}${trialEvents()}</details></div></details>`:''}
 ${consumer?`<details class="r5-source-detail"><summary>소비재 15개 기업 · 최근 검토 실적·운영 KPI 더 보기</summary><div class="r5-source-inner">${window.ATELIER_CONSUMER?.latest()||'<p>공식 자료 연결 대기</p>'}</div></details>`:''}
 </section>`;
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
 if(kind==='openCompany'){state.selected=val;state.sector='전체';state.market='전체';state.search='';state.disease='전체';state.technology='전체';state.detailTab='사업 이해';if(window.atelierGotoCompanies)window.atelierGotoCompanies();else renderCurrent();return}
 if(kind==='thesisSector'){state.thesisSector=val;renderCurrent();return}
 if(kind==='diseaseJump'){state.disease=val;state.sector='바이오·제약';state.market='전체';state.search='';state.technology='전체';state.selected='';state.legacy=false;if(window.atelierGotoCompanies)window.atelierGotoCompanies();else renderCurrent();return}
 if(kind==='legacy'){if(typeof window.atelierLegacyFashion==='function')window.atelierLegacyFashion();return}
 if(kind==='company'){state.selected=val;if(state.detailTab!=='투자 판단')state.detailTab='사업 이해'}
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
 const all=await Promise.all(['research-universe.json','market-relative.json','research-pipeline.json','clinical-trials.json','stock-relative.json'].map(async name=>{
  try{const r=await fetch('./'+name,{cache:'no-store'});return r.ok?await r.json():null}catch(_){return null}
 }));
 db=all[0]?.companies?.length===52?all[0]:null;
 prices=all[1]||null;pipeline=all[2]||null;clinicalData=all[3]||null;stockData=all[4]||null;
 renderCurrent();
 if(window.ATELIER_CONSUMER?.load)window.ATELIER_CONSUMER.load();
 if(window.ATELIER3?.load)window.ATELIER3.load();
}
window.ATELIER2={load,overview,companyPage,theses,weeklyIntro,weeklyFashionEnabled,state,get loaded(){return !!db},get data(){return db},get prices(){return prices},get clinical(){return clinicalData},get stocks(){return stockData}};
})();