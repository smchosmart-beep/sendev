## 목표
관리자가 각 게시판(카테고리)의 **작성자 목록을 엑셀(.xlsx) 파일로 다운로드**할 수 있는 기능 추가.

## 위치
`admin/categories` 페이지의 각 카테고리 행에 "작성자 목록 다운로드" 버튼 추가. 관리자 인증이 이미 있는 페이지이므로 별도 인증 UI 불필요.

## 파일 형식
- 확장자: `.xlsx` (SheetJS `xlsx` 라이브러리, 클라이언트 동적 import)
- 파일명: `{게시판이름}_작성자목록_{YYYYMMDD}.xlsx`
- 시트 컬럼:
  1. 작성자명
  2. 작성 글 수
  3. 최초 작성일
  4. 최근 작성일
- 정렬: 글 수 내림차순 → 작성자명 오름차순
- 중복 작성자는 1행으로 집계

## 구현 상세

### 1) 서버 함수 (`src/lib/platform.functions.ts`)
- `listCategoryAuthors` 추가: `createServerFn({ method: "GET" })`.
  - 입력: `{ categoryId, adminPassword }` (기존 `listReviewAllowlist` 등과 동일한 관리자 비밀번호 검증 패턴 재사용)
  - 처리: `supabaseAdmin`으로 `posts`에서 해당 카테고리의 `author, created_at`만 SELECT → 서버에서 그룹핑(count/min/max) 후 반환.
  - 반환: `{ author, count, firstAt, lastAt }[]`

### 2) 클라이언트 다운로드 (`src/routes/admin.categories.tsx`)
- 각 카테고리 행에 "작성자 다운로드" 버튼 추가.
- 클릭 시 `listCategoryAuthors` 호출 → `await import("xlsx")`로 SheetJS 동적 로드 → `XLSX.utils.aoa_to_sheet` + `XLSX.writeFile`로 다운로드.
- 빈 결과 시 토스트로 "작성자가 없습니다" 안내.

### 3) 의존성
- `bun add xlsx` — 클라이언트 다운로드에만 사용, 동적 import이므로 초기 번들/SSR 영향 없음.

### 4) 가이드 (`src/routes/_main.guide.tsx`)
- 관리자 섹션에 "게시판별 작성자 목록 엑셀 다운로드" 안내 한 줄 추가.

## 부작용 요약
- 서버 부하: 관리자 버튼 클릭 시 1회 조회, 작은 컬럼만 SELECT → 무시할 수준.
- 기존 기능: 신규 함수/버튼 추가만 있고 스키마·기존 로직 변경 없음.
- 보안: 관리자 비밀번호 검증 통과 시에만 실행. 반환 데이터는 기존에도 공개된 `author` 정보.

## 기술 요약
```
xlsx (SheetJS)           — 클라이언트 동적 import
listCategoryAuthors       — supabaseAdmin + 관리자 비밀번호 검증
admin.categories.tsx      — 행별 다운로드 버튼
```
