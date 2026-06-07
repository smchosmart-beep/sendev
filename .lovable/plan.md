## 목표
AuthorBadge 컴포넌트의 대표 배지("시스템 관리자" 등)와 "+N" 칩에 마우스 오버 시 클릭을 유도하는 인터랙티브 애니메이션을 추가한다.

## 변경 범위
- 파일: `src/components/AuthorBadge.tsx`

## 세부 작업
1. **대표 배지 span**에 `hover:scale-105`, `transition-transform`, `duration-200`, `hover:shadow-md` 추가
2. **"+N" 칩 span**에 동일한 `hover:scale-105`, `transition-transform`, `duration-200`, `hover:shadow-md` 추가 (또는 살짝 더 강조된 `hover:scale-110`)
3. **버튼 wrapper**에 `cursor-pointer` 명시 및 `transition-all` 적용
4. **선택적 효과**: hover 시 `ring-1 ring-primary/30` 또는 배경색 강화로 클릭 가능함을 시각적으로 강조
5. 프로젝트 내 기존 `.hover-scale` 유틸리티 클래스 활용 검토 (적용 가능 시 사용)

## 품질 기준
- 마우스 오버 시 요소가 살짝 커지고 그림자가 진해져야 함
- 애니메이션이 200ms 내외의 짧은 duration으로 부드럽게 동작해야 함
- Popover 열기 기능과 충돌 없이 정상 작동해야 함