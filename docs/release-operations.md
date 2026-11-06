# ATELIER 2-3 운영·배포 구조

작성 기준: 2026-11-06. GitHub Pages + Python + GitHub Actions를 유지합니다.

## 배포 상태 전이

1. `collect-and-build`: 코드·화면 및 도메인 테스트 → 데이터 출처 수집(예약 실행·수동 요청·[research refresh]만) → 후처리 → `validate_release.py build` → 생성 파일과 manifest 커밋.
2. 단계가 성공하면 `snapshot.outputs.sha`에 **검증에 성공한 정확한 Git 커밋**을 기록합니다.
3. `validate-and-package`: 해당 커밋에서 체크아웃 → `validate_release.py check` → `prepare_site.py` → `validate_release.py verify-site` → GitHub Pages artifact 업로드.
4. `deploy`: 위 단계가 성공한 경우에만 GitHub Pages 게시. 하나라도 실패하면 현재 공개 중인 마지막 성공 배포를 유지합니다.

## 데이터 무결성

- `data-manifest.json`은 17개 제공 JSON의 해시, 기준일, 고유 releaseId를 기록합니다.
- 사이트의 데이터 로더는 `releases/<releaseId>/<file>`만 조회합니다. 해당 파일이 사라지면 다른 릴리스 파일을 몰래 섞지 않습니다.
- 사람이 편집한 바이오 약물 관찰 목록은 `research-pipeline-seed.json`, 자동 임상 연결 결과는 `research-pipeline.json`입니다. 자동 수집기는 seed를 수정하지 않습니다.
- `.sec-cache`는 30분간 유효한 공용 SEC JSON을 같은 CI 작업 공간 내에서 재사용하는 캐시이며 배포하지 않습니다.
- 새 실적·임상 수집 실패 시 기존 정상 자료를 보존할 수 있지만, `stale_cached`를 최신 결과로 표시하지 않습니다.

## 운영 점검

- 본 수집 예약: 매일 오전 9시 KST 요청. GitHub Actions 예약 시작은 지연될 수 있습니다.
- 독립 감시 예약: 매일 오후 5시 KST 요청. `check_daily_freshness.py --verify-schedule`은 필수 SEC·임상 데이터의 **당일 수집 기록**과 GitHub Actions `event=schedule`의 **당일 성공 기록**을 함께 검사합니다. 일반 push 성공은 정기 실행으로 인정하지 않습니다.
- 경고 발생 시: 먼저 원본 workflow run 및 guard run의 실패 단계 확인 → 해당 API 출처·키·사용 권한 확인 → 원인을 해결한 뒤 수동 재실행. 시세 미연결·DART 미연결은 라이선스/키 문제이며 숫자를 추정하여 메우지 않습니다.

## 복구 / 롤백

1. **수집 실패·출처 오류:** manifest 생성 이전에 중단. 사이트는 이전 성공 배포를 유지합니다.
2. **manifest·JSON 무결성 실패:** 데이터 커밋·페이지 게시를 금지합니다. `validate_release.py build`와 `check` 출력의 파일/회사/날짜 오류부터 수정합니다.
3. **패키징 또는 Pages 게시 실패:** 기존 성공 배포가 유지됩니다. 해당 검증된 커밋으로 같은 workflow를 재실행할 수 있습니다.
4. **검증을 통과했지만 해석 오류가 발견된 데이터:** 문제가 된 데이터 생성 커밋과 `data-manifest.json`을 **함께** 정상 버전으로 되돌리는 새 되돌리기 커밋을 만들고 전체 검사·배포를 수행합니다. `main`에 force push하지 않습니다.
5. **열려 있던 브라우저 탭의 옛 releaseId 경로가 사라진 경우:** 새 페이지 로드로 최신 릴리스에 연결합니다. 다른 버전 자료를 섞어 표시하지 않는 것이 의도된 동작입니다.

## 배포 전 완료 기준

- 모든 Node·Python 테스트 통과, 자료 생성 후 검증 통과, manifest/파일 해시 동일, 결합된 52개 기업과 12개 바이오 seed 정합성 확인.
- 실제 GitHub Actions 예약 실행이 연속 성공했는지는 독립 guard로 추적. 단발성 수동 실행 성공으로 장기 운영을 보증하지 않습니다.
- 실제 모바일 브라우저 동작·개인 로컬 메모 복구·상용 시세 공급사의 표시 권한은 별도 운영 검증 대상입니다.

## 2-3D 개인 기록 백업·성능 검증

- 전체 현황에서는 기업 목록·ETF·관련 시장 자료와 주간 이벤트만 우선 불러오며, 기업 상세 진입 전에는 임상 등록정보·관찰 약물 원자료를 가져오지 않습니다. 소비재·국내 기업별 자료는 기업 분석 메뉴에서, 과거 패션의 추가 공시·뉴스 JSON은 주간 리서치나 자료실에서 필요할 때 불러옵니다.
- 자료실 → **개인 기록 백업·복원**을 펼치면 `atelierNotes` 및 `ATELIER_V23_THESIS_LOCAL_ONLY` 두 개 브라우저 저장소를 하나의 `atelier-private-backup-v1` JSON으로 다운로드할 수 있습니다. 백업 파일에는 민감한 개인 판단이 포함되므로 공개 저장소·공용 공유 폴더에 올리지 마세요.
- 복원은 사용자가 직접 고른 2MB 이하 JSON을 검사하고, **덮어쓰기 확인**을 받은 후 두 저장소를 한 번에 교체합니다. 두 번째 저장 단계에서 실패하면 기존 값을 복구하도록 설계했습니다. 복원 후 사이트가 새로고침됩니다. 별도 클라우드로 업로드하거나 사용자 계정을 만들지 않습니다.
- 브라우저 기반 테스트는 별도 `browser-smoke.yml`에서 실제 Chromium으로 데스크톱·390px 모바일의 메뉴 이동과 JSON 백업/복원 기본 동선을 검사합니다. GitHub Pages 배포와 독립이므로 브라우저 도구 설치 장애가 검증된 데이터 게시를 막지 않습니다.

