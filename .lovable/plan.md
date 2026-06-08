# 첨부파일 다운로드 파일명 깨짐 수정

## 문제

파일 첨부(업로드)는 정상이지만, 다운로드 시 저장되는 파일명이
`2026%ED%95%99%EB%85%84...hwp` 처럼 퍼센트 인코딩된 깨진 이름으로 저장됨.

## 원인

업로드 시 스토리지 키는 ASCII 안전하게 `UUID.확장자`로 저장하고, 원본 한글
파일명은 Supabase `createSignedUrl(..., { download: name })` 옵션으로만 보존하고
있음. 이 옵션은 서명 URL에 `?download=<한글>` 쿼리를 붙이는데, Supabase 스토리지
서버가 이 값을 그대로(디코딩/RFC5987 처리 없이) `Content-Disposition` 헤더에
넣어 브라우저가 퍼센트 인코딩된 문자열을 그대로 파일명으로 사용함. 게다가
링크는 다른 출처(supabase.co)라서 `<a download="이름">` 속성도 무시됨.

## 해결 방법

다운로드를 브라우저 기본 링크 이동이 아니라, 파일을 fetch로 받아 Blob으로
만들고 같은 출처의 blob URL + 임시 `<a download="원본이름">`로 저장하도록 변경.
blob URL은 동일 출처라 `download` 속성의 한글 파일명이 정상 적용됨.

### 작업

1. **다운로드 헬퍼 추가** (`src/lib/download.ts`)
   - `downloadFile(url, fileName)`: `fetch(url)` → `blob()` →
     `URL.createObjectURL` → 임시 anchor 클릭(`download = fileName`) →
     `revokeObjectURL`로 정리. 실패 시 새 탭으로 fallback.

2. **캘린더 첨부 링크 수정** (`src/routes/_main.calendar.tsx`, 496~507줄)
   - `<a href=...>` 대신 `onClick`에서 `downloadFile(a.url, a.name)` 호출
     (`e.preventDefault()`), 표시 이름은 `a.name` 유지.

3. **게시판 첨부 카드 수정** (`src/routes/_main.board.$slug.$postNo.tsx`,
   `FileCard` 448~469줄)
   - 동일하게 클릭 시 `downloadFile(href, fileName)` 사용.

4. **가이드 점검** (`src/routes/_main.guide.tsx`)
   - 다운로드 동작 관련 설명이 있으면 문구만 확인/보정(있을 경우).

서버/스토리지 스키마 변경은 없음. 기존에 저장된 첨부도 그대로 정상 동작.

## 기술 메모

- `download` 서명 옵션은 그대로 두어도 무방(blob 방식이 파일명을 덮어씀).
- blob fetch는 서명 URL이라 CORS/인증 추가 설정 없이 동작.
