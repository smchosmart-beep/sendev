# 보안 보완 수정 계획 (최종 정리)

검토로 다음을 확정했습니다.
- 관리자 전용 민감 메타는 게시판 비밀번호뿐이며 이미 `getCategoryPassword`(`requireAdmin`)로 보호됨 → 별도 작업 없음.
- 평가 중복 제출 방지는 `createReview`의 `(post_id, reviewer_name)` upsert로 이미 구현됨 + 닉네임 비밀번호 잠금 → 추가 작업 없음.
- 가이드는 일반 사용자를 위한 문서이므로 코드 보안 내용은 포함하지 않음 → 가이드 갱신 불필요.

따라서 실제로 필요한 작업은 아래 2가지입니다.

## 1순위 — 비밀번호 게시판 본문 서버측 검증 (핵심)

현재 비밀번호 게시판은 UI(sessionStorage)만 막고, `listPosts`/`getPost`/`getPostByNo`가 비밀번호 없이도 글을 그대로 반환합니다. 콘솔에서 직접 호출하면 비밀번호 0번 입력으로 보호 글 조회가 가능합니다.

**SSR-안전 설계 (throw 금지):**
- `listPosts`/`getPost`/`getPostByNo` 입력에 선택적 `boardPassword?: string` 추가.
- 핸들러에서 대상 카테고리의 `password`를 조회:
  - 비밀번호가 **빈 값(공개 게시판)** → 기존과 동일하게 정상 반환.
  - 비밀번호가 설정됐는데 `boardPassword` 누락/불일치 → `listPosts`는 **빈 배열**, `getPost`/`getPostByNo`는 **null** 반환 (SSR/prerender에서 에러 throw하지 않음).
- `PasswordGate`가 검증 성공 시 입력한 비밀번호를 보관(sessionStorage unlock 값에 비밀번호 저장)하고, 게시판 하위 쿼리들이 이 값을 쿼리 인자로 전달.
- react-query `queryKey`에 비밀번호(또는 unlock 토큰)를 포함해 캐시가 보호/비보호 상태를 구분.

**영향:** 공개 게시판은 인자 없이 그대로 동작 → 회귀 없음. 추가 비용은 카테고리 1건 조회 + 문자열 비교뿐(캐시됨).

대상 파일: `platform.functions.ts`(3개 함수), `platform.queries.ts`(`postsQueryOptions`/`postQueryOptions`/`postByNoQueryOptions`), 라우트 `_main.board.$slug.tsx`(PasswordGate), `_main.board.$slug.index.tsx`, `_main.board.$slug.$postNo.tsx`, `_main.board.$slug.series.$series.tsx`.

## 2순위 — 보안 헤더 (Report-Only 우선)

- 즉시 적용(안전): `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- 전체 CSP는 카카오맵·Supabase·Lovable 스크립트·외부 OG 이미지·inline style을 깨뜨릴 수 있으므로 **`Content-Security-Policy-Report-Only`로 먼저 도입**해 위반만 수집. 위반 없음 확인 후 enforce 전환은 후속 작업.
- 적용 위치: 서버 응답 헤더 경로(`src/server.ts` 또는 root 핸들러).

---

## 제외/보류 (검토로 확정)

- ~~관리 메타 조회 게이트~~ — 게시판 비밀번호는 이미 보호, `evalSeed`는 평가 순서 렌더링용 비민감 값, 나머지 조회는 공개 표시용 → 변경 없음(회귀 방지).
- ~~평가 중복 제출 방지~~ — 이미 구현됨.
- ~~레이트리밋~~ — 백엔드 표준 기능 없음, 제외.
- ~~가이드 보안 내용 갱신~~ — 가이드는 일반 사용자 대상, 전문 보안 내용 불필요 → 제외.
- 영역별 관리자 비밀번호 세분화 / 빌드 메타데이터 노출 — 영향 낮음, 보류.

## 영향 요약

- 서버비 과다: 없음.
- 기능 오작동/회귀: 공개 조회 함수·비보호 게시판 미변경. 비밀번호 게시판만 SSR-안전 방식으로 보강.
- 외부 스크립트/지도 깨짐: CSP Report-Only 선도입으로 방지.
