/* ATELIER Industry Studios: separate visual grammar, shared factual standards.
 * Industry shapes are explanatory models, never performance measurements.
 * Space research is staged until SEC/IR/source collection is integrated.
 */
(()=>{
 "use strict";
 const SECTORS=[
  {key:"우주·위성",slug:"space",en:"SPACE SYSTEMS",heading:"우주·위성",lead:"발사에서 위성망·데이터 서비스까지",question:"발사 비용과 우주 인프라 투자가 누구의 매출·마진·현금흐름으로 연결되는가"},
  {key:"바이오·제약",slug:"bio",en:"LIFE SCIENCES",heading:"바이오·제약",lead:"연구·임상·허가에서 제품 매출까지",question:"어떤 후보물질이 임상·허가를 통과해 실제 제품 매출과 현금흐름으로 이어지는가"},
  {key:"소비재·서비스",slug:"consumer",en:"CONSUMER ECONOMICS",heading:"소비재·서비스",lead:"고객 행동이 수익성으로 바뀌는 구조",question:"고객·거래량의 증가가 매출 증가를 넘어 영업이익과 FCF 개선으로 이어지는가"},
  {key:"패션",slug:"fashion",en:"BRAND ECONOMICS",heading:"패션",lead:"브랜드 · 지역 · 판매채널",question:"어느 브랜드가 어느 시장에서 정가 판매와 마진을 지키며 성장하는가"}
 ];
 let selected="우주·위성";
 function esc(x){return String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
 function url(x){
  try{const u=new URL(x);return /^https?:$/.test(u.protocol)?esc(u.href):"#";}catch(_){return "#";}
 }
 const companyData=()=>window.ATELIER2?.data?.companies||[];
 const secData=()=>window.ATELIER3?.gaap?.companies||[];
 const sourceData=()=>window.ATELIER3?.report?.items||[];
 const rssData=()=>window.ATELIER3?.issues?.items||[];
 function setSector(sector){
  if(SECTORS.some(s=>s.key===sector))selected=sector;
  if(typeof window.atelierRerender==="function")window.atelierRerender();
 }
 function selector(){
  return '<div class="iw-sector-nav" role="group" aria-label="산업 선택">'+SECTORS.map(s=>
   '<button type="button" data-iw-sector="'+esc(s.key)+'" aria-pressed="'+(selected===s.key?'true':'false')+'" class="'+(selected===s.key?'is-current':'')+' iw-nav-'+s.slug+'">'+esc(s.heading)+'</button>'
  ).join("")+'</div>';
 }
 function spaceMap(){
  const parts=[["발사·운송","SpaceX · Rocket Lab · Firefly"],["위성·우주선 제작","SpaceX · MDA · Intuitive Machines"],
   ["통신·서비스","Starlink · AST SpaceMobile · Iridium"],["영상·데이터","Planet Labs · BlackSky"]];
  return '<div class="iw-architecture iw-space-map" aria-label="우주산업 4개 사업영역">'+
    parts.map(p=>'<div class="iw-space-line"><b>'+esc(p[0])+'</b><span>'+esc(p[1])+'</span></div>').join("")+'</div>';
 }
 function bioTimeline(){
  const steps=[["연구·전임상","표적·기전·안전성"],["임상 1·2상","안전성·초기 효능"],["임상 3상","확증 데이터"],
   ["허가","규제·보험"],["상업화","처방·제품 매출"]];
  return '<div class="iw-architecture iw-bio-timeline">'+
   steps.map(p=>'<div class="iw-structure-line"><b>'+esc(p[0])+'</b><span>'+esc(p[1])+'</span></div>').join("")+'</div>';
 }
 function consumerFunnel(){
  const parts=[["고객","이용자·방문"],["거래","예약·주문·구매 빈도"],["매출","가격·수수료·전환"],["이익·현금","마진·CAPEX·FCF"]];
  return '<div class="iw-architecture iw-consumer-funnel">'+
   parts.map(p=>'<div class="iw-structure-line"><b>'+esc(p[0])+'</b><span>'+esc(p[1])+'</span></div>').join("")+'</div>';
 }
 function fashionMatrix(){
  const parts=[["브랜드","핵심·신규 브랜드별 매출"],["지역","북미·유럽·아시아"],["채널","직영·도매·온라인"],
   ["판매 품질","정가 판매·할인·재고"]];
  return '<div class="iw-architecture iw-fashion-matrix">'+
   parts.map(p=>'<div class="iw-structure-line"><b>'+esc(p[0])+'</b><span>'+esc(p[1])+'</span></div>').join("")+'</div>';
 }
 const figures={space:spaceMap,bio:bioTimeline,consumer:consumerFunnel,fashion:fashionMatrix};
 const drivers={
  space:[["발사경제성","재사용·발사 빈도·내부 발사 구분"],["위성망 수익모델","서비스 가입자·ARPU·망 투자"],["공공조달","NASA·국방 발주와 실제 수주"],["자금구조","CAPEX·FCF·계약 선급금"]],
  bio:[["임상 데이터","1차 평가변수와 안전성"],["상업화","제품 승인·처방·보험 적용"],["특허·경쟁","독점기간·대체 약물"],["자금 여력","현금 소진·추가 조달"]],
  consumer:[["고객 기반","고객 수·구매 빈도·동일매장매출"],["매출 인식","거래액과 실제 매출 구분"],["단위경제성","거래당 비용·매장 마진"],["성장 투자","CAPEX·점포 확대·FCF"]],
  fashion:[["브랜드 믹스","핵심 브랜드별 성장"],["채널 믹스","직영 vs 도매·온라인"],["가격 결정력","정가 판매·할인·ASP"],["재고 건전성","재고 증가율·매출총이익률"]]
 };
 function radar(slug){
  return '<aside class="iw-radar"><div class="iw-module-heading"><span>CHECKPOINTS</span><h2>산업에서 볼 것</h2></div>'+
   drivers[slug].map((a,i)=>'<div class="iw-driver"><span>'+String(i+1).padStart(2,"0")+'</span><div><strong>'+esc(a[0])+'</strong><p>'+esc(a[1])+'</p></div></div>').join("")+
   '</aside>';
 }
 function officialFor(sector){
  return sourceData().filter(x=>x.sector===sector&&x.sourceUrl&&x.eventDate)
   .slice().sort((a,b)=>String(b.eventDate).localeCompare(String(a.eventDate))).slice(0,3).map(x=>
    {return {ticker:x.ticker,day:x.eventDate,label:"원문 확인",title:x.title,source:x.sourceUrl};});
 }
 function newsFor(sector){
  const known=new Map(companyData().map(x=>[x.ticker,x]));
  return rssData().filter(x=>x.platform==="Google News"&&x.reviewStatus==="needs_review"&&
   known.get(x.ticker)?.sector===sector&&x.url&&x.date&&(!x.issuerId||x.issuerId===known.get(x.ticker)?.id))
   .sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,4).map(x=>
    ({ticker:x.ticker,day:String(x.date).slice(0,10),label:"제목만 수집",title:x.title,source:x.url}));
 }
 function pulse(sector,slug){
  const verified=officialFor(sector),raw=newsFor(sector);
  const all=[...verified,...raw].sort((a,b)=>String(b.day).localeCompare(String(a.day))).slice(0,6);
  const body=all.length?all.map(x=>'<div class="iw-event"><div class="iw-event-meta"><time>'+esc(x.day)+'</time><span>'+esc(x.label)+'</span><b>'+esc(x.ticker||sector)+'</b></div>'+
   '<a href="'+url(x.source)+'" target="_blank" rel="noopener noreferrer">'+esc(x.title)+'</a></div>').join(""):
   '<div class="iw-quiet">'+(slug==="space"?"우주산업의 공식 이슈 수집 연결 전입니다. 확인되지 않은 사건을 최신 이슈로 표시하지 않습니다.":"현재 연결된 산업별 신규 근거가 없습니다.")+'</div>';
  return '<section class="iw-events"><div class="iw-module-heading iw-heading-flex"><div><span>INDUSTRY WATCH</span><h2>산업 변화</h2></div>'+
   (slug==="space"?"":'<button type="button" data-iw-weekly="'+esc(sector)+'">주간 리서치 보기 ↗</button>')+'</div>'+
   body+'<p class="iw-evidence-foot">날짜·원문 상태 구분 · 제목만 수집한 기사는 본문과 투자 영향 미검증</p></section>';
 }
 function rows(sector,slug){
  if(slug==="space"){
   const groups=[["산업 기준기업","SpaceX","발사·Starlink·우주 인프라"],["발사·제조","Rocket Lab","발사체·위성 시스템"],["달 탐사","Intuitive Machines","우주 운송·탐사 인프라"],["위성통신","AST SpaceMobile","휴대전화 직접 연결"],["우주 데이터","Planet Labs","지구관측·데이터"]];
   return '<section class="iw-watchlist"><div class="iw-module-heading iw-heading-flex"><div><span>COMPANY UNIVERSE</span><h2>기업 분석 후보</h2></div><span>SpaceX 중심</span></div>'+
    '<div class="iw-company-table iw-space-candidates">'+groups.map((x,i)=>'<div class="iw-company-entry"><span class="iw-company-ticker">'+esc(x[0])+'</span>'+
     '<div class="iw-company-detail"><strong>'+esc(x[1])+'</strong><small>'+esc(x[2])+'</small></div>'+
     '<span class="iw-company-pending">공식 데이터 연결 전</span></div>').join("")+'</div>'+
    '<p class="iw-evidence-foot">우주·위성 기업은 아직 기존 52개 추적 목록과 SEC 자동 검증 파이프라인에 편입되지 않았습니다. 후보 소개이며 실적 확인 완료가 아닙니다.</p></section>';
  }
  const companies=companyData().filter(x=>x.sector===sector);
  const sec=new Map(secData().map(r=>[r.ticker,r]));
  const list=companies.slice().sort((a,b)=>String(sec.get(b.ticker)?.filed||"").localeCompare(String(sec.get(a.ticker)?.filed||"")));
  return '<section class="iw-watchlist"><div class="iw-module-heading iw-heading-flex"><div><span>COMPANY UNIVERSE</span><h2>기업 트래킹 <em>'+companies.length+'</em></h2></div>'+
   '<button type="button" data-iw-companies="'+esc(sector)+'">전체 기업 보기 ↗</button></div>'+
   '<div class="iw-company-table">'+list.slice(0,8).map(c=>{
    const r=sec.get(c.ticker),kpi=(c.kpis||[]).slice(0,2).join(" · ");
    const context=slug==="bio"?c.disease||c.domain||"":"";
    const brand=slug==="fashion"?(c.brands||[]).slice(0,2).join(" · "):"";
    const extra=context||brand||kpi||c.focus||"";
    return '<button type="button" data-iw-company="'+esc(c.id)+'" class="iw-company-entry">'+
      '<span class="iw-company-ticker">'+esc(c.ticker)+'</span><span class="iw-company-detail"><strong>'+esc(c.name)+'</strong>'+
      '<small>'+esc(extra)+'</small></span><span class="iw-company-date">'+esc(r?.filed||"실적 연결 대기")+'</span><span class="iw-company-arrow" aria-hidden="true">↗</span></button>';
   }).join("")+'</div></section>';
 }
 function render(){
  const m=SECTORS.find(s=>s.key===selected)||SECTORS[0];
  const name=m.slug==="space"?"발사·제조·통신·데이터":m.slug==="bio"?"연구·임상·허가·상업화":
    m.slug==="consumer"?"고객·거래·이익·현금":"브랜드·지역·판매채널";
  return '<div class="iw-page iw-theme-'+m.slug+'" data-active-sector="'+esc(m.key)+'">'+selector()+
   '<header class="iw-masthead"><h1>'+esc(m.heading)+'</h1><p>'+esc(m.lead)+'</p></header>'+
   '<section class="iw-simple-structure"><h2>산업 구조 <small>'+esc(name)+'</small></h2>'+figures[m.slug]()+
   '<div class="iw-focus-terms">'+drivers[m.slug].map(x=>'<span>'+esc(x[0])+'</span>').join("")+'</div></section>'+
   pulse(m.key,m.slug)+rows(m.key,m.slug)+'</div>';
 }

 document.addEventListener("click",e=>{
  const b=e.target?.closest?.("[data-iw-sector],[data-iw-company],[data-iw-companies],[data-iw-weekly]");
  if(!b)return;
  if(b.dataset.iwSector){setSector(b.dataset.iwSector);return;}
  if(b.dataset.iwCompany){
   const st=window.ATELIER2?.state;
   if(st){st.sector="전체";st.market="전체";st.search="";st.disease="전체";st.selected=b.dataset.iwCompany;st.detailTab="실적·이슈";}
   window.atelierGotoCompanies?.();return;
  }
  if(b.dataset.iwCompanies){
   const st=window.ATELIER2?.state;
   if(st){st.sector=b.dataset.iwCompanies;st.market="전체";st.search="";st.selected="";}
   window.atelierGotoCompanies?.();return;
  }
  if(b.dataset.iwWeekly){
   const st=window.ATELIER2?.state;
   if(st)st.weeklySector=b.dataset.iwWeekly;
   window.atelierGotoWeekly?.();
  }
 });
 window.ATELIER_INDUSTRIES={render,select:setSector,get selected(){return selected},SECTORS:SECTORS.map(s=>({key:s.key,slug:s.slug}))};
})();