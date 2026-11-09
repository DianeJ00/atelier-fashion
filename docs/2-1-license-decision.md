# 2-1 운영 승인: Twelve Data 공개 시세·파생 데이터 라이선스

기준일: 2026-11-09. 이 문서는 견적이나 서명된 계약서가 **아닙니다**.

## 1. 공급사 선택: 비교 결과

| 선택 | 공식 문서상 확인 | ATELIER 판단 |
| --- | --- | --- |
| Twelve Data 개인용 Basic·Grow·Pro·Ultra | 개발·개인·내부 사용 중심; 외부 데이터 배포 불가 | 공개 급등락률에 **부적합** |
| Twelve Data Venture | 비즈니스 외부 표시 기능, EOD 종가 접근 가능 | **별도 공개 재배포·파생 저장 허용 확인 전 비활성** |
| Twelve Data Enterprise / 별도 계약 | 외부 배포를 포함하는 상위 상품 및 add-on·계약 가능 | 요구 권리 충족 여부 확인 후 견적 비교 |
| 다른 개인용·무료 주가 API | 접근 가능 여부와 외부 표시·저장 권리는 별개 | 법적 근거 없는 무료 API 전환 **금지** |
| 시세 없이 SEC·기업 IR 원문만 노출 | 가격 변동률 자체는 확인 불가 | 가격 이벤트의 대체재가 아니므로 별도 보조 자료로만 사용 |

Twelve Data 사업용 공개 가격표의 Venture는 **월 결제 기준 $499/월부터**, Enterprise는 **$1,099/월부터** 표기되지만 옵션·계약에 따라 달라집니다. 특히 외부 배포·거래소별 권리의 최종 비용은 표준 월 구독료만으로 확정할 수 없습니다. **아직 어떤 상품도 구매하지 않았으며 결제를 권장하지 않습니다.**

공식 근거:
- 외부 표시·재배포 구분: https://support.twelvedata.com/en/articles/5332349-commercial-and-personal-usage
- 미국 주식 외부 재배포 add-on: https://support.twelvedata.com/en/articles/9935903-us-equities-market-data
- EOD 조회 범위: https://support.twelvedata.com/en/articles/12682324-end-of-day-eod-pricing-market-data
- 사업용 가격표: https://twelvedata.com/pricing-business
- 계약상 파생 데이터·외부 제공: https://twelvedata.com/terms
- 공급사 영업 문의: https://twelvedata.com/contact · sales@twelvedata.com

## 2. ATELIER에 필요한 권리 범위

- 공개 무료 읽기 전용 **https://dianej00.github.io/atelier-fashion/** 서비스.
- 미국 상장 기업 **47개**, 비교 ETF **6개**의 일간 EOD 가격 데이터 수집. 실시간·장중 알림 필요 없음.
- 원시 OHLCV는 GitHub 저장소나 사이트에 올리지 않고 임시 메모리에서만 계산.
- 사이트에 필요한 정보: **일간 배당·분할 조정 수익률**, 20거래일 평균 절대 일간 변동률 대비 배수, 일간 거래량/과거 20일 평균 거래량 배수, 날짜 및 공급사 귀속 표시.
- 현재는 **급등락 후보 최대 3건**만 첫 화면에 표시. 해당 기업 상세에서도 공개 링크·파생 지표를 표시.
- `price-events.json` 및 GitHub 커밋·GitHub Pages 배포 아티팩트가 과거 버전을 남기므로 **공개 파생 데이터 보관과 재배포 및 계약 종료 후 처리** 명시 필요.
- 일간 변동률과 배수를 연속 저장했을 때 원래 가격을 간접 복원할 수 있는지, 파생 데이터로 허용되는 범위인지 확인.
- 출처 링크와 데이터 지연·공식 미국 거래소별 조건 포함.

## 3. 그대로 보낼 수 있는 문의 이메일 (영문)

