## 목표
1. **목록에서 숨기기**된 폴더/카테고리를 완전히 제거하는 대신 **회색 비활성 상태(클릭 불가)**로 모든 사용자에게 표시한다.
2. 폴더의 펼침/접힘 상태를 **기기별로 기억**해(localStorage) 다시 방문해도 직전 상태를 유지한다.

대상 파일: `src/routes/_main.board.index.tsx`, `src/routes/_main.guide.tsx`

## 작업 내용

### 1. 숨김 → 비활성 표시 (`_main.board.index.tsx`)
- 현재 `visible` 필터에서 `isHiddenByChain`으로 **제외**하던 로직을 제거하고, 모든 항목을 렌더하되 `isHiddenByChain` 결과를 `disabled` 플래그로 넘긴다.
- `BoardCard`: `disabled`일 때
  - `<Link>` 대신 클릭 불가한 `<div>`로 렌더(이동 막음, `aria-disabled`).
  - 흐린 스타일 적용(`opacity-60`, `pointer-events-none`, `cursor-not-allowed`, muted 색), 하단 "바로 입장/비밀번호 입장" 문구를 "비활성" 표기로 대체.
- `FolderNode`: `disabled`일 때
  - 헤더는 펼침/접힘 토글은 가능하되 흐린 스타일로 표시(또는 토글도 비활성 — 아래 기술 메모 참고로 토글은 유지하고 시각만 흐리게).
  - 하위 항목은 부모가 disabled면 체인에 의해 자연히 모두 disabled로 표시됨.
- 미열람 배지(`unreadMap`)는 비활성 항목에서 표시하지 않음(혼동 방지).

### 2. 폴더 펼침 상태 기기별 기억 (`_main.board.index.tsx`)
- `FolderNode`의 `useState(true)`를 localStorage 연동으로 변경:
  - 키: `board-folder-open-${group.id}`.
  - 초기값: 저장된 값이 있으면 그 값, 없으면 기존처럼 `true`(펼침).
  - 토글 시 localStorage에 즉시 저장(`"1"`/`"0"`).
  - SSR 안전: 초기 렌더는 기본값(true)로, 마운트 후 `useEffect`로 저장값 반영(하이드레이션 불일치 방지).

### 3. 사용자 가이드 업데이트 (`_main.guide.tsx`)
- "목록에서 숨기기" 설명을 "완전히 사라지지 않고 회색 비활성 상태로 표시되며 클릭할 수 없다"로 갱신.
- "폴더 펼침/접힘 상태는 기기별로 기억되어 다음 방문 시 유지된다" 설명 추가.

## 기술 메모 / 부작용 대응
- **DB 변경 없음**: `hidden` 컬럼/서버 로직은 그대로, 프론트 표현만 변경.
- **접근성**: 비활성 카드는 `aria-disabled`와 비클릭 요소로 처리해 키보드/스크린리더에서도 비활성임이 드러나게.
- **폴더 토글 유지 여부**: 비활성 폴더라도 하위 구조를 볼 수 있게 토글 자체는 허용(시각만 흐림). 만약 토글도 막길 원하면 조정 가능.
- **localStorage 안전**: try/catch로 감싸 사생활 보호 모드 등에서 예외 무시.
- **기존 기능 영향 없음**: 이전/다음글, 댓글, 평가 등 다른 기능과 무관.
