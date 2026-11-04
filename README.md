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