## 2-3E 실패 주입 테스트 및 수동 복구 연습

- `tests/test_release_rollback.py`: 정상 버전 출력물을 로컬 임시 디렉터리에 생성한 다음, 기업 식별자를 잘못 바꾸거나 유효한 JSON에 공백을 추가해 해시 불일치를 발생시킵니다. `validate_release.py build/check` 및 `prepare_site.py`가 실패하고 **이미 게시된 정상 버전 파일이 변하지 않음**을 검사합니다.
- 오류를 수정하면 이전 데이터 파일·해시 서명을 통해 기존 정상 버전을 검증할 수 있음을 확인합니다. 이 테스트는 운영 사이트에 강제로 잘못된 데이터를 게시하지 않으며, GitHub Pages 외부 장애/실제 배포 되돌리기까지 전부 시뮬레이션하지는 않습니다.
- 정기 예약 실행은 실제 `event=schedule` 성공을 따로 계산합니다. 예약 실행의 연속 3회 성공 확인은 시간이 지나야 검증할 수 있는 운영 항목이므로 단발성 성공으로 완료 처리하지 않습니다.

## 2-3B 일시적 시장 데이터 장애·표시 권한 처리

- 시세 수집 실패를 확인할 때는 `market-relative.json`·`stock-relative.json`의 `lastAttempt.status`와 `lastVerified.asOf`를 각각 읽습니다. `generatedAt`은 수집 **시도** 시각이고 실제 마지막 확인일은 `lastVerified.asOf`입니다.
- 인증키 또는 외부 표시 허용이 없어졌다면 공개 숫자는 빈 값으로 교체하고 메타데이터만 보존합니다. 임의의 과거 수익률을 신규 수치처럼 되살리지 않습니다.
- 둘 다 유효하지만 공급사 접속이 실패하면 정확히 날짜가 일치하는 이전 검증본에 한해 `stale_cached`를 유지합니다. 사이트에 과거 확인본 경고가 나타나며 새 시세와 혼합하지 않습니다.
- 외부 제공사의 이용권이 사후 철회된 경우, 공개 저장소의 **과거 커밋 자체에 남은 데이터**는 이 자동화가 소급 삭제할 수 없습니다. 해당 상황에서는 제공사의 권리 조건을 확인하고 이전 Git 이력·아티팩트에 대한 별도 정리 절차를 검토해야 합니다.
- 검증: `python -m unittest tests.test_source_retention -v`, 전체 Python 테스트, Node UI 테스트 및 SHA-256 릴리스 게이트.

## 경계조건 안정화 · 배포 경합과 브라우저 버전 (2026-11-06)

- 수집한 JSON을 원격 main 위에 강제로 다시 올리는 `git reset --mixed origin/main` 동작을 제거했습니다. `scripts/revision_guard.py`가 수집 시작 코드 커밋과 최신 main SHA가 같을 때만 결과를 커밋하도록 검증하고, `git push` 자체의 fast-forward 보호도 유지합니다.
- `collect-and-build`, `validate-and-package`, `deploy`의 각각 경계에서 검증된 커밋과 실제 main SHA를 비교합니다. 다른 수정이 앞질렀다면 오래된 작업은 중단하고 최신 커밋을 대상으로 새 실행이 검증하도록 합니다. GitHub Pages의 실제 게시 요청과 main 업데이트 간에 원자적 트랜잭션을 보장하는 것은 아니므로, 모든 순간의 동시 변경을 100% 막는 분산 락으로 해석해서는 안 됩니다.
- `data-manifest.json`의 17개 금융 데이터 SHA 외에, 실제 공개 HTML·JS·CSS 전체의 SHA를 결합한 `site-version.json`의 `buildId`를 사용합니다. 코드만 수정해도 buildId가 변경되며, 패키징 검사에서 소스·HTML·자산 SHA가 전부 일치해야 게시됩니다.
- 오래 열린 브라우저가 과거 `releases/<releaseId>/` 파일을 가져오지 못하거나 탭을 다시 활성화했을 때 현재 빌드가 다르면, 다른 버전의 자료를 섞지 않고 **'새 버전 · 새로고침'** 안내를 표시합니다. 로컬 개인 판단 메모는 그대로 보존됩니다.
- 새로 추가한 검사: 동일 Git SHA 게이트의 충돌 주입 단위 테스트, 코드만 바뀐 빌드 ID 변경 테스트, 오래된 브라우저의 404/버전 변경 안내 테스트, 실제 Chromium 페이지 업데이트 알림 검사. 무허가 시세 재배포 금지와 기존 수집 후 검증도 유지됩니다.
