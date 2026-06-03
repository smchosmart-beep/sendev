## 목표

히어로 배너 좌우 버튼을 누르면 단순히 옆으로 슬라이드되는 대신, 뒤에 쌓인 카드가 앞으로 넘어오는 스택형 3D 애니메이션이 나타나도록 변경합니다.

## 동작 방식

```text
   [뒤2]   ← 살짝 작게, 뒤에 겹쳐 보임
  [뒤1]
 [앞]      ← 현재 보이는 카드 (선명, 정면)
```

- 현재 카드 뒤로 다음 1~2장이 살짝 작아지고 위로 어긋난 채 겹쳐 쌓여 보임 (depth 느낌)
- "다음" 버튼 → 맨 앞 카드가 살짝 들리며 옆/뒤로 빠지고, 뒤에 있던 카드가 스케일·위치가 커지며 앞으로 올라옴
- "이전" 버튼 → 반대 방향으로, 뒤로 보냈던 카드가 다시 앞으로 넘어옴
- 전환은 부드러운 ease + 약간의 3D perspective(원근감)로 "뒷장이 앞으로 넘어오는" 입체감 연출

## 구현 방식

- 기존 embla 기반 `Carousel`(`CarouselContent`/`CarouselItem`/`CarouselPrevious`/`CarouselNext`)를 히어로 영역에서 제거하고, 자체 스택 카루셀 컴포넌트로 교체
- 새 파일 `src/components/hero-stack-carousel.tsx` 생성
  - props: `slides` 배열
  - `useState`로 현재 인덱스 관리
  - 각 슬라이드를 절대 위치(`absolute`)로 겹쳐 배치하고, 현재 인덱스 기준 offset(0=앞, 1=한 칸 뒤, 2=두 칸 뒤)에 따라 `transform: translateY/scale/translateZ` + `opacity` + `zIndex`를 CSS transition으로 적용
  - 컨테이너에 `perspective`(원근감) 적용해 3D 입체감 부여
  - 좌/우 버튼은 기존과 동일한 위치/스타일 유지 (모바일 `left-3`/`right-3`, PC `md:-left-12`/`md:-right-12`)
  - 카드 클릭 시 `linkUrl`이 있으면 새 탭으로 열리는 기존 동작 유지
  - 9:16 비율, `rounded-3xl`, 그림자 등 현재 시각 스타일 유지
- `_main.home.tsx`에서 히어로 `<section>` 내부를 새 컴포넌트로 교체 (`md:mx-auto md:max-w-[50%]` 래퍼와 슬라이드 없을 때의 placeholder 블록은 그대로 유지)

## 기술 세부사항

- 추가 라이브러리 없이 React state + Tailwind/인라인 transform + CSS transition 으로 구현 (framer-motion 미설치, 불필요)
- 애니메이션 토큰: `transition-all duration-500 ease-out`, 뒤 카드 `scale-95`/`scale-90`, `translate-y` 음수로 위로 어긋남, `opacity` 단계적 감소
- 슬라이드 1장일 때는 버튼/스택 없이 단일 카드만 표시
- "다가오는 이벤트" 섹션 및 기타 영역은 변경 없음
