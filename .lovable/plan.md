# 투표 게시판 추가

카테고리 설정의 "사용할 게시판 종류"에 **투표 게시판**을 추가합니다. 투표 게시판은 보드형(격자) 목록으로, 한 화면에 36개 게시글이 보이며, 각 게시글이 곧 투표 후보가 됩니다.

## 동작 규칙

- **1인 1게시글**: 투표 게시판에는 한 닉네임당 게시글 1개만 등록할 수 있습니다. 이미 쓴 닉네임이 다시 쓰려 하면 안내 후 막습니다.
- **투표 권한**: 게시판 비밀번호를 통과한 사람이면 누구나 투표할 수 있고, 투표자는 **닉네임 기준**으로 구분합니다(닉네임 로그인 필요 — 1인 1회).
- **관리자 컨트롤**: 목록 상단에 관리자 전용 영역이 나타나고 `투표 시작` / `투표 종료` 버튼으로 상태를 바꿉니다. 시작 버튼을 누를 때 **1인당 최대 투표 수**를 그 자리에서 입력합니다.
- **진행 중 비공개**: 투표가 열려 있는 동안에는 득표수·투표자 모두 아무에게도 보이지 않습니다. 본인이 어디에 투표했는지(선택 표시)와 남은 표 수만 본인 화면에 보입니다.
- **종료 후 공개**: 종료되면 모든 카드에 득표수와 순위가 한 번에 공개됩니다. **명단(누가 어디에 투표했는지)은 관리자에게만** 보입니다.
- **상태 3단계**: 대기(투표 전) → 진행 중 → 종료. 종료 후 관리자가 다시 시작하면 기존 표는 유지되고 이어서 진행되며, `투표 초기화` 버튼으로 표를 모두 지울 수 있습니다.

## 화면

- 목록: 반응형 격자 (모바일 2열 / 태블릿 4열 / PC 6열 × 6행 = 36개). 카드에는 제목·작성자·썸네일(있으면)과 투표 버튼이 들어갑니다.
- 36개를 넘으면 기존 방식대로 페이지 이동 버튼이 붙습니다.
- 카드 클릭은 기존처럼 게시글 상세로 이동하고, 투표는 카드 안 버튼으로 따로 합니다.
- 검색창은 기존 게시판과 동일하게 동작합니다.

## 기술 메모

**DB (마이그레이션)**
- `categories`: `enable_vote boolean default false`, `vote_name text default '투표'`, `vote_status text default 'idle'`(idle/open/closed), `vote_max_choices int default 1` 추가. `validate_category_tab_group`처럼 값 검증은 트리거 대신 서버 zod에서 처리.
- `posts.type` CHECK에 `'vote'` 추가 (문제ZIP 때와 동일한 방식).
- 신규 테이블 `public.votes(id, category_id, post_id, voter_key, voter_name, created_at)` + `unique(category_id, post_id, voter_key)`. GRANT는 `service_role`만(모든 접근은 서버 함수 경유), RLS 활성화 + 정책 없음(기존 posts/comments와 동일 패턴).

**서버 함수 (`src/lib/platform.functions.ts`)**
- `listCategories`/`createCategory`/`updateCategory`에 새 필드 추가.
- `setVoteStatus({categoryId, status, maxChoices, adminPassword})` — 관리자 검증 후 상태·최대 선택 수 갱신.
- `resetVotes({categoryId, adminPassword})` — 해당 카테고리 표 삭제.
- `castVote({categoryId, postId, nickname, nicknamePassword, boardPassword})` — 게시판 접근 확인(`boardAccessOk`) + 닉네임 소유 검증 후 토글 삽입/삭제, 최대 개수 초과 시 거부.
- `getMyVotes({categoryId, nickname, boardPassword})` — 본인 선택만 반환.
- `getVoteResults({categoryId, boardPassword, adminPassword})` — `status !== 'closed'`면 빈 결과 반환. 종료 시 post_id별 count 집계 반환, 관리자 비밀번호가 맞을 때만 투표자 명단 포함.
- `createPost`: type이 `vote`일 때 같은 카테고리·같은 닉네임 글 존재 여부 확인 후 중복이면 오류.

호출량: 목록 진입 시 내 표 1회 + (종료 시) 집계 1회로, 게시글 수와 무관한 고정 쿼리 수를 유지합니다.

**프론트**
- `src/routes/_main.board.$slug.index.tsx`: `vote` 섹션(격자 + 관리자 컨트롤 + 투표 버튼) 추가, `VOTE_PAGE_SIZE = 36`, `vpage` 검색 파라미터 추가.
- `src/routes/_main.board.$slug.new-vote.tsx`: 기존 `new-general` 형태를 따르는 등록 폼(저작권 안내 팝업 포함).
- `src/routes/admin.categories.tsx`: 추가/수정 폼에 `투표 게시판` 토글 + 이름 입력.
- `src/routes/_main.guide.tsx`: 투표 게시판 사용법(1인 1글, 투표 방법, 결과 공개 시점, 관리자 조작) 안내 추가.
