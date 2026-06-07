# 관리자 기능 전반 서버 검증 (A+B+C)

현재 관리자 기능은 클라이언트에서만 비밀번호("sendev33" 하드코딩)를 검사하고, 서버 함수들은 인증 없이 누구나 호출 가능합니다. 시크릿창/콘솔에서 공지 작성·카테고리 수정·프로필 삭제 등이 그대로 실행됩니다. 이를 서버에서 차단합니다.

## 핵심 방향
- 관리자 대시보드 비밀번호를 **서버 비밀(secret)** 로 옮기고, 클라이언트 하드코딩 값을 제거한다.
- 관리자 전용 서버 함수마다 비밀번호를 받아 **서버에서 직접 검증**한다. 비밀번호 없이/틀리면 작업 거부.
- 기존 `verifyProfileAdmin` + `PROFILE_ADMIN_PASSWORD` 패턴과 동일한 방식이라 코드베이스 관습과 일치한다.

## 검토 완료 (위험 요소)
- 서버비: 추가 DB·AI·외부 호출 없이 환경변수 문자열 비교만 → **비용 영향 없음**.
- 다른 기능 악영향: 대상 함수 호출처 전수 조사 결과, `createPost` 외에는 모두 관리자 페이지에서만 호출 → **무영향**.
- `createPost`만 일반 사용자 글쓰기 4곳에서도 사용 → `type === "notice"`일 때만 검증하여 일반 글쓰기 무영향.
- 공개 읽기 함수(`listAwardIconRules`, `getAwardIcon`, `getProfileMap` 등)는 수정 대상 아님 → 표시 기능 정상.

## 1단계 — 서버 비밀 추가
- 새 서버 비밀 `ADMIN_PASSWORD` 등록 (현재 하드코딩된 "sendev33" 값을 이 비밀로 이전).
- 프로필 탭은 이미 별도 `PROFILE_ADMIN_PASSWORD`를 사용하므로 그대로 활용.

## 2단계 — 서버 검증 헬퍼 + 검증 함수
`platform.functions.ts`에 추가:
- `requireAdmin(password)` : `process.env.ADMIN_PASSWORD`와 일치하지 않으면 에러 throw. 비밀 미설정·빈 문자열은 **절대 통과 금지**.
- `requireProfileAdmin(password)` : `process.env.PROFILE_ADMIN_PASSWORD` 검증 (동일 규칙). 프로필 탭 전용.
- `verifyAdmin` 서버 함수 : 대시보드 게이트가 비밀번호 검증에 사용 (값은 클라이언트로 반환 안 함).

## 3단계 — 관리자 전용 서버 함수에 검증 적용
입력값에 비밀번호 필드를 추가하고 핸들러 시작 시 검증 호출.

**`requireAdmin` (ADMIN_PASSWORD) 적용:**
- 카테고리: `createCategory`, `updateCategory`, `deleteCategory`, `getCategoryPassword`, `swapCategoryOrder`
- 평가: `shuffleEvaluation`, `closeEvaluation`
- 캘린더: `createEvent`, `updateEvent`, `deleteEvent`, `uploadEventFile`
- 평가기준: `createCriterion`, `updateCriterion`, `deleteCriterion`
- 홈 구성: `createHeroSlide`, `deleteHeroSlide`, `uploadHeroImage`, `swapHeroSlideOrder`
- 공지(조건부): `createPost`는 `type === "notice"`일 때만 적용. 일반 글 작성은 영향 없음.

**`requireProfileAdmin` (PROFILE_ADMIN_PASSWORD) 적용** — 프로필 관리 탭에 위치하므로 2차 게이트 비밀번호로 검증:
- `upsertUserProfile`, `addUserAward`, `deleteUserAward`, `deleteUserProfile`, `resetNicknamePassword`
- `setAwardIcon`, `addAwardIconRule`, `deleteAwardIconRule` (← 수정: 프로필 탭 소속이므로 PROFILE_ADMIN_PASSWORD 사용)

> 게시글 수정/삭제/이동(`updatePost`, `deletePost`, `movePost`)은 이미 글별 비밀번호(`checkPostPassword`, 마스터 비밀번호 포함)를 서버에서 검증하므로 그대로 둠.

## 4단계 — 클라이언트 적용
- `admin.tsx`: 하드코딩된 `ADMIN_PASSWORD = "sendev33"` 제거. 게이트는 `verifyAdmin` 서버 함수로 검증하고, 통과 시 입력한 비밀번호를 세션에 보관(이후 작업 호출에 첨부).
- 각 관리자 페이지(`admin.categories`, `admin.home`, `admin.calendar`, `admin.notices`, `admin.criteria`)의 변경 작업 호출에 보관된 관리자 비밀번호를 함께 전송.
- `admin.profiles`: 변경 작업 호출에 2차 게이트 비밀번호(`PROFILE_ADMIN_PASSWORD`) 첨부.
- 검증 실패 시 사용자에게는 "권한이 없습니다" 수준의 모호한 메시지만 노출.

## 5단계 — 검증
- 시크릿창/콘솔에서 비밀번호 없이 공지 작성·카테고리 생성·프로필 삭제 호출 → **거부** 확인.
- 정상 관리자 흐름(비밀번호 입력 후 각 탭 작업) → **정상 동작** 확인.
- 일반 사용자의 글 작성/수정/삭제 → 영향 없음 확인.

## 6단계 — 사용자 가이드
- `/guide` 페이지에 관리자 인증/기능 관련 설명이 있으면 변경된 동작에 맞춰 갱신.
