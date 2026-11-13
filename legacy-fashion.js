/* ATELIER legacy fashion module + sector overlay */
(()=>{
'use strict';
const D=window.FASHION_DATA||{meta:{},peers:[],lyst:[],observations:[],research:{theses:[],trends:[],calendar:[]},feed:[],filings:[]};
const TREND_SIGNALS=[{"date":"2026-10-28","source":"Lyst 2026년 3분기","type":"플랫폼 집계","level":"공식 집계","title":"장식·개성 있는 제품 수요와 클래식의 공존","observation":"Dries Van Noten 신규 16위, Diesel 재진입, Free People 블루머 팬츠 인기 상품 7위. 정체성이 강한 상품의 관심이 부각.","impact":"URBN의 Free People 성장, TPR·CPRI의 신제품 전략과 연결해 검증","check":"Free People 동일매장매출·정가 판매율 / Kate Spade·Michael Kors 신상품 반응","url":"https://www.lyst.com/the-lyst-index/Q3-26/","tickers":"URBN · TPR · CPRI"},{"date":"2026-10-28","source":"Lyst 2026년 3분기","type":"플랫폼 집계","level":"공식 집계","title":"운동화·데님 헤리티지의 개별 상품 강세","observation":"Vans Premium Authentic 인기 상품 4위, Diesel 인기 브랜드 재진입, Khaite 신규 20위. 전체 캐주얼 시장 확대를 뜻하지는 않음.","impact":"VFC는 Vans 전체 매출 역성장과 상품 관심도의 괴리를, LEVI는 신제품·여성복 판매를 확인","check":"Vans 브랜드 성장률 / Levi’s 미국 직영판매·여성복 성장","url":"https://www.lyst.com/the-lyst-index/Q3-26/","tickers":"VFC · LEVI · GAP"},{"date":"2026-10-28","source":"Lyst 2026년 3분기","type":"플랫폼 집계","level":"공식 집계","title":"브랜드 인기와 실적은 별개","observation":"Ralph Lauren 인기 브랜드 8위(전분기 대비 1계단 하락), Coach 12위(3계단 하락). 관심 순위 하락이 매출 감소를 뜻하지는 않음.","impact":"RL·TPR은 Lyst 순위보다 실제 판매단가·판매량·마진의 개선 여부가 중요","check":"RL 평균 판매단가·아시아 성장 / Coach 매출 성장·핸드백 단가","url":"https://www.lyst.com/the-lyst-index/Q3-26/","tickers":"RL · TPR"},{"date":"2026-10-21","source":"Kyra 패션 크리에이터 데이터 · 2026년 3분기","type":"소셜 플랫폼 표본","level":"정량 표본","title":"TikTok·Instagram의 착장 콘텐츠 반응이 상대적으로 강함","observation":"영미권 패션 창작자 표본에서 TikTok 착장·핏 확인 게시물 참여율 중위값 9.8%, Instagram 중고 패션 3.5%·착장 3.4%. 플랫폼별 기준이 달라 직접 비교 불가.","impact":"실제 착장 영상·중고 의류 관심을 LEVI·GAP·URBN의 제품 반응 검토에 활용하되 매출 증거로 보지 않음","check":"반복 업로드·광고 표기·개별 제품 댓글의 정가 구매 의사 / 기업 공시 매출","url":"https://www.kyra.com/benchmarks/fashion","tickers":"LEVI · GAP · URBN"},{"date":"2026-10-16","source":"Reddit r/malefashionadvice","type":"커뮤니티 단일 토론","level":"정성 표본","title":"여유 있는 실루엣·기능성 소재 선호 논쟁","observation":"넓은 바지와 여유로운 어깨선이 보편화됐다는 주장에 동의·반론이 모두 존재. 특정 커뮤니티의 비대표 표본.","impact":"제품 핏 변화가 LEVI·ANF·GAP의 구매 전환·반품률에 미치는지 추적","check":"기업별 데님 신제품·재구매·재고 / 반복 관찰 여부","url":"https://www.reddit.com/r/malefashionadvice/comments/1x761p7/the_silhouette_shift_is_complete/","tickers":"LEVI · ANF · GAP"},{"date":"2026-10-05","source":"Reddit r/malefashionadvice","type":"커뮤니티 단일 토론","level":"정성 표본","title":"데님 품질·소재에 대한 개별 소비자 불만","observation":"Levi’s 데님 품질과 폴리에스터 혼방을 비판하는 글에 다양한 반응. 소비자 전체의 품질 평가나 판매 추세로 일반화 불가.","impact":"LEVI의 프리미엄 제품 확대가 가격 저항·재구매로 이어지는지 확인할 반증 자료","check":"프리미엄 제품 리뷰 반복성 / 정가 판매·마진·반품 지표","url":"https://www.reddit.com/r/malefashionadvice/comments/1wy4yj4/jeans_suggestions_for_a_guy_who_wants_to_look/","tickers":"LEVI"},{"date":"2026-09-28","source":"Vogue 가을·겨울 2026","type":"패션 전문매체","level":"편집자 해석","title":"미니멀과 표현적 디자인의 조합","observation":"Vogue는 절제된 실루엣과 풍부한 질감·과장된 형태가 공존하는 가을·겨울 디자인 변화에 주목.","impact":"RL·URBN·TPR 등에서 유행의 상품화가 매출·마진으로 연결되는지 추적","check":"시즌 상품 판매율 / 할인율 / 재고","url":"https://www.vogue.com/article/fall-winter-2026-fashion-trends","tickers":"RL · URBN · TPR"}];
const WATCH_CHANNELS=[{"name":"Lyst 분기 인기 지수","media":"패션 플랫폼","status":"공개 공식 보고서","focus":"실제 관심·검색·판매 행동의 분기별 변화","url":"https://www.lyst.com/the-lyst-index/Q3-26/"},{"name":"Vogue Runway","media":"패션 매체·Instagram","status":"콘텐츠 수동 검토","focus":"런웨이·신상품 실루엣·소재 해석","url":"https://www.instagram.com/voguerunway/"},{"name":"Fashion Roadman","media":"YouTube","status":"공식 영상 수집 시도 · 상태 확인","focus":"패션위크·디자이너·컬렉션 비평","url":"https://www.youtube.com/@FashionRoadman"},{"name":"HauteLeMode","media":"YouTube","status":"공식 영상 수집 시도 · 상태 확인","focus":"런웨이·레드카펫 문화와 비평","url":"https://www.youtube.com/@hautelemode"},{"name":"Tim Dessaint","media":"YouTube","status":"공식 영상 수집 시도 · 상태 확인","focus":"남성복 실루엣·스타일링","url":"https://www.youtube.com/@timdessaint"},{"name":"Reddit / 패션 의견","media":"Reddit","status":"원문별 교차 검증","focus":"핏·품질·정가 구매·재구매 불만","url":"https://www.reddit.com/r/malefashionadvice/"},{"name":"TikTok 패션 게시물","media":"TikTok","status":"공개 검색·수동 검토","focus":"반복 노출되는 스타일·상품·브랜드","url":"https://www.tiktok.com/search?q=fall%20fashion%202026"},{"name":"Instagram 패션 계정","media":"Instagram","status":"공개 계정·수동 검토","focus":"크리에이터 착장·댓글과 협찬 표시","url":"https://www.instagram.com/voguerunway/"}];
const WEEKLY_BRIEF={"edited":"2026-11-04","period":"2026.10.29–11.04","focus":[{"kind":"최근 공식 집계","text":"Lyst 3Q26: Dries Van Noten 16위 신규 진입·Diesel 재진입, Free People 팬츠 7위. 개성 있는 제품에 대한 관심 확인","source":"Lyst · 10/28","url":"https://www.lyst.com/the-lyst-index/Q3-26/"},{"kind":"브랜드 관심 추이","text":"Ralph Lauren 8위(-1), Coach 12위(-3). 관심도 하락이 실적 부진을 의미하지 않아 11/05 실적에서 검증 필요","source":"Lyst · 10/28","url":"https://www.lyst.com/the-lyst-index/Q3-26/"},{"kind":"소비자 정성 신호","text":"Reddit에서 여유로운 핏과 데님 품질에 대한 의견 혼재. 표본 제한으로 유행 확정 대신 LEVI·GAP 검증 질문으로 활용","source":"Reddit · 10/05·10/16","url":"https://www.reddit.com/r/malefashionadvice/comments/1x761p7/the_silhouette_shift_is_complete/"}],"companies":[{"ticker":"RL","name":"Ralph Lauren","brief":"평균 판매단가·아시아 성장 유지 여부","event":"11/05 실적 예정","attention":"정가 판매 / 성장률"},{"ticker":"TPR","name":"Tapestry","brief":"Coach 성장·Kate Spade 적자 축소 여부","event":"11/05 실적 예정","attention":"브랜드별 매출 / 마진"},{"ticker":"GAP","name":"Gap","brief":"Old Navy 부진·Athleta 반등 가능성","event":"11/19 실적 예정","attention":"동일매장매출 / 할인율"},{"ticker":"URBN","name":"Urban Outfitters","brief":"Free People 성장·Nuuly 수익성 검증","event":"11/24 실적 예정","attention":"동일매장매출 / 구독 마진"}],"limitations":"트렌드: 10/28 공개된 3분기 Lyst·기존 전문매체·개별 커뮤니티 글. 기업 현황: 11/03 저장된 실적 요약 및 예정 일정. 새로운 주간 변동률로 해석하지 마세요."};
let externalFeed=[],externalUpdatedAt=null,externalErrors=[],externalDigest=null,externalHealth=[],externalPeriod=null;
let officialData=null,consumerData=null,weeklyInvestment=null,contentBrief=null;
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL=s=>{try{let u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:'#'}catch{return '#'}};
const f=(v,d=1)=>typeof v==='number'?v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const pct=v=>typeof v==='number'?`${v>0?'+':''}${f(v,1)}%`:'—';
const money=v=>typeof v==='number'?`$${f(v,2)}`:'—';
const readableCheck=x=>String(x||'').replace(/DTC comps/g,'직접판매 동일매장매출').replace(/FP comps/g,'Free People 동일매장매출').replace(/comps/g,'동일매장매출').replace(/FY27 EPS/g,'2027회계연도 EPS');
 const polarity=v=>typeof v==='number'?(v>0?'positive':v<0?'negative':'neutral'):'neutral';
const rpos=p=>Math.max(0,Math.min(100,(p.price-p.low52)/(p.high52-p.low52)*100||0));
const peers=D.peers||[];
const groups=['전체',...new Set(peers.map(p=>p.group))];
const pages={overview:'전체 현황',insights:'주간 리서치',companies:'기업 분석',hub:'자료실'};
let notes=[];try{notes=JSON.parse(localStorage.getItem('atelierNotes')||'[]')||[]}catch{notes=[]}
let state={r2LegacyFashion:false,page:'overview',selected:'TPR',group:'전체',brandGroup:'전체',search:'',brandSearch:'',sortKey:'ticker',sortDir:1,notesPlatform:'전체',notesTicker:'전체',notesTone:'전체',notesStatus:'전체',notesQuery:'',notesBrand:'전체',notesOrder:'recent',newsTicker:'전체',trendTab:'lyst',hubTab:'calendar',companyTab:'peers',insightTab:'trends',brandLimit:12,advancedOpen:false,thesisTicker:'전체',socialTicker:'전체',socialPlatform:'전체',socialQuery:'',socialLimit:25,evidenceTab:'incoming'};
let toastTimer;
function notify(msg){let e=$('#toast');e.textContent=msg;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),3100)}
const badge=(t,c='')=>`<span class="pill ${c}">${esc(t)}</span>`;
const tone=c=>c==='성장 확인'?'pos':c==='주의'?'neg':c==='실적 발표 대기'?'gold':'';
function start(){
 // Previous 2026-11-03 value describes legacy fashion prices only, not all sources.
 // The source-audit view replaces these placeholders after data-health.json loads.
 $('#top-datum').textContent='최신 자료 점검 확인 중 · 시세는 출처별 기준일';
 $('#status-short').textContent='시세 출처별 확인 중';
 $('#snapshot-short').textContent='기존 패션 시세 '+(D.meta?.snapshotDate||'기준일 미확인').slice(0,10);
 // A copied company URL opens the exact analysis panel on a fresh page load.
 const params=typeof URLSearchParams!=="undefined"&&window.location?.search?
  new URLSearchParams(window.location.search):null;
 const companyId=params?.get("company")||"";
 const requestedTab=params?.get("tab")||"사업 이해";
 if(/^(US|KR):[A-Za-z0-9._-]{1,32}$/.test(companyId)){
  const detail=window.ATELIER2?.state;
  if(detail){
   detail.selected=companyId;detail.sector="전체";detail.market="전체";
   detail.disease="전체";detail.search="";
   detail.detailTab=["사업 이해","실적·이슈","파이프라인","나의 메모"].includes(requestedTab)?requestedTab:"사업 이해";
   state.page="companies";
   primePageData("companies");
  }
 }
 render();window.ATELIER2?.load();window.ATELIER3?.load();window.ATELIER_HEALTH?.load();
}
function head(eyebrow,title,description,side=''){return `<div class="section-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><div class="lead">${description}</div></div>${side?`<div class="small-meta">${side}</div>`:''}</div>`}
function section(title,action=''){return `<div class="section-separator"><h2>${title}</h2>${action}</div>`}
function buttons(){return `<button class="btn btn-small" data-action="note">+ 관찰 메모</button>`}
function noteCount(t){return notes.filter(n=>n.ticker===t).length}
function focusCard(p){return `<article class="card focus-card" data-action="select" data-ticker="${p.ticker}" tabindex="0" role="button" aria-label="${esc(p.name)} 상세 분석"><div class="focus-head"><div class="ticker">${p.ticker} <span class="company-subname">${esc(p.name)}</span></div>${badge(p.stage,tone(p.stage))}</div><div class="focus-price" style="margin-top:12px">${money(p.price)} <span class="focus-per">PER ${f(p.per,1)}배</span></div><div class="metric-row" style="margin-top:6px"><span class="small subtle">최근 3개월</span><strong class="${polarity(p.r3m)}">${pct(p.r3m)}</strong></div><div class="line" style="margin:13px 0 10px"></div><div class="focus-bottom"><b>다음 확인</b> · ${esc(readableCheck(p.check))}</div></article>`}
 function shortPeerTable(items){return `<div class="table-wrap"><table class="peer-table" style="min-width:740px"><thead><tr><th>기업</th><th>현재가</th><th>1개월</th><th>3개월</th><th>연초 대비</th><th>52주 가격 범위 내 위치</th><th>PER / 고정 EPS</th><th>핵심 투자 변수</th></tr></thead><tbody>${items.map(p=>`<tr data-action="select" data-ticker="${p.ticker}"><td class="ticker-cell">${p.ticker}</td><td class="mono">${money(p.price)}</td>${['r1m','r3m','ytd'].map(k=>`<td class="mono ${polarity(p[k])}">${pct(p[k])}</td>`).join('')}<td><div class="range-wrap"><div class="mini-track"><div class="fill" style="width:${rpos(p)}%"></div></div><span class="mono">${f(rpos(p),0)}%</span></div></td><td class="mono">${f(p.per,1)}×</td><td style="white-space:normal;min-width:170px;max-width:290px">${esc(p.check)}</td></tr>`).join('')}</tbody></table></div>`}
