# ATELIER 2-2 정식 아키텍처 감사 · 2026-11-06

> 감사 기준: main 브랜치 기준 커밋 2578555dd43968285d8d2c0c0d1f52a218788420. 작업 범위는 소스 코드·생성 데이터·GitHub Actions 이력의 정적 감사이며, 전체 브라우저 성능 실측 및 장애 주입 실험은 포함하지 않았다.
> 결론: GitHub Pages + Python + GitHub Actions의 기본 기술 선택은 유지. 2-3에서는 수집 후 검증, 버전화된 배포, 수집기 분리, 과거 패션 아카이브 분리를 완료한다.

## 1. 확인된 현황

- 운영 자산: Python 수집·가공 스크립트 16개, GitHub Actions 워크플로 2개, 브라우저 공통 접근 계층 atelier-data.js, 기존 패션 화면 index.html 및 독립 분석 모듈.
- 데이터 모델: research-universe.json의 52개 기업 ID가 모두 고유함(미국 47개, 한국 5개). 패션·소비재·바이오·임상·SEC 비교·주간 리서치의 티커는 현재 52개 목록에 연결됨.
- 자료 현황: 2026-11-06 기준 공식 미국 기업 재무 집계 47/47, 임상 관찰 약물 12/12. 개별 주가 0/47 및 국내 DART 0/5는 미연결. ETF 수익률은 2026-11-04 검토 스냅샷.
- GitHub Actions: 최근 push 트리거의 수집·테스트·배포 성공 기록은 존재. 검색 가능한 schedule 트리거 성공 기록은 감사 시점 0건. cron 설정과 실제 매일 운영 성공은 별도로 검증해야 함.

## 2. 실제 데이터 흐름

1. 기초·수동 원본: research-universe.json(기업 식별), consumer-kpi-baseline.json(편집된 운영 KPI), editorial-brief.json(편집 검토), research-pipeline.json(관찰 약물).
2. 외부 자료 수집: collect_official / collect_consumer_official / collect_biotech_official (SEC), collect_clinical_trials (임상), collect_market_relative / collect_stock_relative (허가된 시세), collect_weekly / collect_consumer (기사·영상), collect_korea_dart (국내).
3. 파생 처리: build_sec_trends (재무 비교), build_pipeline_review (약물 등록시험 정보 연결), build_content_brief, build_weekly_brief, build_atelier_weekly (리서치 이벤트), build_data_health (상태 요약).
4. 현재 출판: 1개 GitHub Actions workflow가 위 자료를 생성하고 최상위 JSON을 저장소 main에 커밋한 후, _site 폴더에 파일을 복사해 GitHub Pages로 배포.
5. 브라우저: atelier-data.js가 동일 JSON 요청의 중복을 줄여 주지만, index.html의 과거 패션 스냅샷과 일부 화면 상태는 별도로 남음. 개인 판단은 브라우저 localStorage에 저장.

## 3. 발견 사항과 증거

