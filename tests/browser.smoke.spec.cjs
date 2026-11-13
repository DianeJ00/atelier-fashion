const {test,expect}=require("@playwright/test");
const {readFile}=require("node:fs/promises");
const BASE="http://127.0.0.1:8137/";
test.describe("ATELIER published-site regression",()=>{
 test("research desk: concise overview and global ticker jump",async({page})=>{
  await page.goto(BASE,{waitUntil:"domcontentloaded"});
  await expect(page.locator(".desk-hero h1")).toHaveText("리서치 데스크");
  await expect(page.locator(".desk-core-grid")).toBeVisible({timeout:20000});
  await expect(page.locator(".a5-signal").first()).toBeVisible({timeout:20000});
  await expect(page.locator(".desk-market-details")).not.toHaveAttribute("open");
  await expect(page.locator("body")).not.toContainText("시장 상대강도에서 기업별 투자 판단까지");
  await expect(page.locator("#quick-company-options option")).toHaveCount(52,{timeout:20000});
  await page.locator("#quick-company-search").fill("LLY");
  await page.locator("#quick-company-search").press("Enter");
  await expect(page.locator("#page-crumb")).toHaveText("기업 분석");
  await expect(page.locator(".r2-detail-header")).toContainText("Eli Lilly");
  await expect(page.locator(".r2-detail-tabs button.is-active")).toHaveText("실적·이슈");
 });

 test("SEC archive: verified quarter summary, searchable coverage and hidden operations",async({page})=>{
  await page.goto(BASE,{waitUntil:"domcontentloaded"});
  await page.locator("#nav [data-page=hub]").click();
  await expect(page.locator('.hub-tab.active[data-hub-tab="official"]')).toBeVisible();
  await expect(page.locator(".sec-record")).toHaveCount(47,{timeout:20000});
  await expect(page.locator(".h7-panel")).toHaveCount(0);
  await expect(page.locator("#sec-visible-count")).toHaveText("47개 기업");
  await page.locator("#sec-archive-search").fill("CAVA");
  const items=page.locator(".sec-record:visible");
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText("매출 증가, 영업이익 감소");
  await items.first().locator("summary").click();
  await expect(items.first()).toContainText("$356.4M");
  await expect(items.first()).toContainText("영업이익률");
  await expect(items.first()).toContainText("다음 확인 지표");
  await expect(items.first().locator(".sec-record-footer a")).toHaveAttribute("href",/sec\.gov/);
  await page.locator("#sec-archive-search").fill("zzzzzz");
  await expect(page.locator("#sec-visible-count")).toHaveText("0개 기업");
  await expect(page.locator("#sec-search-empty")).toBeVisible();
  await page.locator('[data-action="hubTab"][data-hub-tab="settings"]').click();
  await expect(page.locator(".hub-audit-details")).toBeVisible();
  await expect(page.locator(".h7-panel")).toBeHidden();
 });
 test("desktop: 52 companies, weekly navigation, private backup round trip",async({page})=>{
  await page.goto(BASE,{waitUntil:"domcontentloaded"});
  await expect(page.locator("#nav [data-page=overview]")).toBeVisible();
  await page.locator("#nav [data-page=companies]").click();
  await expect(page.locator(".r2-company-list")).toBeVisible({timeout:20000});
  await expect(page.locator(".r2-company-row").first()).toBeVisible();
  await page.locator("#nav [data-page=insights]").click();
  await expect(page.locator("#page-crumb")).toHaveText("주간 리서치");
  await page.locator("#nav [data-page=hub]").click();
  await page.locator('[data-action="hubTab"][data-hub-tab="settings"]').click();
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
  await expect(page.locator(".desk-market-details")).toBeVisible({timeout:20000});
  await page.locator(".desk-market-details > summary").click();
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
  await expect(page.locator(".desk-price-details")).toBeVisible({timeout:20000});
  await page.locator(".desk-price-details > summary").click();
  await expect(page.locator(".r2-quote-panel")).toBeVisible();
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
  await page.locator(".desk-price-details > summary").click();
  await expect(page.locator("#r2-tv-frame script")).toHaveCount(0);
  await page.locator("#r2-quote-load").click();
  expect(JSON.parse(await page.locator("#r2-tv-frame script").textContent()).symbols[0][1]).toBe("NASDAQ:WMT|1D");
  await page.locator('.r2-company-row[data-val="KR:950260"]').click();
  await page.locator(".desk-price-details > summary").click();
  await expect(page.locator('.r2-quote-actions a[href="https://finance.yahoo.com/quote/950260.KQ/"]')).toBeVisible();
  await page.locator("#r2-quote-load").click();
  expect(JSON.parse(await page.locator("#r2-tv-frame script").textContent()).symbols[0][1]).toBe("KRX:950260|1D");
 });
 test("company pages: fiscal quarter, matched issues and simple dated private journal",async({page})=>{
  await page.addInitScript(()=>{
   localStorage.setItem("ATELIER_V23_THESIS_LOCAL_ONLY",JSON.stringify({
    "US:LLY":{choice:"강화",riskOverride:"보험 적용 축소",note:"기존 판단 메모",
     hypothesis:"기존 투자 논리",at:"2026-11-06T11:00:00.000Z"}
   }));
  });
  await page.goto(BASE,{waitUntil:"domcontentloaded"});
  await page.locator("#nav [data-page=companies]").click();
  await expect(page.locator(".r2-detail-tabs")).toBeVisible({timeout:20000});
  await expect(page.locator(".r2-detail-tabs button")).toHaveCount(4);
  await expect(page.locator(".r2-detail-tabs")).toContainText("사업 이해");
  await expect(page.locator(".r2-detail-tabs")).toContainText("실적·이슈");
  await expect(page.locator(".r2-detail-tabs")).toContainText("나의 메모");
  await page.locator('.r2-detail-tabs button[data-val="나의 메모"]').click();
  await expect(page.locator(".t4-quickmemo")).toBeVisible();
  await expect(page.locator(".t4-quickmemo")).toContainText("투자 논리 · 초기 검증 질문");
  await page.locator(".t4-legacy-details summary").click();
  await expect(page.locator(".t4-legacy-details")).toContainText("기존 판단 메모");
  await expect(page.locator(".t4-legacy-details")).toContainText("보험 적용 축소");
  await page.locator('[data-a3-quick-thesis="US:LLY"]').fill("제약 신제품 판매 성장 → EPS 개선");
  await page.locator('[data-a3-quick-entry="US:LLY"]').fill("실적 발표 원문을 확인하고 공급능력을 점검");
  await page.locator('[data-a3="memoSave"][data-id="US:LLY"]').click();
  await expect(page.locator(".t4-journal-entry")).toHaveCount(1);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("ATELIER_V23_THESIS_LOCAL_ONLY"))["US:LLY"]);
  expect(saved.choice).toBe("강화");
  expect(saved.riskOverride).toBe("보험 적용 축소");
  expect(saved.note).toBe("기존 판단 메모");
  expect(saved.memoEntries).toHaveLength(1);
  expect(saved.memoEntries[0].text).toContain("실적 발표 원문");
  expect(Number.isFinite(Date.parse(saved.memoEntries[0].at))).toBe(true);
  await page.locator('[data-a3-quick-entry="US:LLY"]').fill("두 번째 메모는 이전 기록을 지우지 않음");
  await page.locator('[data-a3="memoSave"][data-id="US:LLY"]').click();
  await expect(page.locator(".t4-journal-entry")).toHaveCount(2);
  await page.locator('.r2-company-row[data-val="US:RL"]').click();
  await page.locator('.r2-detail-tabs button[data-val="실적·이슈"]').click();
  await expect(page.locator(".a3-sec-panel")).toContainText("FY27 2Q",{timeout:20000});
  await expect(page.locator(".a3-sec-panel")).toContainText("분기 종료 2026-09-26");
  await expect(page.locator(".r2-issues")).toBeVisible();
  await expect(page.locator(".r2-issue-links")).toContainText("Yahoo Finance 뉴스");
  await page.locator('.r2-company-row[data-val="US:ANF"]').click();
  await expect(page.locator(".r2-issues")).toContainText("Abercrombie",{timeout:20000});
  await expect(page.locator(".r2-issue-gist").first()).toBeVisible();
  await expect(page.locator(".r2-issues")).toContainText("원문 확인 요약");
  await expect(page.locator(".r2-issues")).toContainText("19개 상품의 캡슐 컬렉션");
  await expect(page.locator(".r2-issues")).not.toContainText("확정된 주가 상승 원인");
 });
 test("biotech and domestic RSS headlines are issuer-checked and never labeled verified",async({page})=>{
  const feed={generatedAt:"2026-11-10T00:00:00Z",
   reviewStatus:"unverified_headlines_only",
   items:[
    {id:"test-lly",platform:"Google News",ticker:"LLY",issuerId:"US:LLY",
     title:"Eli Lilly research program update - Reuters",
     date:"2026-11-10T00:00:00Z",creator:"Reuters",reviewStatus:"needs_review",
     discoveryMethod:"dated_rss_title_issuer_match",
     url:"https://news.google.com/rss/articles/test-lly"},
    {id:"test-kr",platform:"Google News",ticker:"105560",issuerId:"KR:105560",
     title:"KB금융 이사회 관련 기사 - 연합뉴스",date:"2026-11-10T00:00:00Z",
     creator:"연합뉴스",reviewStatus:"needs_review",
     discoveryMethod:"dated_rss_title_issuer_match",
     url:"https://news.google.com/rss/articles/test-kr"},
    {id:"test-wrong",platform:"Google News",ticker:"LLY",issuerId:"US:UBER",
     title:"Unrelated unverified company story",date:"2026-11-10T00:00:00Z",
     creator:"Other",reviewStatus:"needs_review",
     url:"https://news.google.com/rss/articles/test-wrong"}
   ]};
  await page.route("**/weekly-research.json",route=>route.fulfill({
   status:200,contentType:"application/json",body:JSON.stringify(feed)
  }));
  await page.goto(BASE,{waitUntil:"domcontentloaded"});
  await page.locator("#nav [data-page=companies]").click();
  await page.locator('.r2-detail-tabs button[data-val="실적·이슈"]').click();
  const panel=page.locator(".r2-issues");
  await expect(panel).toContainText("Eli Lilly research program update",{timeout:20000});
  await expect(panel).toContainText("기사 제목 · 본문 미확인");
  await expect(panel.locator(".r2-issue-gist")).toContainText("기사 제목 발췌 · 본문 미확인");
  await expect(panel).not.toContainText("Unrelated unverified company story");
  await page.locator('.r2-company-row[data-val="KR:105560"]').click();
  await expect(page.locator(".r2-issues")).toContainText("KB금융 이사회 관련 기사");
  await expect(page.locator(".r2-issues")).toContainText("기사 제목 · 본문 미확인");
  await expect(page.locator(".r2-issue-gist").first()).toContainText("KB금융 이사회 관련 기사");
 });
 test("mobile 390px: horizontal navigation, companies, hub and backup",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(BASE,{waitUntil:"domcontentloaded"});
  await expect(page.locator("#nav [data-page=companies]")).toBeVisible();
  await expect(page.locator("#mobile-menu")).toBeHidden();
  await page.locator("#nav [data-page=companies]").click();
  await expect(page.locator("#page-crumb")).toHaveText("기업 분석");
  await expect(page.locator(".r2-company-list")).toBeVisible({timeout:20000});
  await page.locator("#nav [data-page=hub]").click();
  await page.locator('[data-action="hubTab"][data-hub-tab="settings"]').click();
  await expect(page.locator("#page-crumb")).toHaveText("자료실");
  const backup=page.locator("details").filter({hasText:"개인 기록 백업·복원"}).first();
  await backup.locator("summary").click();
  await expect(page.locator('[data-personal-backup="import"]')).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
  expect(overflow).toBeFalsy();
 });
});