function detailPane(t){const p=peers.find(x=>x.ticker===t)||peers[0];if(!p)return'';const th=(D.research.theses||[]).find(x=>x.ticker===p.ticker);return `<aside class="detail-pane"><div class="detail-head"><div><div class="ticker-big">${p.ticker} · 기업 분석</div><h2>${esc(p.name)}</h2><div class="detail-sub">${esc(p.style)} · ${esc(p.group)}</div></div>${badge(p.stage,tone(p.stage))}</div><div class="detail-metric-grid"><div class="detail-metric"><small>종가 / ${esc(p.quoteDate)}</small><b>${money(p.price)}</b></div><div class="detail-metric"><small>PER / 고정 EPS</small><b>${f(p.per,1)}×</b></div><div class="detail-metric"><small>3개월 수익률</small><b class="${polarity(p.r3m)}">${pct(p.r3m)}</b></div><div class="detail-metric"><small>52주 범위</small><b>${f(rpos(p),0)}%</b></div></div>${detailOfficialLine(p.ticker)}<div class="detail-label">기존 분석 실적 흐름 · 저장된 내용</div><p>${esc(p.performance)}</p><div class="detail-label">강점 · 실적을 지지하는 요인</div><p>${esc(p.positive)}</p><div class="detail-label">위험 · 가설이 틀릴 조건</div><p>${esc(p.negative)}</p><div class="detail-label">다음 확인 지표</div><p>${esc(p.check)}</p><div class="detail-label">주요 브랜드</div>${(p.brands||[]).map(b=>`<div class="detail-brand"><div class="metric-row"><strong>${esc(b.name)}</strong>${badge(b.status,tone(b.status))}</div><p>${esc(b.metric)}</p><p style="color:#8eacc0">→ ${esc(b.verification)}</p></div>`).join('')} ${th?`<div class="detail-label">투자 가설</div><p>${esc(th.title)}</p><div class="note-block"><b class="positive">강세 가설</b><p>${esc(th.bull)}</p></div><div class="note-block"><b class="negative">반증 조건</b><p>${esc(th.bear)}</p></div>`:''}<div class="detail-label">다음 일정</div><p>${esc(p.earnings)}</p><div class="line"></div><div class="metric-row"><a class="watch-link" target="_blank" rel="noopener noreferrer" href="https://www.sec.gov/edgar/browse/?CIK=${encodeURIComponent(p.cikHint)}">SEC 공시 열기 ↗</a><button class="btn btn-small" data-action="note" data-ticker="${p.ticker}">+ 메모</button></div><div class="source-note" style="margin-top:12px">가격 데이터: ${p.quoteSource==='user_snapshot'?'사용자 입력값':esc(p.quoteSource)} · ${esc(p.quoteDate)}. 자동 수집과 분석가 판단을 구분해 관리합니다.</div></aside>`}

function officialUsd(v){
 if(typeof v!=='number')return '—';
 return Math.abs(v)>=1e9?'$'+f(v/1e9,2)+'B':Math.abs(v)>=1e6?'$'+f(v/1e6,1)+'M':'$'+f(v,0);
}
function financialSummary(){
 const rows=officialData?.sourceStatus==='configuration_required'?[]:(weeklyInvestment?.companies||[]).slice(0,5);
 return `<section class="card crosscheck-card"><div class="card-top"><div><h2 class="card-title">공시 · 투자 가설 교차 점검</h2><p class="card-desc">확인된 분기 매출과 다음 검증 지표를 분리합니다.</p></div><button class="link-btn" data-page="official">공식 실적 전체 →</button></div>
 ${rows.length?`<div class="crosscheck-list">${rows.map(x=>`<div class="crosscheck-row"><b>${esc(x.ticker)}</b><div><strong>${esc(x.officialText)}</strong><small>${esc(x.officialPeriod||'분기 수치 확인 대기')} · 다음 확인: ${esc(x.nextCheck)}</small></div>${x.officialSource?`<a href="${safeURL(x.officialSource)}" target="_blank" rel="noopener noreferrer">SEC 원문 ↗</a>`:'<span>조회 대기</span>'}</div>`).join('')}</div>`:'<p class="card-desc">SEC 자동 조회 설정이 필요합니다. 자료·일정 → 공식 실적에서 연락처 설정 방법을 확인하세요. 수치는 추정하지 않습니다.</p>'}
 <p class="source-note">GAAP 기준 분기 매출. 기업 간 회계기간과 집계 기준 차이에 주의하세요. 기존 시세·PER은 과거 스냅샷입니다.</p></section>`;
}
function officialPage(){
 const rows=officialData?.sourceStatus==='configuration_required'?[]:(officialData?.companies||[]),checks=weeklyInvestment?.companies||[];
 return `${head('공식 실적','SEC 공시·분기 실적','10-Q 공시의 제출번호와 일치하는 약 3개월 US-GAAP 숫자만 표시합니다. 조정 실적·브랜드 매출은 별도 검증 대상입니다.',officialData?.generatedAt?'조회 '+esc(officialData.generatedAt.slice(0,10)):'SEC 조회 대기')}
 <div class="data-alert">GAAP와 조정 실적, FY/CY, 분기·누적을 섞지 않습니다. SEC 접근이 거절되면 미확인으로 표시합니다. <b>자동 조회 시작:</b> GitHub → Settings → Secrets and variables → Actions에서 <code>SEC_USER_AGENT</code> (식별 이름 및 연락 이메일)를 설정하세요. <a target="_blank" rel="noopener noreferrer" href="https://github.com/DianeJ00/atelier-fashion/settings/secrets/actions">설정 열기 ↗</a></div>
 <div class="table-wrap"><table class="peer-table official-table"><thead><tr><th>기업</th><th>최신 보고서</th><th>확인된 10-Q 분기 매출</th><th>전년 동기</th><th>다음 검증</th><th>SEC 출처</th></tr></thead><tbody>
 ${rows.length?rows.map(x=>{let v=x.quarter?.metrics?.revenue,ok=x.status==='quarter_verified'&&v,l=x.latestReport||{},c=checks.find(z=>z.ticker===x.ticker);return `<tr><td class="ticker-cell">${esc(x.ticker)}<em>${esc(x.companyName||'')}</em></td><td>${esc(l.form||'—')} · ${esc(l.filed||'')}</td><td><b>${ok?officialUsd(v.value):'확인 대기'}</b><div class="source-note">${ok?esc(x.quarter.periodStart+' ~ '+x.quarter.periodEnd):'분기 사실 검증 전'}</div></td><td class="mono">${ok&&typeof v.yoyPercent==='number'?pct(v.yoyPercent):'—'}</td><td>${esc(c?.nextCheck||'공시 원문 대조')}</td><td>${l.url?`<a href="${safeURL(l.url)}" target="_blank" rel="noopener noreferrer">SEC 원문 ↗</a>`:'—'}</td></tr>`}).join(''):'<tr><td colspan="6">SEC_USER_AGENT를 설정한 뒤 수집을 실행하면 공식 공시와 분기 실적을 확인할 수 있습니다.</td></tr>'}
 </tbody></table></div><p class="source-note" style="margin-top:11px">수집 상태: ${esc(officialData?.sourceStatus||'미실행')} · ${esc(officialData?.method||'SEC EDGAR 원본 기준')} · 공시가 없어도 추정치로 대체하지 않습니다.</p>`;
}
function consumerSamplePanel(){
 const d=consumerData||{},rows=d.videos||[],num=rows.reduce((a,x)=>a+(x.sampledTopLevelComments||0),0);
 return `<section class="card consumer-brief"><div class="card-top"><div><h2 class="card-title">공개 영상 댓글 표본</h2><p class="card-desc">공식 YouTube API에서 읽은 댓글의 주제별 언급 건수 (감성 점수 아님)</p></div>${badge(rows.length+'개 영상')}</div>
 ${rows.length?`<div class="comment-list">${rows.slice(0,5).map(x=>`<div class="comment-line"><div><a href="${safeURL(x.videoUrl)}" target="_blank" rel="noopener noreferrer"><b>${esc(x.videoTitle)}</b></a><small>${esc(x.creator||'')} · 공개 댓글 ${x.sampledTopLevelComments||0}건 · ${esc((x.titleMatchedTickers||[]).join('·')||'직접 관련 종목 없음')}</small></div><div>${Object.entries(x.themeCounts||{}).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>badge(k+' '+v)).join('')}</div></div>`).join('')}</div>`:`<p class="card-desc">${d.status==='key_required'?'YouTube API 키 미설정: 실제 댓글을 수집하지 않았습니다. GitHub Actions 비밀 설정에 YOUTUBE_API_KEY를 등록해야 합니다.':d.status==='source_error'?'YouTube 댓글 연결 오류: 원문 확인 필요.':'아직 수집된 공개 댓글 표본이 없습니다.'}</p>`}
 <p class="source-note">표본 ${num}건 · 최신순 최상위 댓글 일부만 집계, 댓글 원문·작성자 미저장 · 긍부정·구매·매출을 대표하지 않습니다.</p></section>`;
}

