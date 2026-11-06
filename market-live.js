/* Licensed vendor-hosted ETF comparison. No unauthorized price extraction.
   Intraday/delayed charts are served by TradingView; dated ATELIER tables
   remain audited snapshots until a licensed daily-close feed is connected. */
(()=>{"use strict";
const URL="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
const cfg={
 autosize:true,symbol:"AMEX:XLK",interval:"D",range:"3M",
 timezone:"America/New_York",theme:"light",style:"2",locale:"ko",
 withdateranges:true,hide_side_toolbar:true,hide_top_toolbar:false,
 hide_legend:false,hide_volume:true,allow_symbol_change:false,
 save_image:false,calendar:false,
 compareSymbols:[
  {symbol:"AMEX:XBI",position:"SameScale"},
  {symbol:"AMEX:XLY",position:"SameScale"},
  {symbol:"AMEX:XRT",position:"SameScale"}
 ],
 support_host:"https://www.tradingview.com"
};
document.addEventListener("toggle",event=>{
 const root=event.target;
 if(!root.matches?.("details[data-r6-live]")||!root.open)return;
 const slot=root.querySelector("[data-r6-slot]");
 if(!slot||slot.dataset.loaded==="1")return;
 slot.dataset.loaded="1";
 slot.innerHTML='<div class="tradingview-widget-container" style="width:100%;height:470px"><div class="tradingview-widget-container__widget" style="height:calc(100% - 28px);width:100%"></div><div class="r6-tradingview-attribution"><a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">시세·비교 차트: TradingView ↗</a> · 시세 지연 여부는 제공사 기준</div></div>';
 const node=slot.querySelector(".tradingview-widget-container");
 const script=document.createElement("script");
 script.async=true;script.src=URL;script.type="text/javascript";
 script.textContent=JSON.stringify(cfg);
 script.onerror=()=>{slot.dataset.loaded="0";slot.innerHTML='<p class="r6-live-error">비교 차트를 불러오지 못했습니다. 브라우저의 외부 콘텐츠 허용을 확인하거나 <a href="https://www.tradingview.com/symbols/AMEX-XLK/" target="_blank" rel="noopener noreferrer">TradingView 열기 ↗</a>를 이용하세요.</p>';};
 node.appendChild(script);
},true);
})();