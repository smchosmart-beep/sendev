## 목표
모바일 화면에서 해커톤 후기 포스트잇을 화면 하단에 고정된 **가로 1열 마퀴**(자동으로 옆으로 흐르는 띠)로 바꾸고, 각 포스트잇은 **세로 길이를 가로 너비만큼 고정한 정사각형** 카드로 만든다.

## 현재 상태
- 모바일에서는 `HackathonReviewStripMobile`이 카테고리 목록 위에 손으로만 스크롤되는 가로 띠로 들어가 있다(자동 이동 없음).
- 세로 마퀴용 CSS(`postit-marquee-up`)만 있고 가로 마퀴 키프레임은 없다.

## 변경 사항

### 1) `src/styles.css` — 가로 마퀴 키프레임 추가
```text
@keyframes postit-marquee-left {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
.postit-marquee-row { animation: postit-marquee-left var(--duration) linear infinite; }
.postit-marquee-row:hover { animation-play-state: paused; }
(prefers-reduced-motion 시 정지)
```

### 2) `src/components/HackathonReviews.tsx` — `HackathonReviewStripMobile` 재작성
- 화면 하단 고정(`fixed bottom-0 inset-x-0`) 띠로 변경, `xl:hidden`(데스크톱은 기존 좌우 세로 벽 유지).
- 내부는 가로 한 줄(`flex`)로 카드들 + 복제본을 이어 붙여 끊김 없는 무한 가로 마퀴 구성(`-50%` 이동과 맞물림).
- **각 카드는 정사각형**: 고정 너비(예: `w-44`)에 `aspect-square`로 세로 길이를 가로 너비와 동일하게 고정. 내용이 길면 넘치지 않게 `overflow-hidden`(필요 시 `line-clamp`)으로 처리.
- 카드 사이 간격 균일(`mr-3`), 겹침 없음.
- 카드 수에 비례한 지속시간(카드당 ~4s, 최소값 보장). 카드가 적을 때(≤2)는 복제 없이 정적 배치.
- 하단 고정 띠가 본문 마지막 콘텐츠를 가리지 않도록 본문 컨테이너에 하단 여백 확보.

### 3) `src/routes/_main.board.index.tsx`
- `HackathonReviewStripMobile`은 하단 고정으로 동작(컴포넌트 내부에서 `fixed` 처리). 본문에 하단 여백(`pb`) 추가로 가림 방지.

## 검증
- 모바일 폭(예: 375px)에서 `/board?tab=hackathon` 확인: 하단에 정사각형 포스트잇이 가로 1열로 자동으로 흐르는지, 카드 정사각형 비율·간격 균일·겹침 없음·끊김 없는 루프인지 확인.
- 데스크톱(xl 이상)에서는 기존 좌우 세로 벽 마퀴 유지 확인.

## 가이드
`/guide`에 모바일 후기 표시 방식 설명이 있으면 "하단 가로 정사각형 마퀴"로 갱신, 없으면 변경 불필요(확인 후 반영).