function weeklyText(){
 const w=contentBrief||{},items=w.items||[],pending=w.pending||[],out=[
  'ATELIER | 패션 투자 주간 브리프', '기간: '+(w.periodStart||'미확인')+' ~ '+(w.periodEnd||'미확인'),
  '생성: '+(w.generatedAt||'미확인'),'원문 내용 확인 없는 제목은 요약 대상에서 제외',''];
 if(items.length){
  out.push('[이번 주 핵심 변화 '+items.length+'건]');
  items.forEach((x,i)=>{
   out.push((i+1)+'. '+x.title+' ('+x.source+' / '+x.date+' / '+x.status+')',
    '관찰: '+x.summary,'투자 연결: '+x.impact,'실적 검증: '+x.kpi,'해석 한계: '+x.risk,
    '원문: '+x.url,'');
  });
 }else out.push('[이번 주 확인된 요약 없음]','본문을 확인하지 못한 자료는 추정하지 않았습니다.','');
 if(weeklyInvestment){
  out.push('[공식 분기 실적 확인 상태 · 기존 저장 시세와 분리]');
  weeklyInvestment.companies.slice(0,8).forEach(x=>out.push('• '+x.ticker+': '+x.officialText+' ('+(x.officialPeriod||'기간 미확인')+') / '+(x.officialSource||'SEC 확인 대기')));
  out.push('');
 }
 out.push('[추가 분석 대기 '+pending.length+'건]',...pending.slice(0,12).map(x=>'• '+x.title+' / '+x.reason+' / '+x.url),'',
   '[주의] AI 요약 초안은 본문으로 교차 확인 전이며, 구체적인 매출·댓글 수치와 가설을 동일한 증거로 취급하지 않습니다.');
 return out.join('\n');
}
function exportWeekly(){const blob=new Blob([weeklyText()],{type:'text/plain;charset=utf-8'});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='ATELIER_주간리서치_'+(externalUpdatedAt?.slice(0,10)||WEEKLY_BRIEF.edited)+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);notify('주간 리서치 요약을 저장했습니다')}
function healthStrip(){return externalHealth.length?`<div class="source-health">${externalHealth.map(x=>`<span class="${x.status==='연결 실패'?'failed':''}">${esc(x.name)} · ${esc(x.status)} · ${Number(x.count)||0}건</span>`).join('')}</div>`:''}

function briefCard(x){
 const qualified=x.status==='원문 대조·편집', date=esc(x.date||'날짜 미상');
 return `<article class="brief-article"><div class="brief-article-top">
 <span class="brief-type">${esc(x.sourceType||'공개 원문')}</span><span class="brief-date">${date}</span><span class="brief-review ${qualified?'reviewed':'draft'}">${esc(x.status||'검증 대기')}</span>
 <span class="brief-tags">${(x.tickers||[]).map(t=>esc(t)).join(' · ')}</span></div>
 <div class="brief-article-title"><h3>${esc(x.title)}</h3><a href="${safeURL(x.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(x.source||'')} 원문 확인">원문 ↗</a></div>
 <p class="brief-observation">${esc(x.summary)}</p>
 <div class="brief-evidence-grid"><div><b>투자 연결</b><p>${esc(x.impact)}</p></div><div><b>실적 검증</b><p>${esc(x.kpi)}</p></div></div>
 <p class="brief-caution"><b>해석 한계</b> · ${esc(x.risk)}</p><div class="brief-origin">${esc(x.source||'공개 자료')} · ${qualified?'원문 대조한 편집본':'AI 요약 초안 · 원문 검토 전'}</div>
 </article>`;
}
function weeklyEvidenceBlock(){
 const items=Array.isArray(contentBrief?.items)?contentBrief.items:[];
 if(!items.length)return '<div class="weekly-evidence-empty">원문 내용을 확인한 이번 주 자료가 없습니다. 기사·영상 제목만으로 보고서를 작성하지 않습니다.</div>';
 return `<div class="brief-articles">${items.slice(0,5).map(briefCard).join('')}</div>`;
}
function detailOfficialLine(ticker){
 const row=(officialData?.companies||[]).find(x=>x.ticker===ticker);
 const q=row?.quarter, rev=q?.metrics?.revenue;
 const good=row?.status==='quarter_verified'&&rev;
 return `<div class="official-inline"><span>공식 실적 · SEC</span>${good?`<b>10-Q 분기 매출 ${officialUsd(rev.value)}</b><small>${esc(q.periodStart)} ~ ${esc(q.periodEnd)} · GAAP</small>`:'<b>분기 실적 자동 확인 대기</b>'}<button class="link-btn" data-page="official">공식 원문 확인 →</button></div>`;
}