**To:** sales@twelvedata.com  
**Subject:** Licensing request — EOD derived US equity alerts on a public GitHub Pages research site

Hello Twelve Data Sales and Licensing Team,

I am evaluating a licensed end-of-day (EOD) data feed for ATELIER, a public, read-only equity research website at https://dianej00.github.io/atelier-fashion/.

The site tracks approximately 47 U.S.-listed companies and six benchmark ETFs. We need one daily EOD pull of corporate-action-adjusted closes and, where available, daily volume. The raw OHLCV would be processed in memory and not published. The website would show at most three exceptional daily move alerts, plus issuer-specific derived metrics such as daily adjusted return, deviation from the previous 20-session average absolute return, and a 20-session volume multiple. Each alert would link to separately verified company IR or SEC announcements and expressly avoid claiming causality.

Could you confirm in writing:

1. Which plan, U.S. Equities add-on, exchange permissions, and/or redistribution agreement authorize public display of these derived EOD metrics on this exact website?
2. Whether the derived daily return and volume/volatility multiples qualify as non-reconstructible derived data and may be shown publicly without displaying raw prices.
3. Whether we may retain the derived alert records in a **public GitHub repository, Git commit history and GitHub Pages deployment artifacts**, including any required expiry, deletion, or post-cancellation restrictions.
4. The appropriate attribution text and link, publication delay, EOD adjustment methodology, permissible historical lookback, and API rate/credit limits for 53 symbols per day.
5. An itemized monthly and annual quote including all relevant rights and exchange fees, and whether there is a compliant limited pilot.

Please distinguish API access, external display rights, redistribution rights, and publicly stored derived data rights. We will not enable public numeric alerts until the permitted scope is documented.

Thank you.

## 4. 운영 승인 이후 GitHub Secrets / Variables

**실제 계약·서면 허가가 확인된 경우에만** 다음을 설정. 문서 원본·API 키를 코드나 채팅에 올리지 않음.

| GitHub 설정 | 값 | 보관 |
| --- | --- | --- |
| `TWELVEDATA_API_KEY` | 공급사 API 키 | Secret |
| `MARKET_DATA_DISPLAY_OK` | `true` | Variable |
| `MARKET_DERIVED_PUBLIC_OK` | `true` | Variable |
| `MARKET_DERIVED_GIT_STORAGE_OK` | `true` | Variable |
| `MARKET_DERIVED_LICENSE_REF` | 서면 권리 확인 문서의 내부 참조 ID | Secret |
| `MARKET_DERIVED_LICENSE_SCOPE` | `US_EOD_DERIVED_PUBLIC_GIT` | Variable |
| `MARKET_DERIVED_LICENSE_VALID_FROM` | `YYYY-MM-DD` | Variable |
| `MARKET_DERIVED_LICENSE_VALID_UNTIL` | `YYYY-MM-DD` | Variable |

`scripts/market_rights.py`는 승인 범위·유효 기간·1년 이내 검토 여부를 검증합니다. **환경 변수와 참조 ID는 법적 권한의 증명서가 아닙니다.** 실제 문서 보관·범위 확인은 운영자 책임이며, 주가 재배포 관련 권리가 철회되면 사용 허용 변수도 즉시 꺼야 합니다.

```bash
python scripts/market_rights.py
```

비밀키·참조 ID의 내용은 진단 로그에 표시하지 않습니다. 결과가 `key_missing`, `license_expired`, `license_scope_unconfirmed` 등이라면 새 공개 급등락 이벤트는 차단됩니다.

## 5. 다음 단계

서면 승인·API 권한 확보 후, 같은 거래일에 47개 기업+6개 ETF를 실제로 가져올 수 있는지 비공개 환경에서 측정하고, `docs/2-1-private-audit.md`의 업종별 검증을 실시합니다. 샘플이 없는데 실제 오탐률이나 적중률을 발표하지 않습니다.
