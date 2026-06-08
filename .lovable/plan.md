# 게시글 조회수 기능

게시판 유형(일반/비밀번호/카드형)에 관계없이 모든 게시글에 조회수를 표시합니다. 집계는 **상세 페이지 진입 시 매 조회마다 +1**(새로고침 포함)입니다.

## 1. DB (마이그레이션 — 코드보다 먼저 적용)

- `posts` 테이블에 `view_count integer not null default 0` 컬럼 추가.
- 원자적 증가용 함수 `increment_post_view(p_id uuid)` 생성 (`security definer`, `set search_path = public`): `update posts set view_count = view_count + 1 where id = p_id`. 동시 접속에서도 경쟁 상태 없이 정확히 누적.
- 함수 실행 권한: `grant execute on function public.increment_post_view(uuid) to service_role` (서버 함수의 service-role 클라이언트 전용).

> 순서 필수: 마이그레이션이 승인·실행되고 `types.ts`가 재생성된 **다음에** 아래 코드 변경을 적용합니다. 컬럼이 없는 상태에서 `view_count`를 SELECT하면 에러납니다.

## 2. 서버 (`platform.functions.ts`)

- `PostDTO`에 `viewCount: number` 추가, `mapPost`에서 `p.view_count ?? 0` 매핑.
- `POST_COLUMNS`(목록/상세 공용 SELECT)에 `view_count` 추가 → **추가 쿼리 없이** 기존 SELECT에 묻어옴.
- 신규 함수 `incrementPostView({ postId })`:
  - 입력 검증(zod): `postId`는 `z.string().uuid()`. 검증 실패 시 조용히 무시(조회수는 비핵심 지표).
  - service-role 클라이언트로 `increment_post_view` RPC 호출, `{ ok: true }` 반환.
- 쿼리 옵션은 불필요(증가는 mutation, 표시는 기존 post 쿼리에 포함).

## 3. 클라이언트 — 표시 위치

- **상세 페이지 (`_main.board.$slug.$postNo.tsx`)**: 작성자/날짜 메타 영역에 `Eye` 아이콘 + 조회수 표시(모든 화면).
- **카드형 목록(산출물/링크)**: 카드에 조회수 표시(모든 화면).
- **게시판 목록(일반/고정 게시글)**: 댓글수 옆에 조회수 표시하되 **모바일에서는 숨김**(`hidden sm:flex`).

## 4. 클라이언트 — 증가 처리 (보완점 반영)

상세 페이지(`_main.board.$slug.$postNo.tsx`)에서:

- **이중 호출 가드**: `markPostRead`와 동일한 `useRef` 패턴. postId 기준으로 `useEffect` 내 1회만 호출 → React StrictMode 개발 모드 이중 렌더만 차단. **새로고침은 컴포넌트 재마운트라 가드가 리셋되므로 의도대로 +1** 됨.
- **이중 카운트 방지(표시 동기화)**: "낙관적 +1"과 "캐시 invalidate 재조회"를 **동시에 쓰지 않음**. 둘 중 하나만 사용 → 증가 호출 성공 시 해당 글 쿼리(`post-by-no`/`post`)만 invalidate해 서버 값으로 다시 읽어옴(+1 화면 반영). 낙관적 업데이트는 사용하지 않아 +2 표시 버그 차단.
- **크롤러 영향 없음**: 증가 호출은 클라이언트 `useEffect`에만 둠. OG 메타용 `loader`(SSR)에는 두지 않으므로 카카오/구글 크롤러는 조회수를 올리지 않음.

## 5. 가이드 (`_main.guide.tsx`)

- 조회수는 모든 게시판 유형에서 표시되며, 상세 페이지 진입(새로고침 포함)마다 1씩 증가함을 설명.
- 모바일에서는 일반/고정 글 목록의 조회수가 숨겨진다는 점 명시.
- 조회수는 읽음 표시(`post_reads`)·좋아요·댓글·평가와 **독립된 별개 지표**임을 안내.

## 기술 참고 (검토 결론)

- **기능 오작동**: 낮음 — StrictMode 가드 + 단일 동기화 방식 + 원자적 RPC로 정확.
- **서버비**: 거의 없음 — 목록은 추가 쿼리 0건(같은 SELECT), 상세 진입당 쓰기 1회 + 글 1건 재조회 1회. 소규모 커뮤니티 규모에서 무시 가능.
- **다른 기능 악영향**: 없음 — `viewCount`는 추가 필드일 뿐 기존 필드 유지(`listPosts`·`getPost`·`getPostByNo`·검색 모두 호환). 정렬은 `created_at` 그대로라 목록 순서 변화 없음. `posts` 행 누적이라 1000행 제한과 무관.
- **적용 순서**: ① 마이그레이션 → ② 타입 재생성 → ③ 서버·클라이언트 코드.
