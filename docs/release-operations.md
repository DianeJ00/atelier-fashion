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