| ID | 중요도 | 구분 | 발견 및 근거 | 2-3 개선 |
|---|---|---|---|---|
| A01 | P0 | 확인된 설계 결함 | weekly-research.yml의 Python·UI 테스트는 데이터 수집·build_data_health 이전에 실행된다. 새로 생성한 결과물에 대한 공통 검증 게이트가 없다. | 생성 후 스키마·회계기간·참조 무결성 검증을 반드시 통과한 경우에만 커밋·배포 |
| A02 | P0 | 확인된 구조 공백 | 여러 JSON이 각각 generatedAt을 가지나 모든 데이터에 적용되는 releaseId 또는 해시 manifest가 없다. | 검증된 release manifest와 일관된 버전 기준; 배포 중 혼합 읽기 차단 |
| A03 | P1 | 확인된 데이터 보존 위험 | collect_market_relative.py와 collect_stock_relative.py는 API 키·표시 권한이 없으면 비어 있는 상태 결과를 기존 출력 JSON 위에 바로 기록한다. | 수집 시도 상태와 마지막 검증 시세를 분리 보관. 권한 없는 시세는 공개 재표시 금지 |
| A04 | P1 | 확인된 소유권 혼합 | build_pipeline_review.py는 research-pipeline.json을 입력 원본으로 읽으면서 같은 경로에 파생 검증 필드를 다시 쓴다. | 편집 관찰목록(불변 원본)과 생성된 registry overlay를 별도 파일로 분리 |
| A05 | P1 | 확인된 코드 중복 | collect_official, collect_consumer_official, collect_biotech_official 및 build_sec_trends가 SEC 조회와 CIK/공시 매칭을 반복한다. | SEC 공통 클라이언트·CIK 매핑 캐시·동일 실행 내 companyfacts 재사용 |
| A06 | P1 | 확인된 화면 결합 | index.html에 2026-11-03 기존 FASHION_DATA와 다수 화면 함수가 인라인으로 남아 있고, 별도 research2/research3 등과 병존한다. | 과거 분석을 아카이브 모듈로 추출하고 화면 라우팅·공통 UI만 셸에 보유 |
| A07 | P1 | 확인된 검증 구멍 | data-health status=live는 당일 검증된 개별 회사의 모든 재무 항목이 최신이라는 보증이 아니다. 현재 메타데이터는 checkedAt, asOf, periodRange 등으로 부분 분리됨. | 자료 상태·보고기간·수집 성공을 구분한 공통 계약과 수집 후 품질 검사 |
| A08 | P1 | 검증 대기 | 09:00 KST cron과 11:00 KST guard 설정은 있으나 감사 시점 실제 schedule 실행 기록 없음. guard는 데이터 생성 시각을 검사하므로 수동/푸시 수집 성공과 schedule 실행 성공을 구분하지 못할 수 있다. | workflow event·결과·마지막 정상 scheduled run을 별도로 감사하고 실패 통보 |
| A09 | P2 | 성능 위험 | index.start에서 legacy, unified, health 로드를 시작하며 research2.load가 consumer/korea/research3.load를 이어 호출하고 각 로드가 렌더를 트리거한다. | 초기 최소 데이터 + 메뉴별 지연 로드; 화면 갱신 단일 스케줄러 |
| A10 | P2 | 검증 범위 공백 | 기존 smoke 테스트는 주로 Node VM의 모의 document/fetch이며 실제 모바일·외부 TradingView의 화면 동작 검증은 아니다. | 로컬 Pages 미리보기와 실제 브라우저 회귀 테스트를 별도 CI 단계로 도입 |
| A11 | P2 | 로컬 기록 운영 위험 | 개인 메모 및 투자 가설은 별도 localStorage 키에 저장됨. 계정·기기 동기화가 없으며 모든 개인 판단을 하나로 복원하는 절차가 부족하다. | 호환 가능한 JSON 백업·복원과 마이그레이션 테스트; 개인 메모는 공개 저장소로 보내지 않음 |

※ '확인된'은 해당 코드 경로가 존재한다는 뜻이다. 위험이 실제 사용자 장애로 재현됐다는 주장은 아니다.

## 4. 변경하지 않을 사항

- GitHub Pages 기반 정적 배포: 현재 규모와 비용에 적합. 신규 서버·DB 도입은 보류.
- 52개 기업의 기존 US:/KR: 식별자 및 회계기간·GAAP 구분: 하위 호환 유지.
- 적법한 시세 이용 권한과 편집 검토 정책: 자동 추정·무허가 재배포 금지.
- 기존 FASHION_DATA의 역사적 분석과 브라우저 로컬 판단 기록: 삭제·자동 변환 금지. 보존 후 점진적 마이그레이션.

## 5. 목표 데이터 계약

생성 가능한 모든 정량 record에 issuerId(가능한 경우), sourceURL/sourceId, sourcePublishedAt, checkedAt, 관찰 대상 기간(periodStart/periodEnd 또는 asOf), value, unit, accountingBasis/priceConvention, verificationState를 정의. 없는 값은 null로 남기며 임의 보간하지 않는다.
자료 전반을 설명하는 release manifest는 releaseId, builtAt, dataFiles 별 schemaVersion·SHA-256·asOf/periodRange·검증 결과를 포함한다. 브라우저는 동일 releaseId에 속하는 파일 묶음만 사용한다.
품질 상태는 최소 '확인됨 / 과거 확인본 / 일부 자료 / 수집 실패 / 이용 권한 없음'을 분리한다. 수집 성공·정보 최신성·투자 해석 확정 여부를 하나의 live 표시로 합치지 않는다.
출판은 stage → validate → publish 단계로 분리하고 검증 실패 시 마지막 정상 게시 버전을 유지한다.

