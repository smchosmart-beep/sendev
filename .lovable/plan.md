# 평가 중복 문제 — 운영(관리자) 기반 해결: 사전 허용 명단 + 사후 점검/삭제

auth 없는 익명 커뮤니티 정책을 유지하면서, 중복 평가를 **관리자 운영**으로 다룬다. 두 가지를 모두 제공한다.
- **B. 사전 허용형**: 카테고리별로 평가 가능한 닉네임 명단을 등록하고, "명단만 허용" 토글을 켜면 명단 외 닉네임은 평가 제출 불가.
- **A. 사후 점검형**: 관리자 화면에서 카테고리의 평가 현황(평가자 닉네임·참여 수·산출물별 점수)을 보고, 의심되는 평가를 삭제.

방금 추가한 "평가 시 닉네임 비밀번호 검증"은 그대로 유지한다.

## 1. 데이터베이스 (마이그레이션)

새 테이블 `review_allowlist` (카테고리별 허용 닉네임):
- `id uuid pk default gen_random_uuid()`
- `category_id uuid not null`
- `reviewer_name text not null` (표시용 원본)
- `reviewer_key text not null` (정규화: 소문자+trim, 중복 판정용)
- `created_at timestamptz not null default now()`
- `unique (category_id, reviewer_key)`
- RLS 활성화 + `GRANT ALL ON public.review_allowlist TO service_role;` (기존 reviews/posts와 동일하게 서버 함수의 서비스 역할로만 접근, anon/authenticated 미부여)

`categories` 테이블에 컬럼 추가:
- `review_allowlist_only boolean not null default false` (해당 카테고리에서 명단만 허용할지)

> 데이터 변경이 아니라 구조 변경이므로 migration 도구 사용. 타입은 자동 갱신.

## 2. 서버 함수 (`src/lib/platform.functions.ts`)

**Option B — 명단 & 적용**
- `listReviewAllowlist({ categoryId, adminPassword })` — `requireAdmin`, 명단 조회.
- `addReviewAllowlistName({ categoryId, reviewerName, adminPassword })` — `requireAdmin`, `reviewer_key`는 `normalizeName`으로 생성, upsert(중복 무시).
- `removeReviewAllowlistName({ id, adminPassword })` — `requireAdmin`, 삭제.
- `setReviewAllowlistOnly({ categoryId, enabled, adminPassword })` — `requireAdmin`, `categories.review_allowlist_only` 토글.
- `createReview` 수정: 기존 `ensureNicknameOwnership` 다음에, 대상 글의 카테고리를 조회해 `review_allowlist_only`가 true면 `review_allowlist`에 `reviewer_key`가 있는지 확인. 없으면 throw("이 평가는 등록된 평가자 명단의 닉네임만 참여할 수 있어요."). false면 기존대로 통과.
- `CategoryDTO`에 `reviewAllowlistOnly: boolean` 추가, `listCategories` 매핑 반영.

**Option A — 현황 & 삭제**
- `listCategoryReviews({ categoryId, adminPassword })` — `requireAdmin`. 해당 카테고리의 모든 산출물 평가를 글 제목과 함께 반환(평가 id, 산출물 제목/번호, 평가자 닉네임, 제출일). 평가자별 집계는 화면에서 계산.
- `deleteReview({ id, adminPassword })` — `requireAdmin`, 단일 평가 삭제.

## 3. 쿼리 옵션 (`src/lib/platform.queries.ts`)
- `reviewAllowlistQueryOptions(categoryId)` → `listReviewAllowlist`
- `categoryReviewsQueryOptions(categoryId)` → `listCategoryReviews`
(둘 다 관리자 화면 전용, adminPassword는 `getAdminPassword()`로 전달)

## 4. 관리자 화면 (`src/routes/admin.criteria.tsx`)
선택한 카테고리 아래에 카드 2개 추가:

**평가자 명단(Option B)**
- 스위치: "명단에 있는 닉네임만 평가 허용" (`setReviewAllowlistOnly`).
- 닉네임 입력 + 추가 버튼(`addReviewAllowlistName`).
- 등록된 닉네임 목록 + 각 항목 삭제(`removeReviewAllowlistName`).
- 토글 OFF면 "누구나 평가 가능", ON이고 명단 비어있으면 "아무도 평가할 수 없음" 경고 문구.

**평가 현황 점검(Option A)**
- 상단에 "참여 평가자 수 N명" 표시.
- 평가자별 요약: 닉네임 · 평가한 산출물 수 · 최근 제출일. 닉네임이 비슷/중복 의심될 때 눈으로 확인.
- 펼치면 산출물별 개별 평가 행 + 삭제 버튼(`deleteReview`). 삭제는 AlertDialog로 확인.
- 변경 시 `reviews`/`categories` 관련 쿼리 invalidate.

## 5. 평가 폼 (`src/routes/_main.board.$slug.$postNo.tsx`)
- 명단 차단 시 서버가 던지는 에러 메시지를 그대로 toast로 노출(이미 `onError`에서 `err.message` 사용 중이라 추가 작업 최소).

## 6. 가이드 (`src/routes/_main.guide.tsx`)
메모리 규칙에 따라 일반 사용자 눈높이로 한 줄 추가: "일부 평가는 운영자가 미리 정한 평가자 명단의 닉네임만 참여할 수 있으며, 명단 외 닉네임은 평가가 제출되지 않을 수 있습니다." 코드/보안 용어는 쓰지 않음.

## 영향 / 주의
- 기본값 `review_allowlist_only = false`라 기존 카테고리는 동작 변화 없음(회귀 없음).
- 명단 적용은 카테고리 단위 옵트인. 켠 카테고리에서만 제한.
- 삭제는 관리자 비밀번호로 서버에서 재검증(`requireAdmin`)되어 콘솔 우회 불가.
- 닉네임 매칭은 정규화 키(소문자+trim) 기준으로 대소문자/공백 차이를 흡수.

## 한계 (정책상 수용)
- 명단 미적용 카테고리에서는 새 닉네임 생성으로 재평가 가능 → 사후 점검(Option A)으로 보완.
