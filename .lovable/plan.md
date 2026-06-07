## 목표
검색 아이콘과 설정 아이콘 사이에 "내 페이지" 진입점을 추가한다. 클릭하면 닉네임+비밀번호를 입력받아 인증하고, 인증되면 그 닉네임의 개인 대시보드(내가 쓴 글 / 댓글 반응 / 좋아요)를 보여준다. 좋아요 기능은 새로 구축한다.

## 1. 좋아요 기능 신규 구축 (DB)
새 테이블 `post_likes` 생성:
- `target_type` text ('post' | 'comment'), `target_id` uuid, `liker_key` text(정규화 닉네임), `liker_name` text, `created_at`
- `unique(target_type, target_id, liker_key)` — 중복 좋아요 방지
- GRANT(authenticated/service_role) + RLS. 모든 접근은 서버 함수(admin client)를 통하므로 정책은 admin 전용으로 두고 클라이언트 직접 접근은 막음.

좋아요는 게시글과 댓글 모두에 적용. 좋아요를 누르려면 "누른 사람"의 신원이 필요한데, 기존에 도입한 브라우저 저장 닉네임(`sendev:identity`)을 사용한다. 저장된 닉네임이 없으면 좋아요 시 "닉네임을 먼저 설정해주세요" 안내.

## 2. 서버 함수 (src/lib/platform.functions.ts 추가)
- `verifyNicknameLogin({ username, password })` — `user_profiles`에서 `username_key`로 조회 후 `hashSecret(password)` 비교. 성공 시 `{ ok, username }`. 비밀번호가 아직 등록 안 된(claim 안 된) 닉네임이면 안내 메시지.
- `getMyDashboard({ username, password })` — 재인증 후 한 번에 집계 반환:
  - `myPosts`: 해당 author_key의 글 목록(카테고리 slug/이름, post_no, 제목, 작성일, 댓글수)
  - `myComments`: 내가 쓴 댓글 목록(소속 글 제목/링크 포함)
  - `repliesToMe`: 내 글에 달린 댓글 목록(글 제목/링크 + 댓글 내용/작성자)
  - `likesGiven`: 내가 누른 좋아요 목록(대상 글/댓글)
  - `likesReceived`: 내 글·댓글이 받은 좋아요 수(대상별 집계 + 합계)
- `toggleLike({ targetType, targetId, likerName })` — 좋아요 토글(있으면 삭제, 없으면 추가). `likerName`은 정규화하여 `liker_key` 저장.
- `getLikeState({ targetType, targetIds[], likerKey })` — 목록/상세에서 좋아요 수와 내 좋아요 여부 조회.

`normalizeUsername`, `hashSecret`는 기존 헬퍼 재사용.

## 3. 좋아요 UI
- 게시글 목록/상세, 댓글에 좋아요 버튼(하트) + 카운트 추가.
- 클릭 시 `toggleLike` 호출, 누른 사람은 브라우저 저장 닉네임 사용. 미설정 시 토스트로 닉네임 설정 안내(기존 NicknameSetup 다이얼로그 연결).

## 4. 대시보드 라우트 (src/routes/_main.mypage.tsx, URL `/mypage`)
- `_main` 레이아웃 하위(공통 헤더 유지).
- 진입 시 닉네임+비밀번호 입력 폼(항상 직접 입력). 인증 성공 후 같은 화면에서 대시보드 표시(상태로 전환, 페이지 이동 없음).
- 탭/섹션 구성:
  - 내가 쓴 글
  - 댓글 반응: "내가 쓴 댓글" / "내 글에 달린 댓글" 두 하위 탭
  - 좋아요: "받은 좋아요" / "누른 좋아요"
- 각 항목은 해당 글로 이동하는 링크 제공.

## 5. 진입점 추가 (src/routes/_main.tsx)
- 데스크톱 헤더: 검색 아이콘과 설정 아이콘 사이에 `User`(lucide) 아이콘 링크(`to="/mypage"`) 추가. 현재 순서 `NicknameSetup → 검색 → 설정`을 `NicknameSetup → 검색 → 내 페이지 → 설정`으로.
- 모바일 사이드 메뉴에도 "내 페이지" 항목 추가.

## 기술 메모
- 인증은 서버 측 `hashSecret` 비교로만 수행, 비밀번호는 응답에 포함하지 않음. 대시보드 데이터 요청마다 닉네임+비밀번호를 함께 보내 재검증.
- 좋아요는 익명 닉네임 기반이라 같은 브라우저/닉네임 공유 시 도용 가능성은 기존 시스템과 동일한 한계(별도 강화 없음).
- 모든 DB 접근은 `createServerFn` + admin client 사용(로더에서 직접 admin 호출 금지). 라우트에는 `errorComponent`/`notFoundComponent` 추가.