function weeklyPanel(){
 const items=contentBrief?.items||[];
 const pending=contentBrief?.pending||[];
 const editorial=items.filter(x=>x.status==='원문 대조·편집').length;
 const aiDraft=items.filter(x=>x.status!=='원문 대조·편집').length;
 const date=contentBrief?.periodStart&&contentBrief?.periodEnd?
    contentBrief.periodStart+' ~ '+contentBrief.periodEnd:'이번 주';
 return `<section class="weekly-panel"><div class="weekly-heading">
 <div><span class="weekly-kicker">패션 투자 리서치 · ${esc(date)}</span><h2>미국 패션 · 이번 주 핵심 변화</h2>
 <p>원문 내용을 확인한 자료만 요약 · 편집 검증 ${editorial}건${aiDraft?' · AI 초안 '+aiDraft+'건':''} · 사실과 투자 해석 구분${contentBrief?.aiStatus==='key_required'?' · 신규 기사 AI 요약은 미연결':''}</p></div>
 <button class="btn btn-small" data-action="exportWeekly">주간 보고서 저장 ↓</button></div>
 ${weeklyEvidenceBlock()}
 <details class="weekly-source-toggle"><summary>분석 대기·원문 보관함 · ${pending.length}건 대기 / 수집 ${socialItems().length}건</summary>
 <div class="brief-source-archive">
 <p>기사의 원문 본문이나 영상 자막을 확보하지 못한 자료는 분석이 끝난 것처럼 표시하지 않습니다. YouTube 영상 제목은 자동으로 내용을 추정하지 않습니다.</p>
 ${contentBrief?.reviewedExtra?.length?`<h3 class="brief-extra-head">원문 대조 완료 · 추가 검토 자료</h3><div class="brief-articles">${contentBrief.reviewedExtra.slice(0,5).map(briefCard).join('')}</div>`:''}
 ${pending.slice(0,8).map(x=>`<div class="brief-pending-row"><span>${esc(x.date||'')}</span><a href="${safeURL(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.title)}</a><small>${esc(x.reason||x.status||'원문 분석 대기')}</small></div>`).join('')}
 <button class="link-btn" data-action="openIncoming">전체 수집 원문 확인 →</button>
 </div></details>
 <p class="weekly-disclaimer">이 보고서는 기업 실적과 패션 수요를 구분한 검증 자료입니다. AI 초안은 교차 확인 전이며, 공식 공시 수치와 기사·댓글의 관찰 수준을 혼합하지 않습니다. 요약 자료의 날짜가 현재 주간 범위를 벗어나면 자동으로 메인에서 제외됩니다.</p>
 </section>`;
}
async function loadResearchFeed(){
 if(location.protocol==='file:')return;
 // Same canonical source access as the unified analyst workspace.
 const result=await window.ATELIER_DATA.many(['research','official','consumerSamples','weeklyInvestment','weeklyContent']);
 const [data,official,consumer,brief,content]=result;
 if(data&&Array.isArray(data.items)){
  externalFeed=data.items.filter(x=>x&&typeof x.title==='string'&&typeof x.url==='string').slice(0,180);
  externalUpdatedAt=typeof data.generatedAt==='string'?data.generatedAt:null;
  externalErrors=Array.isArray(data.errors)?data.errors:[];
  externalDigest=data.weeklyDigest&&typeof data.weeklyDigest==='object'?data.weeklyDigest:null;
  externalHealth=Array.isArray(data.sourceHealth)?data.sourceHealth:[];
  externalPeriod=data.periodStart&&data.periodEnd?data.periodStart+' ~ '+data.periodEnd:null;
 }
 officialData=official&&Array.isArray(official.companies)?official:null;
 consumerData=consumer&&typeof consumer.status==='string'?consumer:null;
 weeklyInvestment=brief&&Array.isArray(brief.companies)?brief:null;
 contentBrief=content&&Array.isArray(content.items)?content:null;
 render();
}
function overview(){
 const report=window.ATELIER3?.report;
 const tracked=window.ATELIER2?.data?.companies?.length;
 const count=report?.items?.length;
 const period=report?.periodEnd||"";
 return '<header class="desk-hero"><div class="desk-overline"><span class="desk-pulse" aria-hidden="true"></span> INVESTMENT RESEARCH</div>'+
  '<div class="desk-hero-body"><h1>리서치 데스크</h1><div class="desk-hero-stats">'+
  '<span><strong>'+esc(tracked??"—")+'</strong> 기업</span>'+
  '<span><strong>'+esc(count??"—")+'</strong> 검증 근거</span>'+
  (period?'<span class="desk-hero-date">'+esc(period)+'</span>':"")+
  '</div></div></header>'+
  (window.ATELIER2?.overview()||"");
}
function legacyOverviewArchive(){
 const focus=['TPR','LEVI','GAP','URBN'].map(t=>peers.find(p=>p.ticker===t)).filter(Boolean);
 const upcoming=(D.research.calendar||[]).filter(e=>e.date>=(D.meta?.snapshotDate||'2026-11-03')).slice(0,4);
 const checked=evidenceAll().filter(n=>['source_checked','kpi_confirmed'].includes(evReview(n))&&isSourceSpecific(n)).length;
 const pending=evidenceAll().filter(n=>!isSourceSpecific(n)||evReview(n)==='needs_review').length;
 const latest=esc(D.meta?.marketDataLastRefresh||D.meta?.snapshotDate||'기준일 미확인');
 return `<details class="legacy-fashion"><summary>기존 미국 패션 대시보드 · 2026-11-03 스냅샷 보기</summary><div>
 ${financialSummary()}
 <div class="overview-stats"><div><b>${peers.length}</b><span>추적 기업</span></div><div><b>${peers.reduce((a,p)=>a+p.brands.length,0)}</b><span>추적 브랜드</span></div><div><b>${(D.research.theses||[]).length}</b><span>투자 가설</span></div><div><b>${evidenceAll().length}</b><span>소비자 근거</span></div></div>
 ${section('집중 관찰 기업',`<button class="link-btn" data-page="companies">전체 기업 비교 →</button>`)}
 <div class="grid cols-4">${focus.map(focusCard).join('')}</div>
 <div class="grid cols-2 overview-lower"><section class="card"><div class="card-top"><h2 class="card-title">예정된 실적 발표</h2><button class="link-btn" data-page="calendar">전체 일정 →</button></div>${upcoming.length?upcoming.map(e=>`<div class="date-row"><div class="date-num">${esc(e.date.slice(5))}</div><div>${badge(e.ticker)}</div><div><b>${esc(e.title)}</b><p class="subtle small">${esc(e.focus)}</p></div></div>`).join(''):'<p class="empty">예정된 일정이 없습니다.</p>'}<p class="source-note" style="margin-top:12px">예정·예상 날짜는 각 기업 IR에서 재확인 필요</p></section>
 <section class="card"><div class="card-top"><h2 class="card-title">소비자 자료 검증 현황</h2><button class="link-btn" data-action="openVerified">근거 살펴보기 →</button></div><div class="review-summary"><div><b>${checked}</b><span>출처 확인</span></div><div><b>${pending}</b><span>추가 확인 필요</span></div><div><b>${socialItems().length}</b><span>자동 수집 원문</span></div></div><p class="card-desc" style="margin-top:13px">소비자 관심이 실적 개선으로 이어지는지 확인합니다. 자동 수집 원문은 검토 전까지 투자 근거로 사용하지 않습니다.</p><button class="btn btn-ghost" style="margin-top:15px" data-page="theses">기업별 투자 판단 확인 →</button></section></div>
 <p class="footer-note">기존 패션 주가·수익률은 ${latest} 기준 저장된 데이터로, 실시간 시세가 아닙니다. 기업별 PER의 EPS 기준이 서로 달라 단순 순위 비교에 주의하세요.</p></div></details>`;
}
 function peersPage(){let filtered=peers.filter(p=>(state.group==='전체'||state.group===p.group)&&`${p.ticker} ${p.name} ${p.style} ${p.brandSummary}`.toLowerCase().includes(state.search.toLowerCase()));filtered.sort((a,b)=>{let x=a[state.sortKey],y=b[state.sortKey];if(typeof x==='number'&&typeof y==='number')return(x-y)*state.sortDir;return String(x||'').localeCompare(String(y||''))*state.sortDir});return `${head('기업 비교','기업별 주가·실적 비교','주가와 핵심 실적을 비교하고, 기업을 선택해 투자 변수와 브랜드 현황을 확인합니다.','시세 기준 · '+(D.meta.marketDataLastRefresh||D.meta.snapshotDate).slice(0,10))}<div class="filters"><input class="search" id="peer-search" placeholder="기업 · 브랜드 검색" value="${esc(state.search)}"/><select class="select" id="peer-group">${groups.map(g=>`<option ${state.group===g?'selected':''}>${esc(g)}</option>`).join('')}</select><span class="grow"></span><button class="btn btn-ghost btn-small" data-action="csv">CSV 저장</button><button class="btn btn-small" data-action="refresh">↻ 화면 다시 불러오기</button></div><div class="detail-layout"><div><div class="data-alert">52주 범위는 가치평가가 아닙니다. <b>PER은 11/03 기준 EPS를 고정한 가격 민감도이며, 회사별 추정기간과 관세 환급 조정 기준이 서로 다르며</b> 직접적인 순위로 사용하지 마세요.</div><div class="table-wrap"><table class="peer-table"><thead><tr>${[['ticker','기업'],['price','현재가'],['r1m','1개월'],['r3m','3개월'],['ytd','연초 대비'],['position','52주 범위'],['per','PER / 고정 EPS']].map(([k,l])=>`<th data-action="sort" data-key="${k}">${l} ${state.sortKey===k?(state.sortDir===-1?'↓':'↑'):''}</th>`).join('')}<th>패션 / 사업</th></tr></thead><tbody>${filtered.map(p=>`<tr data-action="select" data-ticker="${p.ticker}"><td class="ticker-cell">${p.ticker}<em>${esc(p.stage)}</em></td><td class="mono">${money(p.price)}</td>${['r1m','r3m','ytd'].map(k=>`<td class="mono ${polarity(p[k])}">${pct(p[k])}</td>`).join('')}<td><div class="range-wrap"><div class="mini-track"><div class="fill" style="width:${rpos(p)}%"></div></div><span class="mono">${f(rpos(p),0)}%</span></div></td><td class="mono">${f(p.per,1)}×</td><td style="white-space:normal;min-width:120px;max-width:170px">${esc(p.group)}</td></tr>`).join('')}</tbody></table></div><p class="source-note" style="margin-top:11px">52주 최고·최저는 최근 1년 거래 범위, 1개월·3개월·연초 대비는 기간별 가격수익률. 자동 갱신을 연결하면 거래일 기준으로 재계산됩니다. 시세 출처: ${D.meta.priceProvider==='snapshot'?'저장된 데이터':esc(D.meta.priceProvider)}.</p></div>${detailPane(state.selected)}</div>`}
function brandsPage(){let bs=peers.flatMap(p=>p.brands.map(b=>({...b,ticker:p.ticker,group:p.group}))).filter(b=>(state.brandGroup==='전체'||b.group===state.brandGroup)&&`${b.ticker} ${b.name} ${b.positioning}`.toLowerCase().includes(state.brandSearch.toLowerCase()));return `${head('브랜드 분석','브랜드별 실적과 관찰 지표','브랜드별 성장 흐름과 다음 분기에 확인할 지표를 정리했습니다.','검색 결과 ${bs.length}개 브랜드') }<div class="filters"><input class="search" id="brand-search" placeholder="브랜드 · 티커 검색" value="${esc(state.brandSearch)}"/><select class="select" id="brand-group">${groups.map(g=>`<option ${state.brandGroup===g?'selected':''}>${esc(g)}</option>`).join('')}</select><span class="grow"></span>${buttons()}</div><div class="card-grid">${bs.slice(0,state.brandLimit).map(b=>`<article class="card brand-card"><div class="brand-top"><div><div class="eyebrow">${b.ticker} / ${esc(b.group)}</div><div class="brand-name">${esc(b.name)}</div></div>${badge(b.status,tone(b.status))}</div><div class="brand-desc">${esc(b.positioning)}</div><div class="brand-metric">${esc(b.metric)}</div><div class="brand-foot"><b>다음 확인</b> · ${esc(b.verification)}</div><div class="metric-row"><button class="link-btn" data-action="select" data-ticker="${b.ticker}">기업 보기 →</button><button class="link-btn" data-action="note" data-ticker="${b.ticker}" data-brand="${esc(b.name)}">근거 기록 +</button> <button class="link-btn" data-action="brandEvidence" data-ticker="${b.ticker}" data-brand="${esc(b.name)}">기존 근거 →</button></div></article>`).join('')}</div>${bs.length>state.brandLimit?`<div class="load-more"><button class="btn btn-ghost" data-action="moreBrands">브랜드 ${Math.min(12,bs.length-state.brandLimit)}개 더 보기</button></div>`:''}${section('브랜드별 공시 실적 지표',`<span class="source-note">동일매장매출과 매출 성장률은 다른 지표입니다</span>`)}<div class="table-wrap"><table class="peer-table" style="min-width:760px"><thead><tr><th>기업</th><th>브랜드</th><th>기간</th><th>지표</th><th>전년 대비</th><th>출처</th></tr></thead><tbody>${(D.brandKpis||[]).filter(k=>(state.brandGroup==='전체'||peers.find(p=>p.ticker===k.ticker)?.group===state.brandGroup)&&`${k.ticker} ${k.brand}`.toLowerCase().includes(state.brandSearch.toLowerCase())).map(k=>`<tr><td class="ticker-cell">${esc(k.ticker)}</td><td>${esc(k.brand)}</td><td class="mono">${esc(k.period)}</td><td>${esc(k.metric)}</td><td class="mono ${polarity(k.value)}">${pct(k.value)}</td><td><a href="${safeURL(k.source)}" target="_blank" rel="noopener">공식 IR ↗</a></td></tr>`).join('')}</tbody></table></div><p class="source-note" style="margin-top:10px">브랜드 KPI는 분기별 공시 확인 후 수동으로 추가해야 합니다. SEC 신규 공시는 자동 감지되지만 브랜드별 매출·이익 수치 추출은 자동화하지 않습니다.</p>`}
function lystList(){return `<div class="lyst-grid">${(D.lyst||[]).map(b=>`<div class="lyst-entry ${b.peer?'highlight':''}"><span class="rank">${String(b.rank).padStart(2,'0')}</span><span class="lyst-name">${esc(b.name)}</span>${b.peer?`<button class="link-btn micro" data-action="select" data-ticker="${b.peer}">${b.peer}</button>`:''}<span class="lyst-delta">${typeof b.change==='number'?(b.change>0?'↑'+b.change:b.change<0?'↓'+Math.abs(b.change):'–'):esc(b.change)}</span></div>`).join('')}</div>`}

const EVIDENCE_PLATFORMS=['Reddit','YouTube','TikTok','X','Instagram','Lyst','패션 데이터','Runway','News','직접 관찰'];
const EVIDENCE_TOPICS=['디자인·스타일','핏·실루엣','품질·소재','가격·할인','정가 구매·재구매','브랜드 이미지','상품 출시·협업','검색·언급량','매장·온라인 경험','기타'];
const EVIDENCE_KPIS=['미연결','브랜드 매출 성장률','동일매장매출','정가 판매율·할인율','평균 판매단가','매출총이익률','재고 회전·증가율','DTC 방문·전환율','활성 구독자·재구매','브랜드 검색·관심도','기타'];
const evReview=n=>n.reviewStatus||(n.verified==='official'?'source_checked':'needs_review');
const evReviewLabel={needs_review:'원문 확인 필요',in_review:'교차 검증 중',source_checked:'출처 확인',kpi_confirmed:'실적 교차 확인',contradicted:'반증 기록'};
const evConfidence={low:'낮음',medium:'보통',high:'높음'};
const evTone={positive:'긍정',negative:'부정',neutral:'혼재·중립'};
const evSourceLabels={post:'원문 게시물',report:'공식 보고서',search:'검색·모음 페이지',homepage:'홈·커뮤니티',unknown:'링크 수준 미분류'};
const evSourceLevel=n=>n.sourceLevel||(n.verified==='official'?'report':'unknown');
const isSourceSpecific=n=>['post','report'].includes(evSourceLevel(n));
const evidenceAll=()=>[...notes,...(D.observations||[])];
const EVIDENCE_WATCH=[
 {ticker:'GAP',brand:'Old Navy',q:'여성복의 디자인·가격 불만이 실제로 줄어드나?',kpi:'여성 상품 정가 판매·Old Navy 동일매장매출'},
 {ticker:'TPR',brand:'Kate Spade',q:'새 크리에이티브 체제 이후 제품 선호가 회복되나?',kpi:'가방 판매단가·할인율·브랜드 매출 감소폭'},
 {ticker:'CPRI',brand:'Michael Kors',q:'레트로 인기가 정가 구매로 전환되나?',kpi:'신상품 수요·브랜드 매출·매출총이익률'},
 {ticker:'CPRI',brand:'Jimmy Choo',q:'관심도 변화가 실제 제품 판매로 이어지나?',kpi:'브랜드 매출·가격·제품군별 수요'},
 {ticker:'TPR',brand:'Coach',q:'Tabby·Brooklyn 등 인기 상품의 수요가 유지되나?',kpi:'핸드백 판매단가·판매량·브랜드 마진'},
 {ticker:'LEVI',brand:'Levi\'s',q:'로우라이즈·와이드핏 관심이 DTC로 이어지나?',kpi:'미국 DTC 동일매장매출·재고·정가 판매'},
 {ticker:'URBN',brand:'Free People',q:'개성·보헤미안 트렌드가 클래식과 공존하나?',kpi:'FP Group 동일매장매출·할인율'}
];
function evidenceStatusBadge(n){const v=evReview(n);return badge(evReviewLabel[v]||'검증 미분류',v==='kpi_confirmed'?'pos':v==='contradicted'?'neg':v==='source_checked'?'':'gold')}
function evidenceCard(n){
 const user=notes.some(x=>x.id===n.id),specific=isSourceSpecific(n),kpi=n.kpi&&n.kpi!=='미연결',date=esc(n.date||'날짜 없음');
 return `<article class="evidence-card ${n.tone==='positive'?'positive-evidence':n.tone==='negative'?'negative-evidence':'neutral-evidence'}">
 <div class="feed-head">${badge(n.ticker||'미분류')}${badge(n.brand||'브랜드 미지정')}${badge(n.platform||'출처 미지정')}${badge(evTone[n.tone]||'중립',n.tone==='positive'?'pos':n.tone==='negative'?'neg':'')}${evidenceStatusBadge(n)}<span class="grow"></span><span class="evidence-note-muted">${date}</span></div>
 <h3>${esc(n.title||'제목 없음')}</h3>
 <div class="evidence-meta">${badge(n.category||'주제 미분류')}${badge(n.sampleType||'표본 유형 미분류')}${badge('신뢰 '+(evConfidence[n.confidence]||'미평가'))}${!specific?badge('링크 구체성 확인 필요','gold'):badge(evSourceLabels[evSourceLevel(n)]||'원문 링크')}${n.sampleSize?badge('표본 '+n.sampleSize+'건'):''}</div>
 <p class="evidence-detail">${esc(n.detail||'관찰 설명 없음')}</p>
 ${n.quote?`<div class="evidence-quote"><strong>원문에서 확인할 표현</strong> · ${esc(n.quote)}</div>`:''}
 ${kpi||n.thesis||n.nextCheck?`<div class="evidence-kpi">${kpi?`<div><b>연결 KPI</b> · ${esc(n.kpi)} ${n.kpiDirection?`(${esc(n.kpiDirection)})`:''}</div>`:''}${n.thesis?`<div><b>투자 가설</b> · ${esc(n.thesis)}</div>`:''}${n.nextCheck?`<div><b>다음 확인</b> · ${esc(n.nextCheck)}</div>`:''}</div>`:''}
 ${n.caveat?`<p class="evidence-note-muted" style="margin-top:9px"><b>표본 한계</b> · ${esc(n.caveat)}</p>`:!specific?`<p class="evidence-flag" style="margin-top:9px">게시물 단위 원문이나 표본을 먼저 확인하세요. 검색·게시판 링크를 개별 소비자 증언으로 간주하지 않습니다.</p>`:''}
 <div class="evidence-footer"><div class="action-group"><a class="watch-link" href="${safeURL(n.url)}" target="_blank" rel="noopener noreferrer">원문 확인 ↗</a><span class="evidence-note-muted">${user?'개인 입력 · 이 브라우저에 저장':'초기 리서치 스냅샷'}</span></div>${user?`<div class="action-group"><button class="btn btn-ghost btn-small" data-action="editEvidence" data-id="${esc(n.id)}">수정</button><button class="btn btn-ghost btn-small" data-action="deleteEvidence" data-id="${esc(n.id)}">삭제</button></div>`:''}</div></article>`
}
const SOCIAL_CREATOR_ROSTER=[
 ['Fashion Roadman','패션위크·런웨이·럭셔리 브랜드 분석','https://www.youtube.com/@FashionRoadman'],
 ['Tim Dessaint','남성 캐주얼·실루엣·모던 클래식','https://www.youtube.com/@timdessaint'],
 ['Harry Has','남성 패션·제품 리뷰·계절별 트렌드','https://www.youtube.com/results?search_query=Harry+Has+2026+fashion'],
 ['HauteLeMode','패션쇼·런웨이 해석','https://www.youtube.com/@hautelemode'],
 ['Loïc Prigent','런웨이·디자이너·백스테이지','https://www.youtube.com/results?search_query=Loic+Prigent+fashion+week'],
 ['Mina Le','패션 문화·소비 맥락','https://www.youtube.com/results?search_query=Mina+Le+fashion'],
 ['Vogue Runway','컬렉션·패션위크 공식 자료','https://www.vogue.com/fashion-shows'],
 ['Lyst Index','검색·쇼핑 관심 데이터','https://www.lyst.com/the-lyst-index/']
];
const DISCOVERY_LINKS=[
 ['Reddit', 'https://www.reddit.com/search/?q='+encodeURIComponent('"Old Navy" OR "Kate Spade" OR "Levi’s"')+'&sort=new','승인 API 필요 · 직접 검색'],
 ['TikTok','https://www.tiktok.com/search?q='+encodeURIComponent('2026 fashion runway trends'),'공식 연구 접근 제한 · 검색 열기'],
 ['Instagram','https://www.instagram.com/explore/tags/fashionweek/','공개 해시태그 · 로그인 요구 가능'],
 ['X','https://x.com/search?q='+encodeURIComponent('"Kate Spade" OR "Coach bag"')+'&f=live','공식 API 토큰 필요 · 검색 열기'],
 ['YouTube','https://www.youtube.com/results?search_query='+encodeURIComponent('2026 fashion week runway analysis'),'API 연결 전에도 검색 가능'],
 ['Vogue Runway','https://www.vogue.com/fashion-shows','런웨이 공식 보도·리뷰']
];
function socialItems(){const saved=Array.isArray(D.social?.items)?D.social.items:[];const all=[...externalFeed,...saved];return all.filter((x,i)=>all.findIndex(t=>(t.url||t.id)===(x.url||x.id))===i)}
function feedReviewed(x){return contentBrief?.reviewedInInbox?.[x.id]||null;}
function socialFeed(){
 const raw=socialItems();const items=raw.filter(x=>(state.socialTicker==='전체'||x.ticker===state.socialTicker)&&(state.socialPlatform==='전체'||x.platform===state.socialPlatform)&&(`${x.title} ${x.brand} ${x.creator} ${x.ticker}`.toLowerCase().includes(state.socialQuery.toLowerCase()))).sort((a,b)=>Number(!!feedReviewed(b))-Number(!!feedReviewed(a)));
 const st=D.social?.meta?.sourceStatus||{};const last=externalUpdatedAt||D.social?.meta?.lastAttempt;
 return `${head('자동 수집','새로 발견된 게시물·영상','수집된 제목과 링크는 미검증 자료입니다. 원문을 검토한 뒤 소비자 근거로 기록하세요.','수집 항목 '+raw.length+'건')}
 <div class="collection-status"><span class="status-indicator ${last?'':'status-idle'}"></span><div><b>${last?'최근 수집 시도 · '+esc(last.replace('T',' ').slice(0,16))+' UTC':'아직 자동 수집을 실행하지 않았습니다'}</b><p>자료가 없다고 소비자 반응이 없다는 의미는 아닙니다. 자동 수집 연결은 ‘자료·일정 → 연결 상태’에서 확인할 수 있습니다.</p></div><button class="btn btn-ghost btn-small" data-page="settings">연결 상태 →</button></div>
 ${healthStrip()}<div class="filters social-main-filters"><input class="search" id="social-query" placeholder="브랜드·영상 주제 검색" value="${esc(state.socialQuery)}"/><select id="social-ticker" class="select"><option>전체</option><option value="TREND" ${state.socialTicker==='TREND'?'selected':''}>산업 전반</option>${peers.map(p=>`<option ${state.socialTicker===p.ticker?'selected':''}>${p.ticker}</option>`).join('')}</select><select id="social-platform" class="select"><option>전체</option>${['YouTube','Google News'].map(p=>`<option ${state.socialPlatform===p?'selected':''}>${p}</option>`).join('')}</select><span class="social-count-text">${items.length}건</span></div>
 ${items.length?`<div class="social-feed-grid">${items.slice(0,state.socialLimit).map(x=>{const reviewed=feedReviewed(x);return `<article class="social-item ${reviewed?'social-reviewed':''}"><div class="feed-head">${badge(x.platform)} ${badge(x.ticker||'산업 전반')} ${x.brand?badge(x.brand):''}<span class="grow"></span><span class="evidence-note-muted">${esc((x.date||'').slice(0,10))}</span></div>
 <h3>${esc(reviewed?.title||x.title)}</h3><div class="social-byline">${esc(reviewed?.source||x.creator||x.source||'공개 원문')} · ${reviewed?'원문 대조·한국어 요약':'본문 미확인 · 수집 제목'}</div>
 ${reviewed?`<div class="social-summary"><p>${esc(reviewed.summary)}</p><p><b>투자 연결</b> · ${esc(reviewed.impact)}</p><p><b>실적 검증</b> · ${esc(reviewed.kpi)}</p><small>해석 한계 · ${esc(reviewed.risk)}</small></div>`:'<p class="social-unverified">원문 내용 확인 전입니다. 제목만으로 기업 실적·소비 반응을 해석하지 않습니다.</p>'}
 <div class="social-actions"><a href="${safeURL(reviewed?.url||x.url)}" target="_blank" rel="noopener noreferrer" class="watch-link">${reviewed?'확인한 원문':'원문 확인'} ↗</a><button class="btn btn-small" data-action="adoptSignal" data-signal-id="${esc(x.id)}">${reviewed?'관찰 기록하기':'검증 기록하기'} +</button></div></article>`}).join('')}</div>${items.length>state.socialLimit?`<div class="load-more"><button class="btn btn-ghost" data-action="moreSignals">${Math.min(25,items.length-state.socialLimit)}건 더 보기</button></div>`:''}`:`<div class="evidence-empty big-empty"><b>현재 검색 조건에 해당하는 수집 자료가 없습니다.</b><p>${raw.length?'검색 조건을 바꾸거나 필터를 초기화하세요.':'자동 수집 실행 전 상태입니다. 아래 공개 채널에서 직접 원문을 찾을 수 있습니다.'}</p></div>`}
 <details class="research-method"><summary>수집 채널·분석가 참고 링크 펼치기</summary><div class="social-secondary"><div><h3>직접 검색 채널</h3><div class="social-shortcuts">${DISCOVERY_LINKS.map(([name,url,note])=>`<a href="${safeURL(url)}" target="_blank" rel="noopener noreferrer" class="social-shortcut"><b>${esc(name)} ↗</b><small>${esc(note)}</small></a>`).join('')}</div></div><div><h3>참고할 패션 분석가</h3><div class="creator-roster">${SOCIAL_CREATOR_ROSTER.map(([name,desc,url])=>`<a href="${safeURL(url)}" target="_blank" rel="noopener noreferrer"><b>${esc(name)} ↗</b><small>${esc(desc)}</small></a>`).join('')}</div></div></div><p class="source-note">TikTok·Instagram·Reddit 게시물은 공식 접근 허가 없이 자동 수집하지 않습니다. YouTube는 채널 RSS 연결 실패 시 공식 API 키가 필요합니다. 검색 링크는 수집 완료 상태가 아닙니다.</p></details>`;
}
 function evidencePage(){
 const all=evidenceAll();let filtered=all.filter(n=>(state.notesTicker==='전체'||n.ticker===state.notesTicker)&&(state.notesPlatform==='전체'||n.platform===state.notesPlatform)&&(state.notesTone==='전체'||n.tone===state.notesTone)&&(state.notesStatus==='전체'||evReview(n)===state.notesStatus)&&(state.notesBrand==='전체'||n.brand===state.notesBrand)&&(`${n.ticker} ${n.brand} ${n.title} ${n.detail} ${n.category||''} ${n.kpi||''} ${n.thesis||''}`.toLowerCase().includes(state.notesQuery.toLowerCase())));
 filtered.sort((a,b)=>state.notesOrder==='recent'?String(b.date||'').localeCompare(String(a.date||'')):state.notesOrder==='old'?String(a.date||'').localeCompare(String(b.date||'')):String(a.ticker||'').localeCompare(String(b.ticker||''))||String(b.date||'').localeCompare(String(a.date||'')));
 const fullBrands=[...new Set([...all.map(n=>n.brand),...peers.flatMap(p=>(p.brands||[]).map(b=>b.name))].filter(Boolean))].sort();
 const confirmed=all.filter(n=>['source_checked','kpi_confirmed'].includes(evReview(n))&&isSourceSpecific(n)).length;
 const pending=all.filter(n=>!isSourceSpecific(n)||evReview(n)==='needs_review').length;
 const linked=all.filter(n=>n.kpi&&n.kpi!=='미연결').length;
 return `${head('소비자 자료 검증','확인한 근거와 미검증 자료','출처 수준과 실적 연결 여부를 구분합니다. 단일 게시물이나 관심도를 매출 사실로 취급하지 않습니다.')}
 <div class="evidence-actionline"><div class="evidence-compact-stats"><span>전체 <b>${all.length}</b>건</span><span>출처 확인 <b>${confirmed}</b>건</span><span>재확인 필요 <b>${pending}</b>건</span><span>실적 지표 연결 <b>${linked}</b>건</span></div><button class="btn" data-action="note">+ 근거 기록</button></div>
 <div class="filters evidence-filter-row"><input class="search" id="evidence-query" aria-label="근거 검색" placeholder="기업·브랜드·내용 검색" value="${esc(state.notesQuery)}"/><select class="select" id="note-ticker" aria-label="기업 선택"><option>전체</option>${peers.map(p=>`<option ${p.ticker===state.notesTicker?'selected':''}>${p.ticker}</option>`).join('')}</select><select class="select" id="note-status" aria-label="검증 상태"><option value="전체">모든 검증 상태</option>${Object.entries(evReviewLabel).map(([v,t])=>`<option value="${v}" ${v===state.notesStatus?'selected':''}>${t}</option>`).join('')}</select><button class="btn btn-ghost btn-small" data-action="clearEvidence">필터 초기화</button></div>
 <details class="advanced-filters" ${state.advancedOpen?'open':''}><summary>추가 필터 · 정렬</summary><div class="filters" style="padding:12px 0"><select class="select" id="note-brand" aria-label="브랜드 필터"><option>전체</option>${fullBrands.map(b=>`<option ${b===state.notesBrand?'selected':''}>${esc(b)}</option>`).join('')}</select><select class="select" id="note-platform" aria-label="출처"><option>전체</option>${EVIDENCE_PLATFORMS.map(x=>`<option ${x===state.notesPlatform?'selected':''}>${esc(x)}</option>`).join('')}</select><select class="select" id="note-tone" aria-label="소비자 반응 방향"><option value="전체">모든 방향</option>${Object.entries(evTone).map(([v,t])=>`<option value="${v}" ${v===state.notesTone?'selected':''}>${t}</option>`).join('')}</select><select class="select" id="note-order"><option value="recent" ${state.notesOrder==='recent'?'selected':''}>최신순</option><option value="old" ${state.notesOrder==='old'?'selected':''}>오래된순</option><option value="ticker" ${state.notesOrder==='ticker'?'selected':''}>기업순</option></select></div></details>
 <div class="evidence-results-head"><b>검색 결과 ${filtered.length}건</b><div><button class="link-btn" data-action="exportEvidenceCsv">CSV 저장</button><button class="link-btn" data-action="exportNotes">개인 기록 백업</button><button class="link-btn" data-action="importNotes">기록 불러오기</button></div></div>
 <div class="evidence-list evidence-list-focused">${filtered.length?filtered.map(evidenceCard).join(''):`<div class="evidence-empty">해당 조건의 기록이 없습니다. 필터를 초기화하거나 근거를 추가하세요.</div>`}</div>
 <details class="research-method"><summary>근거 검증 원칙 보기</summary><p>개별 게시물·공식 보고서 링크가 없는 자료는 '원문 확인 필요'로 유지합니다. 조회수와 댓글은 브랜드 매출이 아니며, 반복되는 관찰도 정가 판매·재고·동일매장매출 등 공식 수치로 교차 확인해야 합니다. 개인 기록은 이 브라우저에만 저장됩니다.</p></details>`;
}
 function observationCard(n){return `<div class="feed-item"><div class="feed-head">${badge(n.platform)} ${badge(n.ticker)} ${badge(n.tone,n.tone==='positive'?'pos':n.tone==='negative'?'neg':'')}<span class="source-note">${esc(n.date)}</span><span class="source-note">신뢰 ${esc(n.confidence||'미평가')}</span></div><b>${esc(n.title)}</b><p>${esc(n.detail)}</p><div class="metric-row" style="margin-top:6px"><span class="source-note">${esc(n.brand||'')} · ${n.verified==='official'?'공식 자료':'정성 표본 / 검증 필요'}</span><a class="micro" href="${safeURL(n.url)}" target="_blank" rel="noopener noreferrer">자료 / 커뮤니티 ↗</a></div></div>`}
function trendsPage(){
 const signals=TREND_SIGNALS;
 return `${head('패션 트렌드','유행보다, 근거가 있는 상품·소비자 변화','플랫폼 집계·전문 매체·커뮤니티·크리에이터를 구분합니다. 신호를 매출 사실로 단정하지 않습니다.','편집본 2026.11.04 · 자동 수집 별도')}
 <section class="trend-intro"><div><b>무엇을 관찰했나 → 어떤 기업과 연결되나 → 다음 실적에서 무엇을 확인하나</b><p>Lyst 등은 광범위한 플랫폼 지표, Reddit은 개별 의견, 패션 크리에이터는 스타일 해석입니다. 근거 수준에 따라 가중치를 달리합니다.</p></div><button class="btn btn-ghost btn-small" data-action="openIncoming">수집 원문 확인 →</button></section>
  <section class="trend-fresh"><h2>이번 주 확인한 패션·브랜드 변화</h2>
 <p>플랫폼·공식 기업 발표·유통 전문매체의 본문을 요약해 투자 연결까지 정리. 크리에이터 영상은 자막·내용 확보 전까지 분석 완료로 표시하지 않습니다.</p>
 ${contentBrief?.items?.length?`<div class="brief-trend-list">${contentBrief.items.filter(x=>x.kind==='trend'||x.kind==='company').slice(0,3).map(briefCard).join('')}</div>`:'<p class="weekly-evidence-empty">본문 확인된 이번 주 자료가 없습니다. 기존 검토 자료를 아래에서 확인하세요.</p>'}
 <details class="trend-archive"><summary>원문만 수집한 패션 채널·영상 보기 (내용 검증 전)</summary>
 ${healthStrip()}<div class="trend-fresh-list">${socialItems().filter(x=>x.platform==='YouTube'||x.ticker==='TREND').slice(0,8).map(x=>{const review=feedReviewed(x);return `<a href="${safeURL(review?.url||x.url)}" target="_blank" rel="noopener noreferrer">${esc(review?.title||x.title)}${review?`<span class="trend-reviewed-preview">${esc(review.summary)}</span>`:''}<small>${esc(review?.source||x.creator||x.platform)} · ${esc((x.date||'').slice(0,10))} · ${review?'원문 대조':'내용 요약 대기'}</small></a>`}).join('')}</div>
 </details></section>
  ${section('기존 검토 자료 · 편집 기준 2026.11.04')}<div class="trend-signal-list">${signals.map(x=>`<article class="trend-signal"><div class="trend-signal-meta">${badge(x.type,x.type==='커뮤니티 단일 토론'?'gold':'')} ${badge(x.level)} <span>${esc(x.date)} · ${esc(x.source)}</span></div><h2>${esc(x.title)}</h2><p class="signal-observation">${esc(x.observation)}</p><div class="signal-impact"><span><b>투자 연결</b> ${esc(x.impact)}</span><span><b>실적 검증</b> ${esc(x.check)}</span></div><div class="signal-footer"><span>관찰 기업 · ${esc(x.tickers)}</span><a href="${safeURL(x.url)}" target="_blank" rel="noopener noreferrer">원문 보기 ↗</a></div></article>`).join('')}</div>
 <section class="card channel-panel"><div class="card-top"><div><h2 class="card-title">실제로 추적할 채널</h2><p class="card-desc">TikTok·Instagram은 임의 스크래핑 없이 공식 공개 페이지에서 확인. YouTube는 채널 RSS를 시도하며 연결 실패 시 공식 API 키가 필요.</p></div>${badge('수집 상태 구분')}</div><div class="channel-grid">${WATCH_CHANNELS.map(c=>`<a class="channel-row" href="${safeURL(c.url)}" target="_blank" rel="noopener noreferrer"><span class="channel-name">${esc(c.name)} <span aria-hidden="true">↗</span></span><span class="channel-meta">${esc(c.media)} · ${esc(c.status)}</span><span class="channel-desc">${esc(c.focus)}</span></a>`).join('')}</div><p class="source-note" style="margin-top:12px">채널 목록은 정기 관찰 대상이지 해당 채널에서 이번 주 유행을 검증했다는 의미가 아닙니다.</p></section>
 <details class="trend-archive"><summary>Lyst 2026년 3분기 인기 브랜드 20위 펼쳐보기</summary><div class="lyst-grid">${(D.lyst||[]).map(b=>`<div class="lyst-entry"><span class="rank">${b.rank}</span><span class="lyst-name">${esc(b.name)}</span><span class="lyst-delta">${typeof b.change==='number'?(b.change>0?'↑'+b.change:b.change<0?'↓'+Math.abs(b.change):'―'):esc(b.change)}</span></div>`).join('')}</div><p class="source-note" style="margin-top:10px">브랜드의 전체 매출 순위가 아닌 Lyst 플랫폼 지표입니다.</p></details>`;
}
function legacyThesesPage(){
 const items=(D.research.theses||[]).filter(t=>state.thesisTicker==='전체'||state.thesisTicker===t.ticker);
 return `${head('투자 판단','투자 가설과 반증 조건','종목마다 핵심 가설·다음 확인 지표·반증 조건을 한눈에 비교합니다.','저장된 시세 기준 '+esc(D.meta?.snapshotDate||''))}
 <div class="thesis-filter"><label for="thesis-ticker">종목</label><select id="thesis-ticker" class="select"><option>전체</option>${[...new Set((D.research.theses||[]).map(x=>x.ticker))].map(t=>`<option ${state.thesisTicker===t?'selected':''}>${t}</option>`).join('')}</select><span class="source-note">총 ${items.length}개 가설 · 최근 실적에서 재검증 필요</span></div>
 <div class="thesis-dense">${items.map(t=>{const p=peers.find(p=>p.ticker===t.ticker);return `<article class="thesis-row"><div class="thesis-row-head"><div><span class="thesis-ticker">${esc(t.ticker)}</span><span class="thesis-company">${esc(p?.name||'')}</span><span class="thesis-stage">${esc(t.status)}</span></div><button class="link-btn" data-action="select" data-ticker="${esc(t.ticker)}">기업 보기 →</button></div><h2>${esc(t.title)}</h2><div class="thesis-three"><div><b>다음 확인</b><p>${esc(t.test)}</p></div><div><b class="positive">개선 시나리오</b><p>${esc(t.bull)}</p></div><div><b class="negative">반증 조건</b><p>${esc(t.bear)}</p></div></div></article>`}).join('')}</div>
 <p class="source-note thesis-foot">가설은 투자 결론이 아닌 검증 목록입니다. 장기 추세·실적 수치는 기업 공시와 구분합니다.</p>`;
}
function thesesPage(){return companyPage();} // Older bookmarks route to 기업 분석 → 투자 판단.
function feedPage(){const feed=[...externalFeed.filter(x=>x.platform==='Google News').map(e=>({...e,kind:'뉴스·미검증'})),...(D.filings||[]).map(e=>({...e,kind:'SEC'})),...(D.feed||[]).map(e=>({...e,kind:'NEWS'}))].filter(x=>state.newsTicker==='전체'||x.ticker===state.newsTicker).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));return `${head('자료 수집','새로운 공시·뉴스','자동화가 연결되면 SEC 공시와 공개 뉴스 RSS를 수집합니다. 데이터 해석과 투자 판단은 별도로 검증해야 합니다.','수집 항목 ${feed.length}건')}<div class="filters"><select class="select" id="news-ticker"><option>전체</option>${peers.map(p=>`<option ${p.ticker===state.newsTicker?'selected':''}>${p.ticker}</option>`).join('')}</select><span class="grow"></span><button class="btn btn-ghost btn-small" data-page="settings">갱신 방법 보기 →</button></div>${feed.length?`<div class="grid cols-2">${feed.slice(0,100).map(n=>`<div class="feed-item"><div class="feed-head">${badge(n.kind,n.kind==='SEC'?'gold':'')} ${badge(n.ticker||'ALL')} <span class="source-note">${esc(n.date||'')}</span></div><b><a href="${safeURL(n.url)}" target="_blank" rel="noopener noreferrer">${esc(n.title||n.form||'새 정보')} ↗</a></b><p>${esc(n.source||n.description||'원문을 열어 기업 실적·전망을 검증하세요.')}</p></div>`).join('')}</div>`:`<div class="empty"><div style="font-size:24px">☷</div><b>새로 수집한 공시·뉴스가 없습니다.</b><p style="margin-top:8px">초기 로컬 배포 상태입니다. GitHub Actions의 수집 작업를 실행하면 신규 SEC 공시·뉴스 항목이 추가됩니다. API 키가 없어도 뉴스·공시 수집은 시도됩니다.</p><div style="margin-top:13px"><button class="btn" data-page="settings">자동화 설정 보기</button></div></div>`}<div class="footer-note">EDGAR 공시 링크는 공식 자료. 뉴스 RSS는 검색 수집으로 중복·광고·관련성 낮은 결과가 포함될 수 있습니다.</div>`}
function calendarPage(){const entries=[...(D.research.calendar||[])].sort((a,b)=>a.date.localeCompare(b.date));return `${head('실적 일정','다가오는 실적 발표','실적 발표와 가이던스 변경의 체크리스트. 초기 일정은 조사 시점 기준 예정·예상이며 각 회사 IR에서 확정 일정을 확인하세요.','2026.11.04 기준')}<div class="grid cols-2"><div class="card">${entries.map(e=>`<div class="date-row"><div class="date-num">${esc(e.date)}</div><div>${badge(e.ticker)}</div><div><b>${esc(e.title)}</b><p class="subtle micro">${esc(e.focus)}</p><span class="micro warn">${esc(e.kind)} · 변경 가능</span></div></div>`).join('')}</div><div class="stack"><div class="card"><h3 class="card-title">실적 발표를 볼 때의 순서</h3><ol class="list-plain"><li>브랜드별 매출과 동일매장매출을 먼저 확인</li><li>일회성 관세 환급을 제외한 마진 계산</li><li>재고·CAPEX·FCF와 주주환원 비교</li><li>FY 가이던스와 컨센서스 상향/하향 확인</li><li>주가에 반영된 기대치 대비 판단 수정</li></ol></div><div class="card"><h3 class="card-title">각 회사 공식 공시 찾기</h3><div class="feature-list">${peers.slice(0,8).map(p=>`<a class="watch-link" href="https://www.sec.gov/edgar/browse/?CIK=${encodeURIComponent(p.cikHint)}" target="_blank" rel="noopener">${p.ticker} 공시 검색 ↗</a>`).join('')}</div></div></div></div>`}
function settingsPage(){const q=D.meta?.priceProvider;const cols=[['시장 데이터',q==='twelvedata'?'Twelve Data 동기화':'저장된 시세 (실시간 아님)','TWELVEDATA_API_KEY 설정 후 거래일 기준 종가·기간 수익률·52주 범위 자동 계산',D.meta?.marketDataLastRefresh],['SEC 공시',officialData?.sourceStatus==='ok'?'SEC GAAP 분기 데이터 수집':officialData?.sourceStatus==='partial'?'일부 기업 조회 실패':'SEC 조회 대기·오류','10-Q 동일 제출번호의 약 3개월 US-GAAP 분기 수치만 확인',officialData?.generatedAt],['공개 뉴스',D.meta?.newsLastRefresh?'수집 완료':'미실행 / 아직 수집 없음','Google News RSS 검색 키워드 기반. 중복/오탐 가능',D.meta?.newsLastRefresh],['소비자 인식',consumerData?.status==='sampled'?'YouTube 댓글 주제 집계':consumerData?.status==='key_required'?'YouTube API 키 미설정':'댓글 표본 연결 점검','최근 영상의 공개 댓글 일부에서 주제별 단어만 집계. 비대표 표본·감성 점수 아님',consumerData?.generatedAt],['원문 내용 자동 요약',contentBrief?.aiStatus==='enabled'?'AI 원문 요약 연결됨':'원문 검증 편집본만 표시','OPENAI_API_KEY를 Repository secrets에 등록하면 공개 기사 본문을 확인한 경우에만 한국어 요약 초안을 생성. API 사용료 별도',contentBrief?.generatedAt]];return `${head('데이터 관리','자료 연결 및 설정','자동 수집의 범위, 데이터 생성일, 분석가 검토 범위를 투명하게 관리합니다. 이 화면에서 배포 시 확인해야 할 설정을 확인하세요.','수집·검증 상태')}<div class="grid cols-2"><div class="card"><div class="card-top"><b class="card-title">데이터 연결 현황</b>${badge(q==='twelvedata'?'API 연결됨':'저장된 데이터','gold')}</div>${cols.map(([n,s,d,v])=>`<div class="setting-row"><div><b>${esc(n)}</b><p>${esc(d)}</p></div><div style="text-align:right;max-width:175px"><span class="pill">${esc(s)}</span><div class="source-note" style="margin-top:5px">${esc(v||'')}</div></div></div>`).join('')}</div><div class="card"><div class="card-top"><b class="card-title">GitHub 연결 절차</b><a class="small" target="_blank" rel="noopener" href="https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site">공식 가이드 ↗</a></div><ol class="list-plain"><li>제공한 <b>GitHub 시작 패키지</b>의 파일과 <code>.github</code> 폴더를 저장소 <code>main</code> 루트에 업로드</li><li><code>Settings → Pages → Source: GitHub Actions</code> 선택</li><li><code>Actions → ATELIER weekly research and site → Run workflow</code>로 최초 수집 실행</li><li>필요 시 <code>Settings → Actions → General</code>에서 워크플로 쓰기 권한 확인</li><li>매주 월요일 오전 9시(한국 시간) YouTube·Google News RSS 제목이 갱신되는지 확인</li></ol><div class="data-alert">공개 RSS의 제목·링크 수집에는 API 키가 필요하지 않습니다. 시세와 브랜드별 실적은 자동 갱신되지 않습니다. SEC GAAP 분기 수치는 별도 자동 조회하며 공개 댓글은 API 키 등록 시만 집계합니다.</div></div></div>${section('개인 연구 기록',`<button class="btn btn-small" data-action="note">+ 노트 추가</button>`)}<div class="card"><p class="card-desc">브라우저에서 추가한 정성 메모는 이 기기의 localStorage에 저장됩니다. GitHub 서버에는 자동 동기화되지 않습니다. 기기 변경 시 JSON으로 내보내고 불러올 수 있습니다.</p><div class="metric-row" style="margin-top:15px"><span class="pill">개인 노트 ${notes.length}건</span><div><button class="btn btn-ghost btn-small" data-action="importNotes">JSON 불러오기</button> <button class="btn btn-small" data-action="exportNotes">JSON 내보내기</button></div></div></div>${section('공식 자료 출처')}<div class="grid cols-3">${Object.entries(D.meta?.sources||{}).map(([n,u])=>`<a class="watch-link" target="_blank" rel="noopener" href="${safeURL(u)}">${esc(n.toUpperCase())} ↗</a>`).join('')}</div><div class="footer-note">가격: 초기 스냅샷은 사용자가 제공한 자료를 재구성한 것으로, API 갱신 전에는 실시간성이 없습니다. 자동 뉴스 수집은 공개 검색자료의 모음이고 소비자 반응을 통계적으로 대표하지 않습니다. 전자공시 수치는 최초 원문을 확인하세요.</div>`}
function personalBackupControls(){
 return '<details class="card" style="margin-bottom:14px"><summary><strong>개인 기록 백업·복원</strong> · 현재 기기에만 저장된 투자 판단과 메모</summary>'+
 '<div style="padding-top:13px"><p class="card-desc">기존 패션 메모와 52개 기업의 개인 투자 판단을 하나의 JSON 파일로 저장합니다. 파일은 서버로 업로드하지 않습니다. 복원하면 현재 두 기록이 교체되므로 먼저 백업하세요.</p>'+
 '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button type="button" class="btn btn-small" data-personal-backup="export">전체 개인 기록 백업</button>'+
 '<button type="button" class="btn btn-ghost btn-small" data-personal-backup="import">전체 기록 복원</button></div>'+
 '<p id="personal-backup-status" role="status" style="margin-top:10px;font-size:12px"></p></div></details>';
}
function hubPage(){const summary=window.ATELIER_HEALTH?.panel()||'';const tabs=[['calendar','실적 일정'],['official','공식 실적·이전 스냅샷'],['feed','공시·뉴스 원문'],['settings','데이터 연결 상태']];return summary+personalBackupControls()+`<div class="hub-tabbar" role="tablist" aria-label="리서치 운영"><span>자료실</span>${tabs.map(([id,label])=>`<button role="tab" aria-selected="${state.hubTab===id}" class="hub-tab ${state.hubTab===id?'active':''}" data-action="hubTab" data-hub-tab="${id}">${label}</button>`).join('')}</div>`+({'feed':feedPage,'calendar':calendarPage,'official':officialPage,'settings':settingsPage}[state.hubTab]||calendarPage)()+(state.hubTab==='official'?legacyOverviewArchive():'')}
function legacyCompanyPage(){
 const tabs=[['peers','기업 비교'],['brands','브랜드별 분석']];
 return `<div class="section-tabs" role="tablist" aria-label="기업·브랜드 메뉴">${tabs.map(([id,label])=>`<button role="tab" aria-selected="${state.companyTab===id}" class="section-tab ${state.companyTab===id?'active':''}" data-action="companyTab" data-company-tab="${id}">${label}</button>`).join('')}</div>` + (state.companyTab==='brands'?brandsPage():peersPage());
}
function companyPage(){
 if(state.r2LegacyFashion)return '<div class="r2-panel" style="margin-bottom:12px"><button class="r2-link" data-action="r2GoUnified">← 통합 기업 분석으로 돌아가기</button></div>'+legacyCompanyPage();
 return window.ATELIER2?.companyPage()||legacyCompanyPage();
}
function insightsPage(){
 if(window.ATELIER2&&!window.ATELIER2.weeklyFashionEnabled())return window.ATELIER2.weeklyIntro();
 const tabs=[['trends','시장 트렌드'],['incoming','새로 수집한 자료 ('+socialItems().length+')'],['verified','소비자 근거 ('+evidenceAll().length+')']];
 return `${window.ATELIER2?.weeklyIntro()||''}<div class="section-tabs" role="tablist" aria-label="패션 산업 상세 메뉴">${tabs.map(([id,label])=>`<button role="tab" aria-selected="${state.insightTab===id}" class="section-tab ${state.insightTab===id?'active':''}" data-action="insightTab" data-insight-tab="${id}">${label}</button>`).join('')}</div>` + (state.insightTab==='trends'?trendsPage():state.insightTab==='incoming'?socialFeed():consumerSamplePanel()+evidencePage());
}
function syncQuickSearchOptions(){
 const options=document.getElementById("quick-company-options");
 const universe=window.ATELIER2?.data?.companies||[];
 if(!options||!universe.length||options.childElementCount===universe.length)return;
 options.innerHTML=universe.map(c=>'<option value="'+esc(c.ticker)+'" label="'+esc(c.name)+'"></option>').join('');
}
function render(){document.querySelectorAll('[data-page].nav-item').forEach(b=>{const active=b.dataset.page===state.page;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});$('#page-crumb').textContent=pages[state.page]||'전체 현황';let html=({overview:overview,insights:insightsPage,companies:companyPage,hub:hubPage}[state.page]||overview)();$('#content').innerHTML=html;syncQuickSearchOptions()}
window.atelierRerender=render;
window.atelierGotoWeekly=()=>{nav('insights')};
window.atelierGotoCompanies=()=>{state.r2LegacyFashion=false;nav('companies')};
window.atelierGotoCompanyDecision=(id)=>{const r=window.ATELIER2?.state;if(r){r.sector='전체';r.market='전체';r.disease='전체';r.search='';r.selected=id||r.selected;r.detailTab='나의 메모'}state.r2LegacyFashion=false;nav('companies')};
window.atelierLegacyThesesFor=(ticker)=>(D.research?.theses||[]).filter(x=>x.ticker===ticker);
window.atelierLegacyFashion=()=>{state.r2LegacyFashion=true;state.companyTab='peers';nav('companies')};
// Load source groups only when the requested menu needs them.
let extraRequested=false,detailRequested=false,issuerRequested=false;
function primePageData(page){
 if((page==='insights'||page==='hub')&&!extraRequested){
  extraRequested=true;
  loadResearchFeed().catch(()=>{extraRequested=false});
 }
 if((page==='insights'||page==='companies')&&!detailRequested){
  detailRequested=true;
  Promise.resolve(window.ATELIER2?.loadDetails?.()).catch(()=>{detailRequested=false});
 }
 if(page==='companies'&&!issuerRequested){
  issuerRequested=true;
  Promise.all([
   Promise.resolve(window.ATELIER_CONSUMER?.load?.()),
   Promise.resolve(window.ATELIER_KOREA?.load?.())
  ]).catch(()=>{issuerRequested=false});
 }
}
function nav(page){if(page==='theses'){window.atelierGotoCompanyDecision();return}if(['peers','brands'].includes(page)){state.companyTab=page;page='companies'}if(page==='trends'){state.insightTab='trends';page='insights'}if(page==='evidence'){state.insightTab='verified';page='insights'}if(['feed','calendar','official','settings'].includes(page)){state.hubTab=page;page='hub'}if(!pages[page])return;state.page=page;primePageData(page);document.querySelector('#sidebar')?.classList.remove('open');document.body.classList.remove('menu-open');render();window.scrollTo({top:0,behavior:'smooth'})}
function saveNotes(){try{localStorage.setItem('atelierNotes',JSON.stringify(notes))}catch{notify('저장 공간을 확인해주세요')}}
function exportJson(){const blob=new Blob([JSON.stringify({schema:'atelier-notes-v2',exportedAt:new Date().toISOString(),notes},null,2)],{type:'application/json'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download='atelier-research-notes.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);notify(`${notes.length}건 메모를 저장했습니다`)}
function exportCsv(){const fields=['ticker','name','group','style','brandSummary','performance','price','r1m','r3m','ytd','low52','high52','per','positive','negative','check','quoteDate'];const rows=[fields, ...peers.map(p=>fields.map(k=>p[k]))];const csv='\ufeff'+rows.map(row=>row.map(x=>'"'+String(x??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='atelier-peers-'+(D.meta?.snapshotDate||'snapshot')+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);notify('피어 데이터 CSV 저장 완료')}
function noteModal(ticker='',brand='',id='',prefill=null){
 const old=notes.find(n=>n.id===id)||prefill||{};const chosen=old.ticker||ticker||state.selected;
 const d=(key,def='')=>esc(old[key]??def);
 const opts=(arr,val)=>arr.map(v=>`<option value="${esc(v)}" ${String(v)===String(val)?'selected':''}>${esc(v)}</option>`).join('');
 const today=new Date().toISOString().slice(0,10);
 const allBrands=[...new Set(peers.flatMap(p=>(p.brands||[]).map(b=>b.name)))].sort();
 $('#modal-root').innerHTML=`<div class="modal-overlay"><div class="modal evidence-modal"><button class="close-x" data-action="closeModal" aria-label="창 닫기">✕</button><div class="eyebrow">소비자 근거 · 조사 기록</div><div class="modal-title">${id?'소비자 근거 수정':'소비자 반응 · 브랜드 근거 추가'}</div><form id="note-form" class="form-grid"><input type="hidden" name="noteId" value="${d('id')}">
 <div class="evidence-form-section">1. 어떤 브랜드에서, 언제 발생한 신호인가?</div>
 <div class="grid cols-2 form-compact"><div class="field"><label>기업</label><select required name="ticker"><option value="TREND" ${chosen==='TREND'?'selected':''}>TREND — 산업 전반</option>${peers.map(p=>`<option value="${p.ticker}" ${p.ticker===chosen?'selected':''}>${p.ticker} — ${esc(p.name)}</option>`).join('')}</select></div><div class="field"><label>브랜드·상품군</label><input list="brand-options" name="brand" value="${d('brand',brand)}" placeholder="예: Old Navy / Kate Spade" required/><datalist id="brand-options">${allBrands.map(b=>`<option value="${esc(b)}">`).join('')}</datalist></div></div>
 <div class="grid cols-2 form-compact"><div class="field"><label>자료 출처</label><select name="platform">${opts(EVIDENCE_PLATFORMS,old.platform||'Reddit')}</select></div><div class="field"><label>게시·발표일</label><input type="date" required name="date" value="${d('date',today)}"/></div></div>
 <div class="field"><label>검증할 핵심 주장 (한 줄)</label><input required name="title" maxlength="180" value="${d('title')}" placeholder="예: Kate Spade 새로운 디자인에 관심 증가"/></div>
 <div class="field"><label>원문 URL</label><input required name="url" type="url" value="${d('url')}" placeholder="https://..."/><p>가능하면 검색 페이지가 아닌 <b>개별 게시물·원본 동영상·공식 보고서</b>를 기록하세요.</p></div>
 <div class="grid cols-2 form-compact"><div class="field"><label>원문 구체성</label><select name="sourceLevel">${[['post','개별 게시물·영상'],['report','공식 보고서·데이터'],['search','검색 결과·모음'],['homepage','게시판·홈페이지']].map(([v,t])=>`<option value="${v}" ${v===(old.sourceLevel||'post')?'selected':''}>${t}</option>`).join('')}</select></div><div class="field"><label>관찰 주제</label><select name="category">${opts(EVIDENCE_TOPICS,old.category||'디자인·스타일')}</select></div></div>
 <div class="grid cols-2 form-compact"><div class="field"><label>소비자 반응 방향</label><select name="tone">${[['positive','긍정'],['negative','부정'],['neutral','혼재·중립']].map(([v,t])=>`<option value="${v}" ${v===(old.tone||'neutral')?'selected':''}>${t}</option>`).join('')}</select></div><div class="field"><label>표본 유형</label><select name="sampleType">${opts(['개별 사례','복수 게시물','커뮤니티 토론','정량 플랫폼 데이터','공식 리서치','직접 관찰'],old.sampleType||'개별 사례')}</select></div></div>
 <div class="grid cols-2 form-compact"><div class="field"><label>근거 강도 (수동 평가)</label><select name="confidence">${[['low','낮음 — 개별 사례'],['medium','보통 — 반복적 신호'],['high','높음 — 정량·공식 교차 확인']].map(([v,t])=>`<option value="${v}" ${v===(old.confidence||'low')?'selected':''}>${t}</option>`).join('')}</select></div><div class="field"><label>관찰 표본 수 (선택)</label><input type="number" min="1" step="1" name="sampleSize" value="${d('sampleSize')}" placeholder="확인한 원문 게시물 수"/></div></div>
 <div class="evidence-form-section">2. 무엇이 발견됐고, 어떤 편향이 있는가?</div>
 <div class="field"><label>관찰 내용 (요약·설명)</label><textarea name="detail" required maxlength="3500" placeholder="소비자 반응의 맥락·반복되는 키워드·긍정과 부정 사례를 기록하세요">${d('detail')}</textarea></div>
 <div class="field"><label>짧은 원문 표현 (선택 · 직접 확인한 것만)</label><input name="quote" maxlength="240" value="${d('quote')}" placeholder="발췌라면 짧게, 재인용 대신 링크 권장"/></div>
 <div class="field"><label>표본 편향·대안적 해석</label><textarea name="caveat" maxlength="1100" placeholder="특정 커뮤니티의 취향? 협찬·광고? 발언이 전체 소비자를 대표하나?">${d('caveat')}</textarea></div>
 <div class="evidence-form-section">3. 실제 실적과 어떻게 연결되는가?</div>
 <div class="grid cols-2 form-compact"><div class="field"><label>연결할 KPI</label><select name="kpi">${opts(EVIDENCE_KPIS,old.kpi||'미연결')}</select></div><div class="field"><label>예상 방향</label><select name="kpiDirection">${opts(['미정','개선 가능성','악화 가능성','혼재·불명확'],old.kpiDirection||'미정')}</select></div></div>
 <div class="field"><label>투자 가설 연결</label><input name="thesis" maxlength="350" value="${d('thesis')}" placeholder="예: 상품 기획 수정 → 여성복 정가 판매 증가 → Old Navy comps 개선"/></div>
 <div class="field"><label>다음 확인 계획</label><input name="nextCheck" maxlength="350" value="${d('nextCheck')}" placeholder="예: 다음 분기 Old Navy 동일매장매출·재고·할인율 대조"/></div>
 <div class="field"><label>검증 상태</label><select name="reviewStatus">${Object.entries(evReviewLabel).map(([v,t])=>`<option value="${v}" ${v===(old.reviewStatus||'needs_review')?'selected':''}>${t}</option>`).join('')}</select><p>'출처 확인'은 실제 매출에 대한 증거가 아닙니다. 공식 실적과 수치가 일치할 때만 '실적 교차 확인'을 선택하세요.</p></div>
 <div class="modal-footer"><button type="button" class="btn btn-ghost" data-action="closeModal">취소</button><button type="submit" class="btn">${id?'변경 저장':'근거 기록 저장'}</button></div></form><p class="source-note" style="margin-top:12px">개인 기록은 이 브라우저에만 저장됩니다. CSV 분석 또는 JSON 백업을 권장합니다.</p></div></div>`;
}
function exportEvidenceCsv(){const fields=['date','ticker','brand','platform','sourceLevel','category','tone','sampleType','sampleSize','confidence','reviewStatus','title','detail','quote','kpi','kpiDirection','thesis','nextCheck','caveat','url','verified'];const rows=[fields,...evidenceAll().map(n=>fields.map(k=>n[k]||''))];const csv='\ufeff'+rows.map(row=>row.map(x=>'"'+String(x??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='atelier-consumer-evidence.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('소비자 근거 CSV 저장 완료')}

function openTicker(ticker){state.selected=ticker;nav('peers')}
document.addEventListener('click',e=>{let n=e.target.closest('[data-page]');if(n){nav(n.dataset.page);return}let b=e.target.closest('[data-action]');if(!b)return;let a=b.dataset.action;switch(a){case 'exportWeekly':exportWeekly();break;case 'refresh':location.reload();break;case 'r2GoUnified':state.r2LegacyFashion=false;render();break;case 'companyTab':state.companyTab=b.dataset.companyTab;state.brandLimit=12;render();window.scrollTo({top:0,behavior:'smooth'});break;case 'insightTab':state.insightTab=b.dataset.insightTab;render();window.scrollTo({top:0,behavior:'smooth'});break;case 'openVerified':state.insightTab='verified';nav('insights');break;case 'openIncoming':state.insightTab='incoming';nav('insights');break;case 'moreBrands':state.brandLimit+=12;render();break;case 'hubTab':state.hubTab=b.dataset.hubTab;render();window.scrollTo({top:0,behavior:'smooth'});break;case 'evidenceTab':state.evidenceTab=b.dataset.evidenceTab;render();break;case 'moreSignals':state.socialLimit+=25;render();break;case 'adoptSignal':{const src=socialItems().find(x=>x.id===b.dataset.signalId);if(!src)break;noteModal(src.ticker||'TREND',src.brand||'Fashion trend','',{ticker:src.ticker||'TREND',brand:src.brand||'Fashion trend',platform:src.platform==='Google News'?'News':src.platform,date:src.date.slice(0,10),title:src.title,url:src.url,sourceLevel:'search',reviewStatus:'needs_review',confidence:'low',sampleType:'개별 사례',caveat:'자동 발견 자료. 내용·댓글·맥락을 직접 확인하기 전까지 소비자 의견이나 KPI 증거로 사용하지 않음.'});break;}case 'select':openTicker(b.dataset.ticker);break;case 'sort':{let k=b.dataset.key;if(k==='position'){peers.forEach(p=>p.position=rpos(p))}state.sortDir=state.sortKey===k?-state.sortDir:1;state.sortKey=k;render();break}case 'csv':exportCsv();break;case 'exportNotes':exportJson();break;case 'importNotes':$('#import-input').click();break;case 'note':noteModal(b.dataset.ticker||'',b.dataset.brand||'');break;case 'editEvidence':{let item=notes.find(n=>n.id===b.dataset.id);if(item)noteModal(item.ticker,item.brand,item.id);break}case 'deleteEvidence':if(confirm('이 근거 기록을 삭제할까요?')){notes=notes.filter(n=>n.id!==b.dataset.id);saveNotes();render();notify('관찰 기록 삭제됨')}break;case 'exportEvidenceCsv':exportEvidenceCsv();break;case 'brandEvidence':state.notesTicker=b.dataset.ticker;state.notesBrand=b.dataset.brand;nav('evidence');break;case 'filterEvidenceBrand':state.notesBrand=b.dataset.brand;nav('evidence');break;case 'clearEvidence':Object.assign(state,{advancedOpen:false,notesTicker:'전체',notesPlatform:'전체',notesTone:'전체',notesStatus:'전체',notesBrand:'전체',notesQuery:'',notesOrder:'recent'});render();break;case 'closeModal':$('#modal-root').innerHTML='';break;default:break}});
document.addEventListener('input',e=>{if(e.target.id==='social-query'){state.socialQuery=e.target.value;const pos=e.target.selectionStart;render();const f=$('#social-query');if(f){f.focus();f.setSelectionRange(pos,pos)}return}if(e.target.id==='evidence-query'){state.notesQuery=e.target.value;const pos=e.target.selectionStart;render();const f=$('#evidence-query');if(f){f.focus();f.setSelectionRange(pos,pos)}return}if(e.target.id==='peer-search'||e.target.id==='brand-search'){const field=e.target.id==='peer-search'?'search':'brandSearch';state[field]=e.target.value;const pos=e.target.selectionStart;render();const focus=$('#'+e.target.id);if(focus){focus.focus();focus.setSelectionRange(pos,pos)}}});
document.addEventListener('change',e=>{const m={'peer-group':'group','brand-group':'brandGroup','note-ticker':'notesTicker','note-platform':'notesPlatform','note-brand':'notesBrand','note-tone':'notesTone','note-status':'notesStatus','note-order':'notesOrder','news-ticker':'newsTicker','thesis-ticker':'thesisTicker','social-ticker':'socialTicker','social-platform':'socialPlatform'};if(m[e.target.id]){if(e.target.closest('.advanced-filters'))state.advancedOpen=true;state[m[e.target.id]]=e.target.value;render()}});
document.addEventListener('submit',e=>{if(e.target.getAttribute('id')!=='note-form')return;e.preventDefault();const fd=new FormData(e.target);let id=String(fd.get('noteId')||'');const existing=notes.find(n=>n.id===id);if(!id)id='local-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);let n={...existing,id,verified:'personal',createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};for(const k of ['ticker','brand','platform','date','title','url','sourceLevel','category','tone','sampleType','confidence','sampleSize','detail','quote','caveat','kpi','kpiDirection','thesis','nextCheck','reviewStatus'])n[k]=String(fd.get(k)||'').trim();n.sampleSize=n.sampleSize?Math.max(1,parseInt(n.sampleSize,10)||1):'';if(safeURL(n.url)==='#'){notify('유효한 원문 URL을 입력해주세요');return}if(existing)notes=notes.map(v=>v.id===id?n:v);else notes.unshift(n);saveNotes();Object.assign(state,{notesQuery:'',notesTone:'전체',notesStatus:'전체',notesPlatform:'전체',notesBrand:'전체',notesTicker:'전체'});$('#modal-root').innerHTML='';notify(existing?'근거 기록을 수정했습니다':'근거 기록을 저장했습니다');state.insightTab='verified';nav('evidence')});
$('#import-input').addEventListener('change',async e=>{let file=e.target.files?.[0];if(!file)return;try{let data=JSON.parse(await file.text());if(!Array.isArray(data.notes))throw Error('notes array missing');let clean=data.notes.filter(x=>x&&typeof x==='object'&&typeof x.title==='string'&&typeof x.url==='string').slice(0,1000).map(x=>({...x,platform:String(x.platform||'직접 관찰').slice(0,80),title:String(x.title).slice(0,400),detail:String(x.detail||'').slice(0,3000)}));notes=[...clean,...notes].filter((n,i,a)=>a.findIndex(x=>x.id===n.id)===i);saveNotes();notify(`${clean.length}건 불러옴`);nav('evidence')}catch(ex){notify('올바른 노트 JSON 파일을 선택해주세요')}e.target.value=''});
$('#mobile-menu').addEventListener('click',()=>{const open=$('#sidebar').classList.toggle('open');document.body.classList.toggle('menu-open',open)});$('#nav-backdrop').addEventListener('click',()=>{$('#sidebar').classList.remove('open');document.body.classList.remove('menu-open')});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#modal-root').innerHTML='';if(e.key==='Enter'&&e.target.matches('.focus-card'))e.target.click()});
const quickSearch=document.getElementById("quick-company-search");
if(quickSearch){
 quickSearch.addEventListener("keydown",event=>{
  if(event.key!=="Enter")return;
  event.preventDefault();
  const query=String(quickSearch.value||"").trim().toLowerCase();
  if(!query)return;
  const universe=window.ATELIER2?.data?.companies||[];
  const exact=universe.find(x=>x.ticker.toLowerCase()===query||x.name.toLowerCase()===query);
  const found=exact||universe.find(x=>x.ticker.toLowerCase().startsWith(query)||x.name.toLowerCase().includes(query));
  if(!found){notify(universe.length?"검색 결과 없음":"기업 목록 연결 중");return}
  const details=window.ATELIER2.state;
  Object.assign(details,{selected:found.id,sector:"전체",market:"전체",disease:"전체",search:"",detailTab:"실적·이슈"});
  quickSearch.value="";
  nav("companies");
 });
}
document.addEventListener("keydown",event=>{
 if(event.key!=="/"||event.altKey||event.ctrlKey||event.metaKey)return;
 if(event.target?.closest?.("input,textarea,select,[contenteditable]"))return;
 if(!quickSearch)return;
 event.preventDefault();quickSearch.focus();
});
start();
})();
