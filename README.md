# ATELIER 주간 패션 리서치 · GitHub에 올리는 법

이 압축파일의 **안쪽 파일과 폴더를 GitHub 저장소 최상위 위치에 업로드**하세요. 압축파일 자체나 별도의 상위 폴더를 업로드하면 사이트가 동작하지 않을 수 있습니다.

## 0. 들어 있는 파일

```
index.html
weekly-research.json
README.md
scripts/
  collect_weekly.py
.github/
  workflows/
    weekly-research.yml
```

`index.html`은 사이트 첫 화면이며 저장소의 가장 바깥(루트)에 있어야 합니다. `.github`는 숨김 폴더이므로 PC에서 보이지 않으면 숨김 파일 표시를 켜세요.

## 1. GitHub 저장소 만들기

1. https://github.com/new 로 이동합니다.
2. Repository name: `atelier-fashion` / Visibility: **Public**.
3. README 및 .gitignore, License 자동 생성은 **선택하지 않습니다**. `Create repository`를 누릅니다.

## 2. 업로드

1. 이 ZIP을 PC에서 압축 해제합니다.
2. 압축 해제한 폴더 **안에 있는 파일 3개와 폴더 2개**를 확인합니다.
3. 새 저장소의 `uploading an existing file` 또는 `Add file → Upload files`를 엽니다.
4. 위 파일/폴더를 한꺼번에 끌어놓습니다. **업로드 목록에** `index.html`, `scripts/collect_weekly.py`, `.github/workflows/weekly-research.yml`이 각각 보이는지 확인합니다.
5. `Commit changes`로 저장합니다. `main` 브랜치에 저장되도록 합니다.

## 3. 사이트 게시 설정

1. `Settings → Pages`로 이동합니다.
2. `Build and deployment → Source: GitHub Actions`를 선택합니다. (이 패키지는 별도 GitHub Actions 배포 작업 포함)
3. `Actions → ATELIER weekly research and site → Run workflow → Run workflow`를 실행합니다. 첫 업로드 직후 자동 실행이 실패하더라도 Pages를 설정한 뒤 다시 실행하면 됩니다.
4. 실행 결과가 녹색 체크로 완료되면 `Settings → Pages`에서 **Visit site**로 사이트를 엽니다.
5. 게시 주소의 예시는 `https://본인아이디.github.io/atelier-fashion/`입니다.

**주간 재게시 주의:** GitHub Actions가 `GITHUB_TOKEN`으로 커밋한 내용은 branch-source Pages를 자동 재배포하지 않을 수 있으므로, `Deploy from a branch` 대신 **GitHub Actions**를 선택하세요. 주간 수집과 사이트 게시는 하나의 워크플로에서 이어서 실행합니다.

## 4. 권한 문제가 발생하면

Actions 로그에 `Permission denied` 또는 HTTP 403이 뜨면 `Settings → Actions → General → Workflow permissions`에서 쓰기 권한이 허용되는지 확인합니다. 공개 저장소에는 비밀키를 파일로 업로드하지 마세요.

## 5. 주간 수집 기능의 정확한 범위

- 매주 **월요일 오전 9시(한국 시간)** GitHub Actions가 YouTube 일부 공개 채널 RSS와 Google News 공개 RSS를 읽고 새 제목·날짜·링크를 `weekly-research.json`에 반영한 뒤 **사이트도 배포**합니다.
- 플랫폼별 접근 제한, 원문 삭제, RSS 장애에 따라 자료가 0건일 수 있습니다. 확인되지 않은 원문 제목을 소비자 의견이나 실적 증거로 취급하지 않습니다.
- **사이트의 기존 2026-11-04 주간 투자 요약·실적·주가·가설은 자동으로 새 분석으로 바뀌지 않습니다.** RSS 원문 목록만 자동 갱신합니다.
- YouTube 게시물의 자막·댓글 분석, TikTok·Instagram 자동 수집, SEC 정량 실적 갱신, 실시간 주가는 이 패키지에 포함되어 있지 않습니다.
- 공개 RSS 수집에 별도 API 키는 필요하지 않습니다. `GITHUB_TOKEN`은 GitHub가 자동 제공하며 공유할 필요가 없습니다.

기본 자료는 내부 메모·스냅샷으로, 실제 투자 판단을 위해서는 공식 공시와 원문을 재확인해야 합니다.


