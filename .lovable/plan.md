## 목표
모바일에서 이전글/다음글 버튼의 글 제목이 두 줄로 줄바꿈되어 넘치는 문제를 해결한다. 현재 스크린샷처럼 "입문형 2기(초등) 투표 및 시상" 같은 긴 제목이 버튼 안에서 줄바꿈된다.

## 원인
`src/routes/_main.board.$slug.$postNo.tsx`의 `PostNavSection`에서 제목 span에 `truncate`가 있으나, `Button asChild`로 렌더되는 `Link`(flex 컨테이너)에 `min-w-0`가 없어 자식이 줄어들지 못하고 제목이 두 줄로 흐른다.

## 변경 (`src/routes/_main.board.$slug.$postNo.tsx`)
- 이전글 `Link`(line 499)와 다음글 `Link`(line 516)에 `min-w-0 overflow-hidden` 추가하여 그리드 셀 폭을 넘지 않게 함.
- 제목 span(line 503, 519)은 `truncate`를 유지(필요 시 `whitespace-nowrap` 명시)하여 한 줄 말줄임 처리.
- 동작은 모바일/데스크탑 동일하게 한 줄 말줄임이 되며, 그리드 셀이 좁은 모바일에서 오버플로우가 사라진다.

## 가이드 업데이트
이번 변경은 시각적 오버플로우 수정이며 기능 동작 변화가 없으므로 `/guide` 문서 수정은 불필요.