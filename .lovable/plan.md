# 히어로 캐러셀: "옆으로 빠진 뒤 위로 덮기" 전환 복원

## 목표
현재는 다음 카드가 뒤에서 페이드인되며 앞으로 올라옵니다. 이를 **다음 카드가 옆으로 한 번 빠졌다가 호를 그리며 앞장 위로 덮어오는** 동작으로 바꿉니다. 기존의 부드러움과 카드 스택 깊이감은 유지합니다.

## 핵심 아이디어
transition 보간만으로는 z-index가 전환 도중 위로 올라가는 "덮어오는" 경로가 표현되지 않습니다. 그래서 **전환되는 동안 들어오는 카드(incoming)에만 keyframe 애니메이션**을 입혀, 잠깐 최상단 z-index로 올린 채 옆→위 경로로 이동시키고, 나머지 카드들은 지금처럼 depth 보간으로 부드럽게 한 칸씩 밀려납니다.

## 변경 사항

### `src/components/hero-stack-carousel.tsx`
- `go(dir)` 호출 시 어떤 카드가 새로 앞으로 오는지(incoming index)와 방향을 state로 기록.
- 렌더링 시 incoming 카드는 일반 depth 스타일 대신 keyframe 애니메이션 클래스를 적용:
  - 1단계: 옆으로 빠짐 (방향에 따라 좌/우로 `translateX`, 약간 축소·회전)
  - 2단계: 호를 그리며 중앙·앞장 위로 이동 (`translateX(0)`, scale 1, 최상단 z-index)
- 애니메이션 동안 incoming 카드 `zIndex`를 50(헤더보다 낮은 50 미만 유지 위해 컴포넌트 내부 기준 최상단)으로 올려 앞장을 확실히 덮도록 함.
- 나머지 비-incoming 카드는 기존 `depthStyle` + `transition-all`로 한 칸씩 뒤로 밀려나는 부드러운 보간 유지.
- `DURATION`(600ms) 종료 후 incoming 표시를 해제하고 정적 depth 상태로 정착.
- `prefers-reduced-motion`에서는 keyframe 없이 즉시 정착(현재처럼 `motion-safe:` 가드 유지).
- 루트의 `z-0 isolate`는 그대로 두어 카드가 상단 sticky 헤더 위로 새지 않도록 유지.

### `src/styles.css`
- 방향별 keyframe 2종 추가 (다음/이전):
  - `hero-deal-next`: `translateX(0)` → 오른쪽으로 빠짐 → 중앙 위로 복귀
  - `hero-deal-prev`: 왼쪽 대칭 동작
- 각 keyframe은 transform(translateX/Y, scale, rotate)만 다루고 `cubic-bezier(0.22,1,0.36,1)` 이징으로 부드럽게.

## 기술 메모
- z-index는 전환 중에만 incoming 카드에 부여하고, 전환 종료 시 정상 depth z-index로 되돌려 깜빡임 방지.
- 빠른 연속 클릭은 기존 `animatingRef` 잠금으로 차단해 경로가 꼬이지 않게 유지.
- 순수 프론트엔드(컴포넌트 + CSS)만 수정하며 데이터/서버 로직은 건드리지 않습니다.