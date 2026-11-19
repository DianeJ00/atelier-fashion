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
 let selected="우주·위성",deskSector="전체";
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

 const sectors=["우주·위성","바이오·제약","소비재·서비스","패션"];
 function newsItems(sector="전체",limit=12){
  const known=new Map(companyData().map(c=>[c.ticker,c]));
  const seen=new Set(),perSector=new Map(),perTicker=new Map();
  const rows=(window.ATELIER3?.issues?.items||[]).filter(x=>
    x.platform==="Google News"&&x.reviewStatus==="needs_review"&&x.title&&x.url&&x.date
  ).map(x=>{
    const c=known.get(x.ticker);
    const group=x.discoveryMethod==="sector_rss_title"?x.sector:
      c&&(!x.issuerId||x.issuerId===c.id)?c.sector:null;
    return {...x,group};
  }).filter(x=>sectors.includes(x.group)&&(sector==="전체"||x.group===sector))
   .sort((a,b)=>String(b.date).localeCompare(String(a.date))||
      Number(/^(Reuters|Yahoo Finance)$/i.test(b.creator||""))-Number(/^(Reuters|Yahoo Finance)$/i.test(a.creator||"")));
  const out=[];
  for(const x of rows){
   const group=x.group,publication=x.creator||"뉴스 출처 미표기";
   const title=String(x.title).replace(/\s+-\s+[^-]+$/,"");
   const key=group+"|"+title.toLowerCase();
   if(seen.has(key)||out.length>=limit||(perSector.get(group)||0)>=(sector==="전체"?4:limit))continue;
   if(x.ticker!=="INDUSTRY"&&(perTicker.get(x.ticker)||0)>=2)continue;
   seen.add(key);perSector.set(group,(perSector.get(group)||0)+1);
   if(x.ticker!=="INDUSTRY")perTicker.set(x.ticker,(perTicker.get(x.ticker)||0)+1);
   out.push({sector:group,title,date:String(x.date).slice(0,10),creator:publication,
     url:x.url,ticker:x.ticker==="INDUSTRY"?"":x.ticker});
  }
  return out;
 }
 function newsRow(x,showSector=false){
  return '<article class="iw-news-row"><div class="iw-news-meta"><time>'+esc(x.date)+'</time>'+
    '<span>'+esc(x.creator)+'</span>'+(showSector?'<span>'+esc(x.sector)+'</span>':"")+
    (x.ticker?'<span>'+esc(x.ticker)+'</span>':"")+'</div>'+
    '<a href="'+url(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.title)+'</a></article>';
 }
 function pulse(sector,slug){
  const rows=newsItems(sector,9);
  return '<section class="iw-events"><div class="iw-module-heading iw-heading-flex"><h2>최근 산업 뉴스</h2></div>'+
   (rows.length?rows.map(x=>newsRow(x)).join(""):
     '<p class="iw-quiet">'+(slug==="space"?"우주산업 뉴스 수집 대기":"최근 수집된 관련 뉴스가 없습니다.")+'</p>')+
   '<p class="iw-evidence-foot">Reuters · Yahoo Finance 등 공개 뉴스 RSS 제목 · 본문 미검증</p></section>';
 }
 function desk(){
  const rows=newsItems(deskSector,12);
  const universe=new Map(companyData().map(c=>[c.ticker,c]));
  const official=(window.ATELIER3?.recentOfficialEvents?.()?.selected||[]).slice(0,6);
  return '<div class="iw-desk"><header class="iw-desk-head"><h1>리서치 데스크</h1></header>'+
   '<section class="iw-desk-news"><div class="iw-section-title"><h2>최신 산업 뉴스</h2>'+
   '<button type="button" data-iw-open-sector>산업별 보기</button></div>'+
   '<div class="iw-desk-filter">'+["전체",...sectors].map(t=>
    '<button type="button" data-iw-desk-sector="'+esc(t)+'" aria-pressed="'+(deskSector===t)+'">'+esc(t)+'</button>').join("")+'</div>'+
   (rows.length?rows.map(x=>newsRow(x,true)).join(""):'<p class="iw-quiet">관련 기사 제목이 없습니다.</p>')+
   '<p class="iw-evidence-foot">제목·발행일·언론사 표시 · 뉴스 본문 내용과 투자 영향은 원문에서 확인</p></section>'+
   '<section class="iw-desk-results"><div class="iw-section-title"><h2>최근 기업 실적</h2>'+
   '<button type="button" data-iw-official>SEC 실적 전체 보기</button></div>'+
   official.map(r=>{
    const c=universe.get(r.ticker),rev=r.metrics?.revenue?.yoy?.percent,op=r.metrics?.operatingIncome?.yoy?.percent;
    const change=[Number.isFinite(rev)?"매출 "+(rev>0?"+":"")+rev.toFixed(1)+"%":null,
      Number.isFinite(op)?"영업이익 "+(op>0?"+":"")+op.toFixed(1)+"%":null].filter(Boolean).join(" · ")||"GAAP 실적";
    return '<button type="button" class="iw-result-row" data-iw-company="'+esc(c?.id||"")+'">'+
      '<strong>'+esc(r.ticker)+'</strong><span>'+esc(change)+'</span><time>'+esc(r.filed)+'</time></button>';
   }).join("")+'<p class="iw-evidence-foot">최근 30일 SEC 공시 · 전년 동기 대비 GAAP</p></section></div>';
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
  const b=e.target?.closest?.("[data-iw-sector],[data-iw-company],[data-iw-companies],[data-iw-weekly],[data-iw-desk-sector],[data-iw-open-sector],[data-iw-official]");
  if(!b)return;
  if(b.dataset.iwSector){setSector(b.dataset.iwSector);return;}
  if(b.dataset.iwDeskSector){deskSector=b.dataset.iwDeskSector;window.atelierRerender?.();return;}
  if(b.hasAttribute("data-iw-open-sector")){window.atelierGotoIndustry?.();return;}
  if(b.hasAttribute("data-iw-official")){window.atelierGotoOfficial?.();return;}
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
 window.ATELIER_INDUSTRIES={render,desk,newsItems,select:setSector,get selected(){return selected},SECTORS:SECTORS.map(s=>({key:s.key,slug:s.slug}))};
})();