## 6. 2026-11-04 개선: 자동 주간 요약

- **첫 화면**에는 자동 수집된 기사·영상 제목의 주제별 건수와 기업별 확인 지표가 표시됩니다.
- **트렌드·소비자 → 시장 트렌드**에는 이번 주 새로 발견된 패션 영상·전문매체 기사와 채널별 연결 상태가 표시됩니다.
- 주간 원본 파일인 weekly-research.json에 weeklyDigest, sourceHealth, items, errors가 저장됩니다.
- 주제 분류는 **기사·영상 제목에 포함된 키워드** 기준입니다. 영상 자막, 댓글, 소비자 감정, 실제 매출을 분석하는 기능은 아닙니다.
- 이전 수집 이후 새 항목은 이전 파일에 없던 URL 수이며, 패션 유행의 상승률이 아닙니다.
- 기존 검토 자료와 투자 가설은 **2026-11-04 편집본**으로 표시되고 자동으로 최신 실적이 되지는 않습니다.

### YouTube 공식 API 연결: 선택 사항

YouTube RSS 접속이 GitHub Actions에서 실패할 수 있습니다. 공식 API를 연결하면 YouTube 채널의 공개 영상 제목을 확인할 수 있습니다.

1. Google Cloud 프로젝트에서 **YouTube Data API v3**를 활성화하고 API 키를 발급합니다.
2. GitHub 저장소의 **Settings → Secrets and variables → Actions → New repository secret** 메뉴에 들어갑니다.
3. 이름을 **YOUTUBE_API_KEY**로 입력하고 값에 API 키를 저장합니다.
4. **Actions → ATELIER weekly research and site → Run workflow**로 새 수집을 실행합니다.
5. 사이트 **트렌드·소비자 → 새로 수집한 자료**에서 실제 채널 연결 상태를 확인합니다.

**비밀키를 채팅, 코드, README, 사이트 HTML에 입력하지 마세요.** API에는 사용량 제한이 있으며 핸들 변경·권한 문제로 채널 연결이 실패할 수 있습니다. API 키가 없어도 기존 RSS 수집을 시도하지만 YouTube가 0건일 수 있습니다.

TikTok·Instagram·Reddit은 **수동 검토용 공개 링크**만 제공합니다. 승인되지 않은 자동 스크래핑으로 게시물이나 댓글을 수집하지 않습니다.

### 해석 범위

- 자동: 원문 제목, 게시일, URL, 주제별 제목 수, 기업별 제목 수, 채널 수집 상태
- 수동 검증: 패션 트렌드의 확산 강도, 소비자 반응의 방향, 기사·영상 내용, 기업 최신 실적, 주가·투자 가설

이 주간 요약은 **리서치 검증 우선순위를 정하는 도구**이며, 검증 완료된 주간 투자 리포트가 아닙니다.

## 7. 공식 SEC 실적·소비자 댓글 표본 연동

**새 파일**
- `official-financials.json`: SEC 최신 공시·10-Q 동일 제출번호의 약 3개월 US-GAAP 분기 수치, 원문 링크, 공시·조회 상태
- `consumer-samples.json`: 승인된 YouTube Data API 사용 시 공개 최상위 댓글 일부의 주제 키워드 집계 (작성자·원문 미저장)
- `weekly-investment.json`: 공식 매출/공시, 새 원문, 소비자 표본 상태와 기업별 다음 검증 지표를 구분한 주간 점검표

**주간 수집:** 월요일 오전 9시 KST. 수동 재수집은 GitHub Actions에서 `ATELIER weekly research and site → Run workflow`.
코드만 수정할 때는 배포만 하고 데이터를 불필요하게 재수집하지 않습니다.

**SEC 접근:** 별도 키 불필요. SEC Fair Access 정책에 맞춰 GitHub `Settings → Secrets and variables → Actions`에서 `SEC_USER_AGENT`를 회사/사용자 식별자와 연락 가능한 이메일을 포함한 값으로 설정해야 SEC 자동 조회가 시작됩니다. SEC의 자동 접근 정책에 따라 연락 이메일이 없는 상태에서는 수집을 수행하지 않습니다. 비밀값을 HTML이나 채팅에 작성하지 마세요. SEC API가 차단되거나 GAAP 표준 수치가 없다면 '조회 불가/확인 필요'로 표시합니다.

