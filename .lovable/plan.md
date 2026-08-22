# 투표 닉네임 공개 시점 수정

## 문제
현재는 투표가 "종료" 상태가 되는 즉시(=1차 투표 결과가 나오는 순간) 후보 카드와 게시글 상세에서 작성자 닉네임이 공개됩니다. 동점으로 결선투표가 이어지는 경우에도 이미 이름이 드러나므로, 결선 투표가 이름에 영향을 받습니다.

## 원하는 동작
최종 결선까지 모두 끝나고 관리자가 결과를 확정하기 전까지는 모든 후보가 "익명"으로 표시됩니다.

## 변경 내용

1. 공개 여부를 명시적인 값으로 관리
   - 투표 게시판에 "닉네임 공개됨" 상태값을 하나 추가합니다(기본값: 비공개).
   - 새 라운드(결선)를 열면 자동으로 다시 비공개로 되돌립니다.

2. 관리자 컨트롤
   - 투표가 종료되고 더 이상 재투표가 필요 없는 상태(동점으로 인한 정원 초과 없음)일 때만
     "최종 결과·닉네임 공개" 버튼이 관리자에게 노출됩니다.
   - 동점이 남아 있으면 버튼 대신 "결선 투표가 필요합니다" 안내가 보입니다.
   - 실수로 공개한 경우를 위해 "다시 비공개" 버튼도 함께 둡니다.

3. 표시 규칙 통일 (닉네임이 노출되는 곳 3군데 전부)
   - 투표 목록 카드: 공개 상태일 때만 실제 닉네임, 그 전에는 "익명".
   - 게시글 상세 페이지: 같은 값을 기준으로 처리(현재는 종료 여부만 봄).
   - 최근글/검색 등 서버 목록 응답의 작성자 마스킹도 같은 기준으로 변경(현재는 종료 즉시 이름이 실려 나감).
   - 순위·득표수·선발/재투표 색상 표시는 지금과 동일하게 종료 즉시 보입니다(닉네임만 가려짐).
   - 본인 글 표시("내 글")는 로컬 닉네임 비교라 그대로 동작합니다.
   - 투표 현황판(누가 투표했는지)은 후보 이름이 아니라 유권자 명단이므로 변경 없음.

4. 사용자 가이드(/guide) 투표 게시판 항목에 "닉네임은 최종 결과 공개 시점까지 익명" 설명을 추가합니다.

## 기술 메모
- DB: `categories`에 `vote_revealed boolean not null default false` 추가(마이그레이션). 기존 행은 기본값 false로만 채워지므로 데이터 손실 없음. `categories`는 서비스 롤 경유 접근이라 추가 grant/RLS 작업 불필요.
- 리셋 지점: `setVoteState`(open/idle), `resetVotes`, `openRunoff`, `cancelRunoff` 모두 `vote_revealed=false`로 함께 갱신.
- 서버: `VOTE_STATE_COLUMNS`/`loadVoteConfig`/`getVoteState` 반환값에 `revealed` 추가, 관리자 전용 토글 서버 함수 신설(`requireAdmin` 재사용). `listCategories` select에도 `vote_revealed` 추가 후 `Category` 타입 확장(상세 페이지가 이 값을 씀).
- 목록 마스킹: `platform.functions.ts`의 최근글 조회에서 `categories!inner(... , vote_status)` → `vote_revealed`도 함께 select 하고 마스킹 조건을 `!vote_revealed`로 변경.
- 클라이언트: `VoteSection.tsx`의 `showAuthor = status === "closed"` → `state.revealed`, `_main.board.$slug.$postNo.tsx`의 `hideVoteAuthor`도 동일 기준. 토글 후 `vote-state`·`categories`·게시글 관련 쿼리 invalidate.
- 추가 쿼리/폴링 없음 — 기존 `vote-state` 쿼리에 필드만 얹으므로 서버 부하 변화 없음.

