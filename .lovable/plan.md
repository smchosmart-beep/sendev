# 투표·문제ZIP 카드에 읽지 않은 글 표시 추가

## 문제
게시판 목록의 일반 글 카드(`PostListCard`)에는 읽지 않은 글 분홍 점이 표시되지만,
투표 게시판 카드(`VoteSection`)와 문제ZIP 카드(`ProblemCard`)에는 표시가 없습니다.
탭·게시판 배지 숫자는 전체 글 기준으로 세기 때문에 "숫자 1은 뜨는데 어느 글인지 알 수 없는" 상태가 됩니다.

## 변경 내용
1. `src/routes/_main.board.$slug.index.tsx`
   - 이미 계산된 `isUnread(id)` 결과를 `ProblemCard`와 `VoteSection`에 전달.
2. `src/components/VoteSection.tsx`
   - `unreadIds?: Set<string>` (또는 `isUnread` 함수) prop 추가.
   - 후보 카드 좌측 상단에 기존과 동일한 분홍 점 표시.
   - 익명성에는 영향 없음(작성자 정보는 그대로 숨김 유지).
3. `ProblemCard`(같은 파일 내)
   - `unread` prop을 받아 카드 상단에 동일한 분홍 점 표시.

## 기술 메모
- 새로운 쿼리·서버 호출 없음. 이미 로드된 `readPostIdsQueryOptions` 결과를 재사용하므로 서버 부하 증가 없음.
- 닉네임이 등록되지 않은 사용자에게는 기존과 동일하게 점이 표시되지 않음.
- 점 스타일은 `PostListCard`의 표시와 동일하게 맞춰 일관성 유지.
