## 목표

홈 화면 히어로 캐러셀의 두 가지 문제를 수정합니다.

1. 히어로 카드가 상단 메뉴바(헤더)보다 앞에 그려지는 문제 → 헤더 뒤로 보내기
2. 3D 스택 전환이 삐걱거리는 문제 → 카드 스택 느낌은 유지하면서 부드럽게

## 1. 헤더보다 뒤로 보내기 (z-index/스택 컨텍스트)

`src/components/hero-stack-carousel.tsx`의 캐러셀 루트 컨테이너에 스택 컨텍스트를 격리합니다.

- 루트 `<div className="relative md:overflow-visible">` → `relative z-0 isolate md:overflow-visible`
- `isolate`(isolation: isolate)가 새 스택 컨텍스트를 생성해, 내부 카드의 `zIndex: 30/40`이 더 이상 바깥으로 새어나가지 않습니다. 캐러셀 전체가 일반 흐름(z-0)에 놓여 `sticky z-20` 헤더 아래에 그려집니다.
- 헤더(`src/routes/_main.tsx`)는 변경 없음.

## 2. 전환 부드럽게 (스냅/점프 제거)

현재 구조의 핵심 결함: 진입 카드는 CSS keyframe으로 움직이고, `onAnimationEnd`에서 `setCurrent`로 인덱스를 교체하는 순간 모든 카드의 depth 위치가 한꺼번에 재계산되며 스냅(점프)이 발생합니다. keyframe 시작값과 스택 위치값의 불연속도 끊김의 원인입니다.

해결: keyframe 애니메이션과 인덱스 점프를 없애고, **transform 기반 단일 transition 모델**로 통일합니다.

- `incoming` 상태와 `hero-slide-over-*` keyframe 사용 제거(CSS 키프레임도 정리).
- 각 카드의 위치는 `current` 기준 offset에 따라 `depthStyle(offset)` 하나로만 결정하고, 모든 카드에 동일한 `transition: transform/opacity 600ms cubic-bezier(0.22,1,0.36,1)` 적용.
- `go(dir)` 호출 시 `setCurrent`만 변경 → offset이 바뀌며 모든 카드가 같은 transition으로 한 번에 자연스럽게 이동(앞 카드는 옆으로 빠지고 뒤 카드가 앞으로 올라옴).
- 연타 방지를 위해 전환 시간 동안 `animatingRef`로 잠그고 `setTimeout`(전환 시간)으로 해제.
- depthStyle에 살짝의 회전/그림자 단계를 유지해 "겹쳐진 카드 스택" 입체감은 그대로 유지.
- `prefers-reduced-motion`에서는 transition 시간을 0~200ms로 축소.

### 기술 세부

```text
상태: current(number), animatingRef
이동: go(dir) → if animatingRef return; setCurrent((c+dir+count)%count); lock; setTimeout(unlock, DURATION)
렌더: 각 슬라이드 offset=(i-current+count)%count → style=depthStyle(offset), 공통 transition
```

- 파일: `src/components/hero-stack-carousel.tsx` (로직/스타일 수정)
- 파일: `src/styles.css` (`hero-slide-over-right/left` keyframe 및 관련 utility 정리)

## 검증

- 홈(`/home`)에서 이전/다음 버튼으로 슬라이드를 빠르게/천천히 넘기며 끊김·점프 없는지 확인
- 스크롤 시 히어로 카드가 헤더 뒤로 들어가는지 확인
