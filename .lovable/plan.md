## 모바일 링크 미리보기 카드 오버플로우 방지

### 문제
`LinkPreviewCard`에서 `apple-style-2cwucwxm1-seoulbin-s-projects.vercel.app` 같은 긴 무공백 URL이 제목/사이트명 영역에서 카드 폭을 넘쳐 넘친다. 제목은 `line-clamp-2`만 있고 단어 줄바꿈 처리가 없으며, 사이트명 줄의 `truncate`도 안정적으로 적용되지 않는다.

### 변경 파일
**`src/routes/_main.board.$slug.$postNo.tsx`** — `LinkPreviewCard` 내부만 수정

1. 제목 `<span>`(line 1038): `line-clamp-2`에 `break-words [overflow-wrap:anywhere]` 추가해 긴 단어가 카드 폭 안에서 줄바꿈되도록 한다.
2. 사이트명 `<span>`(line 1041): 현재 flex 컨테이너에 `truncate`가 직접 걸려 있어 아이콘+텍스트 구조에서 말줄임이 불안정하다. 텍스트를 `min-w-0`/`truncate`가 적용된 내부 `<span>`으로 감싸 한 줄 말줄임이 확실히 동작하게 한다.

### 기술 상세
- 레이아웃/색상 토큰은 그대로 두고 오버플로우 관련 유틸 클래스만 추가하는 순수 프레젠테이션 수정.
- 가이드 페이지는 사용법 변화가 없어 업데이트 불필요.