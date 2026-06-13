# 담벼락 포스트잇 간격 균일화 + 겹침 제거

## 문제
현재 좌우 담벼락은 CSS `columns-2`(multi-column) 방식으로 카드를 배치한다. 카드 높이가 내용에 따라 다른데 multi-column은 두 열의 전체 높이를 맞추려 카드를 재분배하므로 카드 사이 간격이 불규칙해지고, 마퀴(무한 스크롤) 복제본과 만나는 이음매에서 카드가 겹쳐 보인다.

## 해결 방향
`columns-2`를 버리고 **명시적인 2개의 세로 열(flex-col)**로 바꾼다. 각 열 안에서 카드를 위에서 아래로 순서대로 쌓고, 모든 카드 사이 간격을 동일한 값(`gap`)으로 고정한다. 이렇게 하면 multi-column의 자동 재분배가 사라져 간격이 항상 일정하고 겹침이 없어진다.

## 변경 대상
`src/components/HackathonReviews.tsx` — `HackathonReviewSideColumns`의 `masonry()` 함수만 수정. 마퀴 트랙/방향/속도/hover 일시정지 로직은 그대로 유지.

## 구현 세부
- 각 담벼락(left/right)에 들어온 items를 두 열(colA, colB)로 번갈아(round-robin) 분배해 높이를 대략 균형 맞춤.
- 렌더 구조:
  ```text
  <div class="flex gap-2">            // 두 열 사이 가로 간격
    <div class="flex flex-1 flex-col gap-2"> ...colA cards... </div>
    <div class="flex flex-1 flex-col gap-2"> ...colB cards... </div>
  </div>
  ```
- 카드 래퍼에서 `break-inside-avoid`, `mb-2`, `columns-2` 제거. 세로 간격은 열의 `gap-2`가 전담 → 모든 카드 사이 간격 동일.
- 마퀴 트랙은 동일한 2열 블록을 원본+복제(`aria-hidden`)로 2벌 쌓고, 두 블록 사이에도 같은 `gap-2`를 줘서 이음매에서도 간격이 동일하고 겹치지 않게 한다(트랙 자체를 `flex flex-col gap-2`로 구성).

## 검증
- 프리뷰 `/board?tab=hackathon`(PC 폭)에서 좌우 담벼락 카드 사이 세로/가로 간격이 모두 동일한지, 겹치는 카드가 없는지 확인.
- 마퀴가 한 바퀴 순환할 때 이음매에서 간격이 튀거나 겹치지 않는지 확인.
- hover 시 멈춤, 클릭 시 수정 다이얼로그 동작 유지 확인.

## 가이드
레이아웃 미세 조정으로 사용법 변화가 없어 `/guide` 수정 불필요.
