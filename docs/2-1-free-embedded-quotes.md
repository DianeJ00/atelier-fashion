# 2-1 무료 종목 주가·등락률·차트 연결

2026-11-09. 기존 52개 기업의 리서치 화면에 무료 공식 임베드 위젯을 도입한 기능입니다.

## 어디에 표시되나

- **기업 분석 → 기업 선택 → 주가·일간 등락률·차트 → '주가·차트 보기'**를 눌러 TradingView의 공식 `Symbol Overview` 위젯을 로드합니다.
- 해당 기업의 **Yahoo Finance** 종목 페이지와 **TradingView** 원문도 버튼 옆에 새 탭 링크로 제공합니다.
- 47개 미국 기업은 현재 상장 거래소인 `NYSE:` 또는 `NASDAQ:` 접두사를 명시합니다. 예: `NYSE:LLY`, 2025년 말 나스닥으로 옮긴 `NASDAQ:WMT`, 2026년 6월 변경된 `NYSE:VSXY`.
- 국내 담당 5개 기업은 `KRX:<6자리>` 심볼을 사용합니다. Yahoo는 KOSDAQ `950260.KQ`, 나머지 KOSPI 기업은 `.KS`를 사용합니다.
- 전체 현황의 52개 기업에 위젯을 전부 실행하지 않습니다. 클릭한 기업 한 건에 대해서만 외부 서비스를 호출해 초기 로딩과 API 부담을 줄입니다.

## 무료 데이터 경계

- 위젯은 **TradingView가 별도로 제공하는 차트·호가/시세 표시**입니다. ATELIER의 Python 프로그램이 주가나 수익률을 수집하거나 보관하지 않습니다.
- Yahoo는 공식 URL로 이동하는 **링크만 제공**합니다. Yahoo HTML 스크래핑, 비공식 API 호출, 주가 데이터 재배포를 하지 않습니다.
- 위젯이 표시하는 거래소, 거래 시간, 시세 지연 여부 및 사용 가능 범위는 TradingView에서 확인해야 합니다. 위젯 접속이 불가능하면 사용자는 외부 링크를 통해 확인할 수 있습니다.
- **시세 제공자 위젯의 종목 가격**과 **ATELIER가 만든 지수 스냅샷**은 정의·기간이 다를 수 있어 수익률을 서로 계산에 섞지 않습니다.
- **자동 급등락 선별은 여전히 미가동**: 47개 기업 중 누가 하루에 ±8% 이상 움직였는지 자동으로 가져오는 기능과는 별도입니다. 공개 파생 수익률의 법적 권한이 확보되기 전 `price-events.json`은 계속 차단 상태를 유지합니다.

## 사용자 정보 및 보안

- 외부 위젯의 스크립트는 **사용자가 명시적으로 '주가·차트 보기'를 클릭할 때만** 불러옵니다.
- TradingView는 위젯 제공을 위해 접속 IP 주소, 사이트 URL, 표시 종목 등을 처리할 수 있습니다. 이 때문에 클릭 전에 사실을 안내합니다. 기기에 저장된 개인 메모나 투자 가설은 외부 위젯에 전송하지 않습니다.
- `atelier-quotes.js`는 허용한 52개 기업의 **정확한 기업 ID·티커·거래소 조합만** 처리합니다. 임의 문자열을 URL 또는 위젯 설정에 전달하지 않습니다.
- TradingView 원본 로고/출처 링크를 유지하며 임의로 시세 소스를 재브랜딩하지 않습니다.

## 구현·검증

- 핵심 파일: `atelier-quotes.js`, `research2.js`, `research2.css`, `index.html`.
- `tests/smoke_quotes.cjs`: 52개 거래소 매핑, 한국 KOSDAQ·KOSPI Yahoo 링크, 올바른 위젯 설정, 클릭 전 외부 로딩 금지, 부적합 심볼 거부.
- `tests/browser.smoke.spec.cjs`: 실제 Chromium에서 상세 진입 전/후 외부 스크립트의 로딩 시점, 미국 NYSE·NASDAQ 및 국내 KRX 심볼 교체를 검증. 서드파티 응답은 가상 스크립트로 격리하므로 TradingView의 **실제 주가 표시는 별도 서비스에 의존**합니다.
- 릴리스 코드 SHA 검증 목록에 `atelier-quotes.js`를 등록해 HTML·JS 게시 버전 불일치를 차단합니다.

## 관련 공식 자료

- 무료 Symbol Overview 위젯: https://www.tradingview.com/widget-docs/widgets/charts/symbol-overview/
- TradingView 제공 임베드 원리: https://www.tradingview.com/widget-docs/getting-started/
- 외부 위젯의 처리 정보: https://www.tradingview.com/widget-docs/faq/general/
- Walmart 나스닥 이전: https://stock.walmart.com/sec-filings/all-sec-filings/content/0000104169-26-000055/wmt-20260131.htm
- VSXY 티커 변경: https://victoriassecret.gcs-web.com/news-releases/news-release-details/victorias-secret-co-change-ticker-symbol-vsxy-marking-next
