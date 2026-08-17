# 투표 게시판 추가

카테고리 설정의 "사용할 게시판 종류"에 **투표 게시판**을 추가합니다. 투표 게시판은 보드형(격자) 목록으로, 한 화면에 36개 게시글이 보이며, 각 게시글이 곧 투표 후보가 됩니다.

## 동작 규칙

- **1인 1게시글**: 투표 게시판에는 한 닉네임당 게시글 1개만 등록할 수 있습니다(대소문자·앞뒤 공백 무시). 이미 쓴 닉네임이 다시 쓰려 하면 "이미 등록한 글이 있어요" 안내로 막습니다.
- **투표 권한**: 게시판 비밀번호를 통과한 사람이면 누구나 투표할 수 있고, 투표자는 **닉네임 기준**으로 구분합니다(닉네임 비밀번호 확인 → 1인 1회).
- **관리자 컨트롤**: 목록 상단에 관리자 전용 영역이 나타나 `투표 시작` / `투표 종료` / `투표 초기화` 버튼으로 상태를 바꿉니다. 시작 버튼을 누를 때 **1인당 최대 투표 수**를 그 자리에서 입력합니다. (관리자 화면은 `/admin` 로그인을 한 같은 브라우저에서만 보입니다.)
- **진행 중 비공개**: 투표가 열려 있는 동안에는 득표수·투표자 모두 아무에게도 보이지 않습니다. 본인 화면에는 내가 고른 카드 표시와 남은 표 수만 보입니다. 비공개를 확실히 하기 위해 **투표 게시판 카드에는 좋아요 수를 표시하지 않습니다**.
- **종료 후 공개**: 종료되면 모든 카드에 득표수와 순위가 한 번에 공개됩니다. **명단(누가 어디에 투표했는지)은 관리자에게만** 보입니다.
- **상태 3단계**: 대기 → 진행 중 → 종료. 종료 후 다시 시작하면 기존 표가 유지되고, `투표 초기화`는 확인 창을 거쳐야 실행됩니다(되돌릴 수 없음).
- **상태 자동 반영**: 투표 게시판 화면에 머무는 동안 1분마다 상태를 가볍게 확인해, 관리자가 종료하면 새로고침 없이 결과가 열립니다.

## 화면

- 목록: 반응형 격자 (모바일 2열 / 태블릿 4열 / PC 6열 × 6행 = 36개). 카드에는 제목·작성자·썸네일(있으면)과 투표 버튼이 들어갑니다.
- 36개를 넘으면 기존 방식대로 페이지 이동 버튼이 붙습니다.
- 카드 클릭은 기존처럼 게시글 상세로 이동하고, 투표는 카드 안 버튼으로 따로 합니다.
- 검색창은 기존 게시판과 동일하게 동작합니다.

## 기술 메모

**DB (마이그레이션)**
- `categories`: `enable_vote boolean default false`, `vote_name text default '투표'`, `vote_status text default 'idle'`(idle/open/closed), `vote_max_choices int default 1` 추가.
- `posts_type_check` 제약을 `('post','project','link','problem','vote')`로 교체 (현재 4종만 허용됨 — 실제 조회 확인).
- 중복 등록 경합 방지: `create unique index ... on public.posts (category_id, lower(btrim(author))) where type = 'vote'`.
- 신규 테이블 `public.votes(id, category_id, post_id, voter_key, voter_name, created_at)` + `unique(category_id, post_id, voter_key)` + `index(category_id)`. GRANT는 `service_role`만(모든 접근은 서버 함수 경유), RLS 활성화 + 정책 없음(기존 `posts`/`comments`와 동일 패턴).

**서버 함수 (`src/lib/platform.functions.ts`)**
- `listCategories`/`createCategory`/`updateCategory`에 새 필드 추가.
- `createPost`: zod `type` enum에 `'vote'` 추가. `vote`일 때 같은 카테고리·같은 닉네임 키 존재 여부 사전 확인 + 유니크 위반 오류를 사용자 문구로 변환.
- `setVoteStatus({categoryId, status, maxChoices, adminPassword})` / `resetVotes({categoryId, adminPassword})` — `requireAdmin` 서버 검증.
- `castVote({categoryId, postId, nickname, nicknamePassword, boardPassword})` — `boardAccessOk` + `ensureNicknameOwnership`으로 검증 후 토글 삽입/삭제, `vote_status !== 'open'`이거나 최대 개수 초과 시 거부.
- `getMyVotes({categoryId, nickname, boardPassword})` — 본인 선택 postId 목록만 반환.
- `getVoteState({categoryId})` — status·maxChoices만 반환하는 경량 조회(1분 주기 폴링용). `categories` 캐시와 분리해 다른 화면 재조회를 유발하지 않음.
- `getVoteResults({categoryId, boardPassword, adminPassword})` — `status !== 'closed'`면 빈 결과. 종료 시 post_id별 집계 반환, 관리자 비밀번호가 맞을 때만 투표자 명단 포함.

호출량: 목록 진입 시 내 표 1회 + (종료 시) 집계 1회 + 1분 주기 상태 확인 1회로, 게시글 수와 무관한 고정 쿼리 수를 유지합니다. 투표 섹션은 좋아요 배치 조회를 호출하지 않아 오히려 조회가 줄어듭니다.

**프론트**
- `src/routes/_main.board.$slug.index.tsx`: `vote` 섹션(격자 + 관리자 컨트롤 + 투표 버튼) 추가, `VOTE_PAGE_SIZE = 36`, `vpage` 검색 파라미터 추가. 관리자 초기화 버튼은 `useConfirm` 확인 필수.
- `src/routes/_main.board.$slug.new-vote.tsx`: 기존 `new-general` 형태를 따르는 등록 폼(저작권 안내 팝업 포함).
- `src/routes/admin.categories.tsx`: 추가/수정 폼에 `투표 게시판` 토글 + 이름 입력.
- `src/routes/_main.guide.tsx`: 투표 게시판 사용법(1인 1글, 투표 방법, 결과 공개 시점, 관리자 조작) 안내 추가.
