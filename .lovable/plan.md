## 목표
가이드 페이지(`src/routes/_main.guide.tsx`)에 문서 내 검색 기능을 추가한다. 검색어 입력 시 본문의 일치 단어를 모두 강조하고, 같은 단어가 여러 곳이면 다음/이전(또는 Enter/Shift+Enter)으로 순차 이동·순환한다.

## 안전 방식 — CSS Custom Highlight API
DOM 구조를 전혀 변형하지 않아 React 리렌더 충돌이 원천 차단되는 `CSS.highlights` 방식을 사용한다.

- 가이드 본문 전체를 `ref` 컨테이너로 감싼다(기존 JSX·`<strong>` 구조 그대로 유지).
- 검색 시 컨테이너 내부 **텍스트 노드만 TreeWalker로 순회**해 일치 구간의 `Range`들을 만든다. DOM은 건드리지 않는다.
- 전체 일치 강조용 `Highlight`와 현재 활성 1건 강조용 `Highlight`를 `CSS.highlights`에 등록한다.
- 강조 스타일은 `::highlight(...)`를 `src/styles.css`에 추가하고 디자인 토큰 색만 사용(전체: 은은한 강조, 활성: 대비 강조). 하드코딩 색 금지.

## 동작
- 목차 위 상단에 검색창(입력 + 이전/다음 버튼 + `현재/전체` 카운트) 배치.
- 입력은 디바운스 처리, 대소문자 무시.
- Enter=다음, Shift+Enter=이전, 끝에서 처음으로 순환.
- 활성 항목은 `range.startContainer`의 부모 요소로 `scrollIntoView({block:"center"})` (헤더 가림 방지).
- 검색어를 비우면 모든 highlight 해제.

## 안전장치
- 모든 DOM 접근은 `useEffect`(클라이언트 전용)에서만 → SSR/하이드레이션 무영향.
- `CSS.highlights` 미지원 브라우저는 검색 UI를 숨기거나 무동작(기능 degrade)으로 처리해 오류 없음.
- 서버 호출/DB/네트워크 없음 → 서버 비용 영향 없음.
- 목차 앵커(`#id`)·`scroll-mt` 등 기존 동작과 독립.

## 대상 파일
- `src/routes/_main.guide.tsx` — 검색 UI + Highlight 로직
- `src/styles.css` — `::highlight()` 강조 스타일(토큰 기반)

## 가이드 자체 업데이트
- "검색 기능" 섹션(또는 인접 안내)에 "가이드 페이지 상단 검색창으로 문서 내 단어를 찾아 순차 이동할 수 있다"는 설명 한 줄 추가.
