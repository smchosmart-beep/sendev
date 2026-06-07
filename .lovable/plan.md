## 현재 문제
홈 메뉴의 다가오는 이벤트 일정 카드 전체가 `<Link to="/calendar">`로 감싸져 있어, 지도를 클릭해도 이벤트가 상위 `<Link>`로 전파되어 캘린더 페이지로 이동합니다.

## 수정 내용

### 1. `src/routes/_main.home.tsx` — 지도 영역 이벤트 가로채기
- 지도 영역(`KakaoMap` 또는 fallback `div`)을 새로운 클릭 가능한 wrapper(`<div>`)로 감쌉니다.
- wrapper의 `onClick` 핸들러에서 `e.stopPropagation()` + `e.preventDefault()`를 호출하여 상위 `<Link>`의 이벤트 전파를 완전히 차단합니다.
- 동일한 핸들러에서 `window.open()`으로 카카오맵 링크(`https://map.kakao.com/link/map/{name},{lat},{lng}`)를 새 탭으로 엽니다.
- 지도 로드 성공 시와 실패(fallback) 시 모두 동일하게 동작하도록 처리합니다.
- wrapper에 `cursor-pointer` 스타일을 추가해 클릭 가능함을 시각적으로 표현합니다.

## 변경 범위
- `src/routes/_main.home.tsx` (지도 영역 약 15줄 수정)