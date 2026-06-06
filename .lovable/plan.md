## 문제
모바일에서 게시글 검색 페이지(`/search`)의 검색 버튼이 화면 오른쪽 밖으로 벗어납니다.

## 원인
`src/routes/_main.search.tsx`의 검색 입력 영역에서 입력칸이 `flex-1`만 지정되어 있고 `min-w-0`가 없습니다. flex 항목의 기본 `min-width: auto` 때문에 좁은 화면에서 입력칸이 줄어들지 못하고, 옆의 "검색" 버튼을 화면 밖으로 밀어냅니다.

## 수정 (UI 전용)
`src/routes/_main.search.tsx`의 검색 폼 내 `<div className="flex gap-2">` 영역만 수정:
- 입력칸(`<input>`)에 `min-w-0` 추가해 좁은 화면에서도 줄어들도록 함.
- "검색" 버튼이 줄어들지 않도록 `shrink-0` 추가.
- (선택) 아주 좁은 화면 대응을 위해 버튼은 그대로 두되 레이아웃이 컨테이너 안에 머물도록 보장.

다른 동작/로직은 변경하지 않습니다.</parameter>
<parameter name="summary">검색 페이지 입력칸에 min-w-0 추가해 모바일에서 검색 버튼 화면 이탈 수정