/* Vendor-hosted live ETF comparison, intentionally no proprietary raw price harvesting.
   Widgets are not a substitute for the dated ATELIER reviewed return snapshot. */
(()=>{"use strict";
const URL="https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js";
const cfg={
 colorTheme:"light",dateRange:"3M",locale:"ko",isTransparent:false,
 showFloatingTooltip:true,showChart:true,showSymbolLogo:false,
 plotLineColorGrowing:"rgba(36,102,165,1)",
 plotLineColorFalling:"rgba(36,102,165,1)",
 tabs:[
  {title:"미국 시장",symbols:[
   {s:"AMEX:SPY",d:"S&P 500 · SPY"},{s:"NASDAQ:QQQ",d:"나스닥100 · QQQ"},
   {s:"AMEX:XLK",d:"기술주 · XLK"}
  ],originalTitle:"미국 시장"},
  {title:"관찰 산업",symbols:[
   {s:"AMEX:XBI",d:"바이오 · XBI"},{s:"AMEX:XLY",d:"경기소비재 · XLY"},
   {s:"AMEX:XRT",d:"리테일 · XRT"}
  ],originalTitle:"관찰 산업"}
 ],
 width:"100%",height:405
};
document.addEventListener("toggle",event=>{
 const root=event.target;
 if(!root.matches?.("details[data-r6-live]")||!root.open)return;
 const slot=root.querySelector("[data-r6-slot]");
 if(!slot||slot.dataset.loaded==="1")return;
 slot.dataset.loaded="1";
 slot.innerHTML='<div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div><div class="r6-tradingview-attribution"><a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">시장 데이터·차트: TradingView ↗</a> · 실시간·지연 시세 구분은 제공사 기준</div></div>';
 const node=slot.querySelector(".tradingview-widget-container");
 const script=document.createElement("script");
 script.async=true;script.src=URL;script.type="text/javascript";
 script.textContent=JSON.stringify(cfg);
 script.onerror=()=>{slot.dataset.loaded="0";slot.innerHTML='<p class="r6-live-error">TradingView 외부 화면을 불러오지 못했습니다. 브라우저의 외부 콘텐츠 차단을 확인하거나 <a href="https://www.tradingview.com/symbols/AMEX-XBI/" target="_blank" rel="noopener noreferrer">TradingView 직접 열기 ↗</a>를 이용하세요.</p>';};
 node.appendChild(script);
},true);
})();