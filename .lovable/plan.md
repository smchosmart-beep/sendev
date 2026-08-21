# 투표 결과 카드 색상 구분

## 요구사항
투표 종료 상태에서 결과 카드의 선발 여부를 색상으로 한눈에 구분합니다.

- **선발 확정** 게시글: 녹색 계열 배경/테두리
- **공동 등수로 재투표 필요**한 게시글: 노란색 계열 배경/테두리
- 그 외: 기존 흰색/회색 카드 유지

## 수정 내용
1. `src/components/VoteSection.tsx`의 `winnerInfo` 계산에서 동점 후보 ID 집합(`tiedIds`)도 함께 반환합니다.
   - 현재 `tied`는 동점 개수만 담고 있어, 어떤 게시글이 동점인지 알 수 없습니다.
   - `tied` 배열을 Set으로 변환해 카드 렌더링에서 사용합니다.
2. 카드(`paged.map(...)` 내부 `<div>`)의 `className`에 상태별 배경색을 추가합니다.
   - `isLocked || isWinner` → `bg-emerald-50 border-emerald-300` (선발 확정)
   - `isTied` → `bg-amber-50 border-amber-300` (재투표 필요)
   - `voted` 상태 색상은 선발/동점 색상에 덮어쓰지 않거나, 기존 `accent` 색상을 우선순위 낮게 둡니다.
3. 기존 "선발" 배지 및 순위 배지는 그대로 유지합니다.

## 기술 세부
- `winnerInfo` 객체 타입에 `tiedIds: Set<string>` 추가.
- 카드 className 예시:
  ```tsx
  const isLocked = lockedIds.has(post.id);
  const isWinner = status === "closed" && winnerInfo.winners.has(post.id);
  const isTied = status === "closed" && winnerInfo.tiedIds.has(post.id);
  ```
  ```
  isLocked || isWinner ? "bg-emerald-50 border-emerald-300" :
  isTied ? "bg-amber-50 border-amber-300" :
  voted ? "border-primary bg-accent/50" : "border-border bg-card"
  ```
- 서버/DB 변경 없음. `src/lib/platform.queries.ts` 및 `src/lib/platform.functions.ts` 수정 없음.