**소비자 댓글 주제 집계:** 공식 Google Cloud YouTube Data API v3의 `YOUTUBE_API_KEY`를 GitHub Actions secret에 저장해야만 활성화됩니다. 최대 5개 영상의 최신 최상위 공개 댓글 각 60개까지 대상으로 가격·핏·품질·디자인·구매 단어 언급 건수만 계산합니다. 댓글 내용과 작성자 정보는 저장하지 않습니다. 이는 대표성 있는 소비자 조사·긍부정 감성 분석·구매 증빙이 아닙니다.

**주의:** 기존 브랜드별 KPI, 주가, 투자 가설은 별도 스냅샷입니다. 최신 10-Q의 공시 본문과 GAAP 수치를 검증하더라도 공식 브랜드별 성장·조정 실적·미래 가이던스가 자동으로 확정되는 것은 아닙니다. TikTok·Instagram·Reddit 댓글은 승인된 권한 없이 수집하지 않습니다.

## 8. 컴팩트 주간 브리프 · 근거 3선

**사이트 첫 화면:** 투자 관련 원문을 최대 3개만 보여줍니다. 각 항목에 **공식 공시 / 댓글 표본·미검증 / 기사 제목·미검증** 상태, 날짜, 관련 기업 및 실적 확인 지표, 원문 링크를 붙입니다. 나머지 RSS 수집 내역은 펼쳐보기로 접어둡니다. 3개가 확보되지 않으면 억지로 채우지 않습니다.

**기업 상세:** SEC 10-Q와 일치하는 기간별 GAAP 매출을 확인한 경우만 수치 및 기간을 표시합니다. 이전에 편집한 기업 실적 설명·시세는 자동 최신화되지 않습니다.

**상품 리뷰 댓글:** GitHub Secret `YOUTUBE_API_KEY`가 있을 때 YouTube 공식 API로 Coach, Ralph Lauren, Old Navy, Levi's, Free People에 관련된 최근 상품 리뷰 **후보**를 검색합니다. 영상당 공개 최상위 댓글 최대 60개에서 가격·핏·품질·디자인·구매 단어 언급 건수만 남깁니다. 리뷰 영상의 실제 독립성·협찬 여부를 확인하지 않았으며, 단어 출현을 긍정·부정·매출 변화로 바꿔 쓰지 않습니다. API Search 약 5회/실행으로 일반적으로 **약 500 쿼터 단위** 사용합니다. 개인정보와 댓글 원문은 저장하지 않습니다.

**품질 검사:** GitHub Actions 게시 전에 `python -m unittest discover -s tests -p 'test_*.py' -v`를 실행합니다. 회계기간 불일치, 누적 매출의 분기 오인, 10-K/10-Q 혼동, 주가 페이지의 잘못된 원문 분류를 막는 테스트를 포함합니다.

**수집 상태 확인:** 마지막 정상 GitHub Actions 실행과 데이터 생성일을 각각 확인하세요. 워크플로 실행에 초록색 체크가 나와도 SEC 또는 YouTube API 권한이 없으면 자동 요약에 **설정 필요**로 나옵니다. 새 원문이 없을 경우 이전 수집 영상은 기간 내로만 보존하고, 과거 영상을 신규 신호로 표시하지 않습니다.

마지막으로: **자동 주간 브리프는 투자 판단에 필요한 검증 순서를 제시하는 작업표**입니다. 최신 공식 실적과 소비자 반응을 모두 교차 확인한 분석가 리포트로 오인하면 안 됩니다.

## 9. 데이터 수집 성공과 배포 성공 구분

- GitHub Actions의 초록색 체크는 **워크플로 실행 및 웹사이트 게시 성공**을 뜻하며, 외부 API 수집 성공을 보장하지 않습니다.
- **공식 SEC 확인:** 사이트에 공개되는 `official-financials.json`의 `sourceStatus`가 `ok` 또는 `partial`이고, 해당 기업 `status=quarter_verified`인지 확인합니다. `configuration_required`면 `SEC_USER_AGENT` 설정이 해당 작업에 적용되지 않은 것입니다.
- **YouTube 댓글 확인:** `consumer-samples.json`의 `status=sampled`(또는 `sampled_with_errors`)와 `videos` 항목을 확인합니다. `key_required`라면 `YOUTUBE_API_KEY`가 작업에 전달되지 않았습니다.
- 비밀값은 저장소의 **Settings → Secrets and variables → Actions → Repository secrets**에 등록해야 합니다. 페이지 게시용 `github-pages` 환경의 Environment secrets에만 넣으면 이 파이프라인의 수집 작업에는 전달되지 않을 수 있습니다.
- 설정값은 사용자 본인만 관리하고, 채팅이나 공개 코드에 붙여넣지 마세요. 변경 후 **Actions → ATELIER weekly research and site → Run workflow**를 다시 실행해 소스별 상태를 확인합니다.

