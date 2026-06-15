### 문제
현재 모바일 후기 포스트잇 접기/펼치기 화살표 방향이 일반 UI 관행과 반대로 사용자의 요구와 맞지 않음.

### 수정
- `src/components/HackathonReviews.tsx`의 `HackathonReviewStripMobile` 컴포넌트에서 ChevronDown의 `rotate-180` 조건을 반대로 변경
  - 기존: `open && "rotate-180"` → 펼침=▲, 접힘=▼
  - 변경: `!open && "rotate-180"` → 접힘=▲, 펼침=▼
- `src/routes/_main.guide.tsx`의 관련 설명 문구는 화살표 방향 언급이 없어 별도 수정 불필요

### 영향 범위
- 모바일 후기 포스트잇 띠의 토글 버튼 아이콘 방향만 변경
- 기능/동작 변화 없음