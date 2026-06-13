# 좌우 담벼락 포스트잇 자동 흐름(마퀴)

## 목표
좌우 담벼락에 포스트잇이 많아져도 페이지 세로 스크롤은 절대 늘지 않게 하고, 화면에 고정된 담벼락 안에서 포스트잇이 위로(또는 아래로) 천천히 자동으로 흐르며 무한 순환하게 한다. 마우스로 스크롤하지 않아도 모든 포스트잇이 차례로 노출된다.

## 변경 대상
- `src/components/HackathonReviews.tsx` — `HackathonReviewSideColumns`의 `wall()` 렌더링 부분
- `src/styles.css` — 세로 마퀴 keyframes/유틸리티 추가

## 구현 방식

### 1. 세로 마퀴 애니메이션 (styles.css)
무한 순환을 위해 콘텐츠를 2벌 쌓고 `-50%`만큼 이동시키면 이음매 없이 반복된다.
```text
@keyframes postit-marquee-up {
  from { transform: translateY(0); }
  to   { transform: translateY(-50%); }
}
```
- 왼쪽/오른쪽 열은 방향(위로/아래로)을 다르게 줘서 단조로움을 줄임 (오른쪽은 reverse 또는 시작 위치 -50%).
- 속도는 포스트잇 개수에 비례하도록 `animation-duration`을 개수 기반으로 인라인 지정(예: 개수 × 약 3.5초, 최소 20초). 많아질수록 더 길게 → 읽기 속도 유지.

### 2. wall() 구조 변경
- 기존 `overflow-y-auto`(수동 스크롤) 컨테이너는 그대로 `fixed top-28 bottom-6`로 두되 `overflow-hidden`으로 변경(자체 스크롤바 제거).
- 내부에 마퀴 트랙 `<div>`를 두고, 그 안에 동일한 2열 masonry 블록을 **2번** 렌더링(원본 + 복제, `aria-hidden`).
- 트랙에 `animate-[postit-marquee-up_..._linear_infinite]` 적용.

### 3. 상호작용 보존
- 트랙에 `hover:[animation-play-state:paused]`를 적용해 마우스를 올리면 멈춤 → 읽기/클릭(수정·삭제) 가능.
- 포스트잇 개수가 적어 한 화면에 다 들어오면(예: 4개 이하) 마퀴를 끄고 정적 배치(불필요한 움직임 방지).
- `prefers-reduced-motion` 사용자는 애니메이션을 멈추고 정적 + 자체 스크롤로 폴백.

## 검증
- 프리뷰 `/board?tab=hackathon`에서 포스트잇을 여러 개 두고 좌우 담벼락이 자동으로 흐르는지, 페이지 세로 스크롤이 늘지 않는지 확인.
- 마우스 hover 시 멈추고 클릭으로 수정 다이얼로그가 열리는지 확인.
- 복제본이 이음매 없이 순환하는지(끊김/빈공간 없는지) 확인.

## 가이드 업데이트
`src/routes/_main.guide.tsx`의 해커톤 후기(담벼락) 설명에 "PC에서는 좌우 담벼락이 자동으로 흐르며, 마우스를 올리면 멈춰서 읽거나 수정할 수 있다"는 안내를 추가.
