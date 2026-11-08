# 2-1 · 비공개 급등락 검증 및 업종별 품질 평가

이 도구는 **ATELIER 공개 사이트와 독립된 로컬 전용 진단기**입니다. 현재 공급사 권한 미연결 상태에서도 테스트할 수 있지만, 실제 주가에 대한 업종별 정확도가 이미 측정됐다는 의미는 아닙니다.

## 용도 및 데이터 경계
- `scripts/audit_price_alerts.py`: 승인받아 로컬에 보관 중인 미국 기업의 배당·분할 조정 종가 자료를 **표준 입력 JSON으로만** 수신.
- API 연결, 데이터 스크래핑, 서버 전송, 파일 생성, GitHub 저장 **없음**. 리서치 자료가 외부 저장소·AI 로그에 들어가지 않도록 **개인 작업 컴퓨터에서만** 사용.
- 기업/거래일/가격/종목별 변동률은 출력하지 않음. 세션 수, 검증률, 업종별 후보 건수, 연구원 평가 분포의 집계값만 표준 출력.
- 공급사 계약이 내부 분석까지 금지하는 경우에는 **실제 데이터로도 사용하지 않음**. 테스트에서 사용한 가상 종가는 실제 시세가 아님.

## 사용 절차
1. 공급 계약의 내부 분석·캐시 허용 범위를 확인. `priceBasis`는 `dividend_split_adjusted_close`.
2. 로컬 파일을 만들어 다음과 같은 구조로 입력하되, **실제 사용 시 47개 기업을 동일 거래일로 검증**합니다. 아래 숫자는 설명용 가상 데이터입니다.

```json
{
  "schemaVersion": 1,
  "priceBasis": "dividend_split_adjusted_close",
  "sessions": [
    {
      "tradeDate": "2026-11-06",
      "observations": [
        {
          "issuerId": "US:LLY",
          "ticker": "LLY",
          "tradeDate": "2026-11-06",
          "previousTradeDate": "2026-11-05",
          "close": 112,
          "previousClose": 100,
          "volatility20dPct": 4,
          "priceBasis": "dividend_split_adjusted_close",
          "source": {"provider": "fictional-example", "url": "https://example.org/fictional"}
        }
      ]
    }
  ],
  "labels": [
    {"issuerId": "US:LLY", "tradeDate": "2026-11-06", "decision": "uncertain"}
  ],
  "evidence": []
}
```

3. 개인 컴퓨터에서 `python scripts/audit_price_alerts.py < /private/authorized_sessions.json` 실행. **입력 파일은 저장소 밖에 둡니다.**
4. `actionable`(분석 가치가 있었음), `noise`(추가 검토 가치가 낮음), `uncertain`(판단 유보) 중 사람이 직접 분류. 이는 주가 변동의 원인을 증명하는 것이 아님.
5. 초기 조건인 **일간 ±8% 및 최근 변동폭 2배**의 업종별 후보 빈도와 검토 결과를 평가. 단순히 관련 공시가 없다고 `noise`로 판정하지 않습니다.

## 집계 결과 해석
- `issuerDaysExpected` / `issuerDaysObserved`: 47개 종목 × 거래일 중 실제 검증된 관측일 수. 결측은 '변동 없음'으로 간주하지 않음.
- `incompleteSessions`: 당일 47개 전체가 검증되지 않은 거래일 수. 이런 날의 상위 3건은 전체 종목 순위라고 볼 수 없음.
- `candidateCount`: 가격 변동률과 변동성 기준을 **모두** 충족한 후보 건수.
- `sessionsMoreThanThreeCandidates`: 전체 현황 최대 3건 제한으로 일부 후보가 보이지 않는 거래일 수.
- `candidatesWithEvidence`: 근처 일자에 확인된 공식 원문/검증 뉴스가 발견된 후보 수. **인과관계 확인 비율이 아님**.
- `reviewedActionable`, `reviewedNoise`, `reviewedUncertain`: 사람의 연구 가치 판단.
- `nonActionableAmongReviewedPct`: 보류를 제외하고 실제 가치 판단이 내려진 후보에서 `noise`로 평가된 비중. **10건 미만은 null**이며, 이 비율도 '주가 변동의 거짓 원인률'이나 통계적 위양성률로 해석하지 않음.
- 업종별 분모 역시 10건 미만이면 `insufficient_reviewed_sample`. 각 업종의 모집단·주가 변동성·분할·실적 발표 빈도가 달라 단기간 단순 비교를 지양.

## 운영 진입 조건
1. Twelve Data와 **외부 사용자 표시, 파생 변화율, GitHub Pages와 공개 커밋 보관, 거래소별 권리**에 대해 서면으로 조건 확인.
2. 47개 종목 및 6개 ETF의 EOD 자료를 같은 거래일 기준으로 읽고, 장기 주가·거래량 누락을 분리 측정.
3. 모의 데이터가 아닌 **적법한 실측 표본**을 대상으로 업종별 후보 빈도·수동 평가 자료가 충분히 쌓인 뒤 임계값 재평가.
4. 표본 부족·검증 실패를 숨기지 않고 사이트는 `permission_required` 또는 `partial` 유지.

참고: https://support.twelvedata.com/en/articles/5332349-commercial-and-personal-usage, https://support.twelvedata.com/en/articles/9935903-us-equities-market-data, https://twelvedata.com/terms
