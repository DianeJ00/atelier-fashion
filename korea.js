/* Official domestic company filings, no browser-side secret or extrapolated ratios. */
(()=>{"use strict";
let data=null;
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const url=s=>{try{const x=new URL(s);return x.protocol==="https:"?x.href:"#"}catch{return "#"}};
const krw=v=>Number.isFinite(v)?(v/1e8).toLocaleString("ko-KR",{maximumFractionDigits:1})+"억원":"미확인";
function card(company){
 const row=(data?.companies||[]).find(x=>x.ticker===company.ticker);
 const isReady=row?.status==="financials_verified";
 const headline='<div class="k7-head"><div><span>국내 기존 담당 · 공식 DART</span><h3>'+esc(company.name)+' 정기공시</h3></div><a href="'+url(row?.source||"https://dart.fss.or.kr/")+'" target="_blank" rel="noopener noreferrer">전자공시 원문 ↗</a></div>';
 const checks=(company.kpis||[]).map(x=>'<span>'+esc(x)+'</span>').join("");
 if(!isReady)return '<section class="k7-panel">'+headline+
 '<p class="k7-wait">'+(row?.status==="dart_key_required"?"공식 OpenDART 인증키가 아직 연결되지 않아 최신 공시의 정량 수치를 확인하지 못했습니다.":"공식 DART 재무자료 확인 대기 상태입니다.")+' <a href="https://opendart.fss.or.kr/" target="_blank" rel="noopener noreferrer">OpenDART 서비스 ↗</a></p>'+
 '<div class="k7-kpis"><b>회사별 다음 확인 항목</b><div>'+checks+'</div></div>'+
 '<small>과거 개인 브리프 원본은 연결되지 않았습니다. 회사에 대한 재무 추정을 사실처럼 표시하지 않습니다.</small></section>';
 const statement=row.statement,period=row.report;
 const metrics=Object.entries(statement.metrics||{});
 return '<section class="k7-panel">'+headline+
 '<div class="k7-period"><b>'+esc(period.label)+' · '+esc(statement.basis)+'</b><small>'+esc(statement.statement)+' 재무제표 · 접수 '+esc(period.received)+'</small></div>'+
 '<div class="k7-values">'+metrics.map(([key,x])=>
 '<div><small>'+esc(key)+'</small><strong>'+esc(krw(x.currentKRW))+'</strong><span>'+(x.priorYearQuarterKRW==null?'비교 기간 미확인':'전년 동일 기간 '+esc(krw(x.priorYearQuarterKRW)))+'</span></div>'
 ).join("")+'</div>'+
 '<p class="k7-caveat">손익계산서의 회사별 공식 계정만 표시. 은행·보험 NIM/CET1/K-ICS/CSM, 사업부별 매출, 임상·허가 정보는 별도 공식 자료를 확인해야 합니다.</p>'+
 '<div class="k7-kpis"><b>회사별 핵심 검증 항목</b><div>'+checks+'</div></div></section>';
}
async function load(){
 try{const obj=await window.ATELIER_DATA.get("korea");data=obj?.count===5?obj:null}
 catch(_){data=null}
 if(typeof window.atelierRerender==="function")window.atelierRerender();
}
window.ATELIER_KOREA={load,card,get data(){return data}};
})();