## 6. 2-3 개편 작업 순서 및 완료 조건

### 2-3A. 배포 게이트와 버전 고정 (최우선)

- 모든 수집·가공이 종료된 뒤 schema, count, ticker/issuerId join, data dates, value/null, output dependencies를 검사.
- 유효한 파일에 공통 releaseId를 부여. manifest와 파일 해시 일치 여부 확인 후에만 공개.
- 무효한 출력은 publish하지 않고 현재 정상 사이트를 유지. 테스트에 정상/누락/오래된/서로 다른 버전 fixture 추가.
- 완료 기준: 생성 후 검증 테스트 통과, 불완전 데이터 배포 0건, 롤백 절차 문서화.

### 2-3B. 데이터 수집기 및 공통 모델

- SEC 호출, CIK 매핑, HTTP 요청 재시도·타임아웃·에러 분류, 파일 IO를 공통 모듈로 분리.
- 각 수집기의 책임은 API 호출, 원자료 정규화, 도메인별 값 판독으로 제한.
- 실패 시 기존 확인본을 명시적 stale 상태로 보존하되 외부 표시 권한이 없는 데이터는 공개에서 제외.
- 완료 기준: 각 수집기의 회귀 fixture 통과, 공통 코드 중복 제거, 새 공시 유무와 수집 시도 구분.

### 2-3C. 편집 원본과 생성 결과 분리

- research-pipeline.json 내 수동 입력 관찰 자산을 별도 seed 파일로 분리하고, 검증된 임상 등록시험 출력은 derived 파일로 생성.
- 소비재 KPI baseline, 편집 기사, 개인 판단 기록도 각자 소유권을 문서화.
- 완료 기준: 자동 수집을 여러 번 실행해도 편집 원본 SHA와 개인 기록이 변하지 않음.

### 2-3D. 프런트엔드 경량화

- 대규모 인라인 FASHION_DATA와 legacy 함수는 역사적 아카이브로 분리하고, 공통 데이터 API·기업 ID·탭 라우팅 사용.
- 메뉴별 필요한 파일만 로드하고 렌더 호출 중복 제거. 기존 UI와 기능이 동일하게 동작하는지 비교.
- 완료 기준: 52개 기업, 모바일 4개 메뉴, 기존 패션 상세, 개인 투자 가설 저장·복원 회귀 통과.

### 2-3E. 운영 자동화 분리

- 수집, 파생 분석, 수집 후 품질 검사, 출판을 명확한 단계로 분리. 자료 출처별 주기와 의존관계를 관리.
- scheduler 이벤트의 실제 실행 이력을 감시. 수동 작업으로 당일 data-health가 갱신된 것과 cron 실행은 별개로 판정.
- 완료 기준: 일정 3회 연속 검증, 실패 시 명확한 오류 사유와 재실행·롤백 경로 확보.

## 7. 2-1 급등락 감지 연결 규격(향후 사용)

- 별도 메뉴를 만들지 않고, 전체 현황에는 상위 3건만, 기업 분석 화면에는 해당 기업 이벤트 상세를 제공.
- 필수 선행 조건: 적법한 개별 종가·전일 종가 및 거래일 기준 정보. 현재 개별 시세 API 미연결이므로 운영 알림 숫자를 만들어 표시하지 않는다.
- 이벤트 필수 요소: issuerId, 기준 거래일, 이전/당일 종가, 1일 변동률, 적용된 감지 규칙, 출처·권한·검증 상태.
- 원인 후보는 가격 이벤트와 독립적으로 공시/IR/임상/뉴스를 연계. 근거 없으면 '원인 미확인', 동기간 사건이 존재해도 '인과관계 미확정' 표시.

## 8. 3단계 진입 게이트

2-3A~E 완료 후 52개 기업 식별·공식 데이터·회계기간·브라우저 기록에 대한 비회귀 검증이 완료돼야 1페이지 브리프 자동 연계 등 3단계 투자 리서치 기능을 증설한다. 2-1의 가격 감지 운영 여부는 시세 라이선스 연결에 별도 종속된다.

---

감사 범위 및 한계: GitHub 소스/배포 이력/JSON 상태에 대한 정적 분석이며 실제 브라우저 기기별 렌더링, 실거래 가격 공급사 계약, 라이브 API 장애 주입 및 장기간 정기 실행 성공률은 미검증이다.