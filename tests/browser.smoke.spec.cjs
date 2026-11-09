const {test,expect}=require("@playwright/test");
const {readFile}=require("node:fs/promises");
const BASE="http://127.0.0.1:8137/";
test.describe("ATELIER published-site regression",()=>{
 test("desktop: 52 companies, weekly navigation, private backup round trip",async({page})=>{
  await page.goto(BASE,{waitUntil:"domcontentloaded"});
  await expect(page.locator("#nav [data-page=overview]")).toBeVisible();
  await page.locator("#nav [data-page=companies]").click();
  await expect(page.locator(".r2-company-list")).toBeVisible({timeout:20000});
  await expect(page.locator(".r2-company-row").first()).toBeVisible();
  await page.locator("#nav [data-page=insights]").click();
  await expect(page.locator("#page-crumb")).toHaveText("주간 리서치");
  await page.locator("#nav [data-page=hub]").click();
  const archive=page.locator("details").filter({hasText:"개인 기록 백업·복원"}).first();
  await archive.locator("summary").click();
  await expect(page.locator('[data-personal-backup="export"]')).toBeVisible();
  await page.evaluate(()=>{
   localStorage.setItem("atelierNotes",JSON.stringify([{id:"browser-test-note",title:"브라우저 검증",url:"https://example.org"}]));
   localStorage.setItem("ATELIER_V23_THESIS_LOCAL_ONLY",JSON.stringify({"US:UBER":{choice:"유지",hypothesis:"FCF 개선"}}));
  });
  const download=page.waitForEvent("download");
  await page.locator('[data-personal-backup="export"]').click();
  const output=await download;
  const backup=JSON.parse(await readFile(await output.path(),"utf8"));
  expect(backup.schema).toBe("atelier-private-backup-v1");
  expect(backup.notes[0].id).toBe("browser-test-note");
  expect(backup.theses["US:UBER"].choice).toBe("유지");
  // Restore the same content only after explicit browser confirmation.
  page.once("dialog",d=>d.accept());
  await page.locator("#personal-backup-input").setInputFiles({
   name:"ATELIER_restore.json",mimeType:"application/json",
   buffer:Buffer.from(JSON.stringify(backup),"utf8")
  });
  await page.waitForLoadState("domcontentloaded");
  const saved=await page.evaluate(()=>({
   notes:JSON.parse(localStorage.getItem("atelierNotes")),
   theses:JSON.parse(localStorage.getItem("ATELIER_V23_THESIS_LOCAL_ONLY"))
  }));
  expect(saved.notes[0].id).toBe("browser-test-note");
  expect(saved.theses["US:UBER"].choice).toBe("유지");
 });
 test("opened old tab: detect code-only update and preserve private notes on refresh",async({page})=>{
  await page.goto(BASE,{waitUntil:"domcontentloaded"});
  const prior=await page.evaluate(()=>window.ATELIER_DATA.buildId);
  expect(prior).toMatch(/^[a-f0-9]{20}$/);
  await page.evaluate(()=>localStorage.setItem("atelierNotes",JSON.stringify([{id:"keep-on-reload"}])));
  await page.route("**/site-version.json",route=>route.fulfill({
   status:200,contentType:"application/json",
   body:JSON.stringify({buildId:"f".repeat(20),releaseId:"f".repeat(20)})
  }));
  expect(await page.evaluate(()=>window.ATELIER_DATA.checkForUpdate(true))).toBe(true);
  const warning=page.locator("#atelier-version-banner");
  await expect(warning).toBeVisible();
  await expect(warning).toContainText("새 버전");
  await warning.getByRole("button",{name:"사이트 새로고침"}).click();
  await page.waitForLoadState("domcontentloaded");
  const notes=await page.evaluate(()=>JSON.parse(localStorage.getItem("atelierNotes")));
  expect(notes[0].id).toBe("keep-on-reload");
 });
 test("synthetic price event: compact overview opens company evidence without claiming a cause",async({page})=>{
  // Fixture only: no actual financial price is fetched or attributed.
  const feed={schemaVersion:1,status:"partial",publicDerivedAuthorized:true,
   asOf:"2026-11-05",coverage:{screened:1,totalUS:47},eligibleEvents:1,
   events:[{issuerId:"US:LLY",ticker:"LLY",tradeDate:"2026-11-05",
     previousTradeDate:"2026-11-04",changePct:12.4,volatilityMultiple:3,
     evidenceState:"공식 사건 동기간 확인 · 인과 미확정",causalityConfirmed:false,
     source:{provider:"fictional test provider",url:"https://example.org/test"},
     evidence:[{title:"가상 SEC 원문",sourceType:"sec_filing",
       publishedAt:"2026-11-05",url:"https://www.sec.gov/Archives/test"}]}]};
  await page.route("**/price-events.json",route=>route.fulfill({
   status:200,contentType:"application/json",body:JSON.stringify(feed)
  }));
  await page.goto(BASE,{waitUntil:"domcontentloaded"});
  const panel=page.locator(".r2-move-panel");
  await expect(panel).toBeVisible({timeout:20000});
  await expect(panel).toContainText("+12.40%");
  await expect(panel).toContainText("일부 종목만 확인");
  await panel.locator(".r2-move-company").click();
  await expect(page.locator("#page-crumb")).toHaveText("기업 분석");
  await expect(page.locator(".r2-move-company-box")).toContainText("인과 미확정");
  await page.locator(".r2-move-company-box summary").click();
  await expect(page.locator(".r2-move-company-box a").first()).toHaveAttribute(
    "href","https://www.sec.gov/Archives/test");
 });
 test("free quote widget loads only on demand and preserves exchange symbols",async({page})=>{
  const providerCalls=[];
  await page.route("https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js",route=>{
   providerCalls.push(route.request().url());
   return route.fulfill({status:200,contentType:"text/javascript",body:"/* provider stub: do not access a price API */"});
  });
  await page.goto(BASE,{waitUntil:"domcontentloaded"});
  await page.locator("#nav [data-page=companies]").click();
  await expect(page.locator(".r2-quote-panel")).toBeVisible({timeout:20000});
  await expect(page.locator("#r2-tv-frame script")).toHaveCount(0);
  await expect(page.locator('.r2-quote-actions a[href="https://finance.yahoo.com/quote/LLY/"]')).toBeVisible();
  await expect(page.locator(".r2-quote-privacy")).toContainText("TradingView");
  expect(providerCalls.length).toBe(0);
  await page.locator("#r2-quote-load").click();
  const script=page.locator('#r2-tv-frame script[src*="embed-widget-symbol-overview.js"]');
  await expect(script).toHaveCount(1);
  expect(JSON.parse(await script.textContent()).symbols[0][1]).toBe("NYSE:LLY|1D");
  expect(JSON.parse(await script.textContent()).changeMode).toBe("price-and-percent");
  await expect(page.locator("#r2-quote-load")).toBeDisabled();
  await page.locator('.r2-company-row[data-val="US:WMT"]').click();
  await expect(page.locator("#r2-tv-frame script")).toHaveCount(0);
  await page.locator("#r2-quote-load").click();
  expect(JSON.parse(await page.locator("#r2-tv-frame script").textContent()).symbols[0][1]).toBe("NASDAQ:WMT|1D");
  await page.locator('.r2-company-row[data-val="KR:950260"]').click();
  await expect(page.locator('.r2-quote-actions a[href="https://finance.yahoo.com/quote/950260.KQ/"]')).toBeVisible();
  await page.locator("#r2-quote-load").click();
  expect(JSON.parse(await page.locator("#r2-tv-frame script").textContent()).symbols[0][1]).toBe("KRX:950260|1D");
 });
 test("mobile 390px: menu, companies, hub and collapsed backup",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(BASE,{waitUntil:"domcontentloaded"});
  await expect(page.locator("#mobile-menu")).toBeVisible();
  await page.locator("#mobile-menu").click();
  await page.locator("#nav [data-page=companies]").click();
  await expect(page.locator("#page-crumb")).toHaveText("기업 분석");
  await expect(page.locator(".r2-company-list")).toBeVisible({timeout:20000});
  await page.locator("#mobile-menu").click();
  await page.locator("#nav [data-page=hub]").click();
  await expect(page.locator("#page-crumb")).toHaveText("자료실");
  const backup=page.locator("details").filter({hasText:"개인 기록 백업·복원"}).first();
  await backup.locator("summary").click();
  await expect(page.locator('[data-personal-backup="import"]')).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
  expect(overflow).toBeFalsy();
 });
});
