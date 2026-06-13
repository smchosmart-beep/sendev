## 모바일 스와이프 방향 반전

### 변경 내용
현재 모바일 스와이프는 왼쪽=다음글, 오른쪽=이전글로 동작한다. 이를 반대로 바꾼다.
- 왼쪽 스와이프 → 이전글(older)
- 오른쪽 스와이프 → 다음글(newer)

(PC 키보드 방향키는 변경하지 않음 — 이번 요청은 스와이프만)

### 변경 파일
1. **`src/routes/_main.board.$slug.$postNo.tsx`** — `ProjectDetailPage`의 `useSwipeNavigation` 연결을 교체: `onSwipeLeft: goOlder`, `onSwipeRight: goNewer`.

2. **`src/routes/_main.guide.tsx`** — 스와이프 설명 문구를 "왼쪽으로 밀면 이전글, 오른쪽으로 밀면 다음글"로 수정.