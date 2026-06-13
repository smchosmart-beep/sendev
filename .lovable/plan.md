## 모바일 오버플로우 방지 (링크 카드 + 이전글/다음글)

스크린샷에서 두 가지 가로 오버플로우가 보입니다.
1. 본문 안 링크 미리보기 카드: 긴 URL 제목(`apple-style-...vercel.app`)이 카드/화면 밖으로 삐져나감.
2. 이전글/다음글 버튼: 긴 제목이 줄어들지 않고 서로 겹쳐 보임.

원인은 긴 URL처럼 공백 없는 문자열이 줄바꿈되지 않고 카드 너비를 밀어내, flex 자식의 `truncate`/`line-clamp`가 제대로 동작하지 못하는 데 있습니다.

### 변경 파일: `src/routes/_main.board.$slug.$postNo.tsx`

**1) `LinkPreviewCard` (제목/주소 줄바꿈 강제)**
- 바깥 `<a>`에 `overflow-hidden` 추가하여 카드 자체가 컨테이너를 넘지 않게 함.
- 제목 `<span>`(현재 `line-clamp-2 break-words [overflow-wrap:anywhere]`)에 `break-all`을 더해, 하이픈 없는 긴 URL 토큰도 강제로 줄바꿈되도록 보강.
- 텍스트 래퍼 `<span className="flex min-w-0 flex-1 ...">`는 이미 `min-w-0`이 있으므로 유지.

**2) `PostNavSection` 이전글/다음글 버튼**
- `<nav>`를 모바일에서 안전하게: `grid grid-cols-2 gap-3` 형태로 두 칸을 고정폭(각 1fr, `minmax(0,1fr)`)으로 나눠 자식이 절대 넘치지 않게 함.
- 각 `Button`의 안쪽 제목 `<span>`은 `truncate`를 유지하되, 부모 flex 컨테이너에 `min-w-0`/`overflow-hidden`이 확실히 걸리도록 확인·보강하여 긴 제목이 옆 버튼을 침범하지 않게 함.

### 검증
- 빌드 후 미리보기를 모바일 폭(약 384px)으로 열어 링크 카드 제목이 카드 안에서 줄바꿈/말줄임 되는지, 이전글/다음글 버튼 제목이 각 칸 안에서 한 줄 말줄임 되는지 확인.

### 가이드 페이지
- 이번 변경은 순수 레이아웃 오버플로우 수정으로 기능 추가/변경이 없어 `/guide` 문서 업데이트는 불필요(없음).