## 10. 원문 내용까지 정리한 주간 브리프

이번 개편부터 첫 화면에는 단순 제목·수집 건수 대신 **관찰 내용 → 투자 연결 → 실적 검증 → 해석 한계**를 하나로 묶은 한국어 요약 카드(3~5개)를 표시합니다. 자료별 **출처, 날짜, 검증 상태, 관련 기업, 원문 링크**를 함께 표시합니다.

- `editorial-brief.json`: 원문을 직접 대조해 작성한 초기 편집본 (2026-11-05: Lyst 3Q26, Capri FY27 2Q, Retail Dive Old Navy). **작성일과 자료 기준일을 명시**하며 매주 자동 수정됐다고 표시하지 않습니다.
- `scripts/build_content_brief.py`: 직접 연결된 공개 RSS 기사를 선별하고, 원문 본문을 접근 허용 범위에서만 읽은 경우 요약합니다. 현재 자동 수집 경로는 Retail Dive 공개 RSS입니다. Google News 중계 링크·YouTube 제목·전문 매체 유료 본문은 읽은 것처럼 요약하지 않습니다.
- `weekly-content.json`: 이번 주 편집본 + 원문 기반 AI 초안 + 분석 대기 목록. **원문·자막 전체 내용은 저장하거나 GitHub Pages에 게시하지 않습니다.**
- **OPENAI_API_KEY** (선택): 발급 후 GitHub **Settings → Secrets and variables → Actions → Repository secrets**에 입력하세요. 기본 모델은 `gpt-4.1-mini`; API 사용량에 따라 별도 과금됩니다. 저장소 파일이나 이 채팅에 비밀키를 올리지 마세요.
- API 키가 없는 경우 **편집 검증본만 공개**하고 신규 기사 제목은 *분석 대기*로 표시합니다. 편집본도 작성일이 이번 주 범위를 벗어나면 상단 노출에서 제외합니다.
- API가 있더라도 **원문 접근이 불가능하거나 robots.txt가 허용하지 않으면 자동 요약하지 않습니다.** AI가 만든 요약은 **AI 원문 기반 초안·미검증**으로 표시합니다. 숫자와 인용 근거에 대해 최소한의 자동 검사를 하지만 사람의 사실 검증을 대체하지 않습니다.
- 저작권을 보호하기 위해 기사 본문 전체, 영상 자막, 댓글 원문은 GitHub에 저장하지 않고, 짧은 독립 요약만 표시합니다.
- 트렌드 화면의 미분석 크리에이터 영상은 접어둔 **원문 보관함**에서 확인할 수 있습니다. 이용자가 직접 보지 않은 동영상의 내용이나 댓글을 읽었다고 주장하지 않습니다.

갱신 방식: GitHub **Actions → ATELIER weekly research and site → Run workflow** 수동 실행 또는 매주 월요일 09:00 한국 시간 자동 시도. Source-level errors는 API·사이트별 검증 상태를 확인해야 합니다.

### 최근 통합 검증

- 2026-11-05 최초 편집본 3건: Lyst 인기 상품 지수, Capri Holdings 공식 실적 발표, Retail Dive Old Navy 상품기획 재편 기사.
- 최신 자료 수집본의 **원문 제목만 확인된 영상·뉴스는 자동 요약하지 않습니다.** 원문 보관함에 수집 건수 및 대기 사유를 표시합니다.
- 최근 기사 요약의 자동 생성은 `OPENAI_API_KEY`를 **GitHub Repository secrets**에 설정해야 활성화됩니다. 설정되지 않은 경우 처음 확인한 편집본만 제공되고 편집 날짜를 명시합니다.
- 이 기능은 원문 전체 텍스트를 배포하거나 영상 자막을 무단으로 수집하지 않습니다. 접근 불가·유료 자료는 요약 대기 상태를 유지합니다.
