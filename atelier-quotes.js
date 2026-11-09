/* ATELIER provider-hosted company quotes. No scraping, quote storage or API keys.
 * The third-party TradingView widget is fetched only after an explicit click.
 * US exchange mapping includes Walmart's 2025 NASDAQ transfer and 2026 VSXY.
 */
(()=>{"use strict";
const NYSE=new Set("LLY JNJ MRK ABBV PFE BMY UBER DIS TGT TJX CAVA CMG ELF EL RH RL PVH LEVI ANF GAP AEO VFC CPRI CAL VSXY TPR".split(" "));
const NASDAQ=new Set("AMGN GILD REGN VRTX ALNY BIIB VKTX NBIX IONS INCY EXEL MRNA CRSP SRPT NFLX BKNG WMT COST SBUX ULTA URBN".split(" "));
const KOREA=new Set("950260 278470 003230 105560 005830".split(" "));
const KOSDAQ=new Set(["950260"]);
const SCRIPT="https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
const validUS=/^[A-Z][A-Z0-9.]{0,9}$/;
const validKR=/^[0-9]{6}$/;
function quote(company){
 if(!company||typeof company.id!=="string"||typeof company.ticker!=="string")return null;
 const {id,ticker,name,market}=company;
 if(market==="미국"&&id==="US:"+ticker&&validUS.test(ticker)){
  const exchange=NYSE.has(ticker)?"NYSE":NASDAQ.has(ticker)?"NASDAQ":null;
  if(!exchange)return null; // fail closed instead of silently choosing a homonym
  return Object.freeze({
   symbol:exchange+":"+ticker,
   yahoo:"https://finance.yahoo.com/quote/"+encodeURIComponent(ticker)+"/",
   tradingView:"https://www.tradingview.com/symbols/"+exchange+"-"+encodeURIComponent(ticker)+"/",
   title:String(name||ticker),
  });
 }
 if(market==="한국"&&id==="KR:"+ticker&&validKR.test(ticker)&&KOREA.has(ticker)){
  const yahooSuffix=KOSDAQ.has(ticker)?".KQ":".KS";
  return Object.freeze({
   symbol:"KRX:"+ticker,
   yahoo:"https://finance.yahoo.com/quote/"+ticker+yahooSuffix+"/",
   tradingView:"https://www.tradingview.com/symbols/KRX-"+ticker+"/",
   title:String(name||ticker),
  });
 }
 return null;
}
function config(company){
 const mapped=quote(company);
 if(!mapped)return null;
 return {
  symbols:[[mapped.title,mapped.symbol+"|1D"]],
  chartOnly:false,
  width:"100%",
  height:"100%",
  locale:"kr",
  colorTheme:"light",
  autosize:true,
  showVolume:true,
  showMA:false,
  hideDateRanges:false,
  hideMarketStatus:false,
  hideSymbolLogo:false,
  scalePosition:"right",
  scaleMode:"Normal",
  valuesTracking:"1",
  changeMode:"price-and-percent",
  chartType:"area",
  dateRanges:["1d|1","1m|30","3m|60","12m|1D","60m|1W"],
 };
}
function make(tag,className,text){
 const element=document.createElement(tag);
 if(className)element.className=className;
 if(text)element.textContent=text;
 return element;
}
function mount(targetId,company){
 const target=document.getElementById(targetId);
 const mapping=quote(company),settings=config(company);
 if(!target||!mapping||!settings)return false;
 target.replaceChildren();
 const container=make("div","tradingview-widget-container");
 container.style.cssText="height:100%;width:100%;";
 const widget=make("div","tradingview-widget-container__widget");
 widget.style.cssText="height:calc(100% - 32px);width:100%;";
 const copyright=make("div","tradingview-widget-copyright");
 const link=make("a","r2-tv-source",mapping.title+" 주가 · TradingView");
 link.href=mapping.tradingView;
 link.target="_blank";
 link.rel="noopener nofollow noreferrer";
 copyright.append(link);
 const script=document.createElement("script");
 script.type="text/javascript";
 script.src=SCRIPT;
 script.async=true;
 script.textContent=JSON.stringify(settings);
 script.onerror=()=>{
  if(!container.isConnected)return;
  widget.replaceChildren(make("p","r2-tv-error","차트를 연결하지 못했습니다. 아래의 Yahoo Finance 또는 TradingView 링크에서 직접 확인하세요."));
 };
 container.append(widget,copyright,script);
 target.append(container);
 return true;
}
window.ATELIER_QUOTES=Object.freeze({quote,config,mount,scriptURL:SCRIPT});
})();