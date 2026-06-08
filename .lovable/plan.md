## 목표
게시글 본문에 들어가는 링크 미리보기 카드의 OG 이미지를 정사각형이 아닌 **16:9 비율**로 표시합니다.

## 원인
`src/routes/_main.board.$slug.$postNo.tsx`의 `LinkPreviewCard`(449번째 줄)에서 이미지 영역이 데스크톱(`sm` 이상)에서 `sm:aspect-square sm:w-40`로 정사각형이 됩니다. 모바일은 이미 `aspect-video`(16:9)입니다.

## 변경 내용
### `src/routes/_main.board.$slug.$postNo.tsx`
- 이미지 컨테이너 클래스를 수정해 데스크톱에서도 16:9를 유지하도록 변경:
  - 기존: `flex aspect-video w-full ... sm:aspect-square sm:w-40`
  - 변경: `aspect-square` 제거하고 모든 화면에서 `aspect-video` 유지, 데스크톱에서는 고정 너비(예: `sm:w-64`)로 가로형 카드가 자연스럽게 보이도록 조정.

이미지가 없을 때의 아이콘 표시, 나머지 카드 레이아웃·텍스트는 그대로 둡니다.

## 범위 밖
- DB·서버·OG 메타 로직 변경 없음(표시 비율만 조정).
- 가이드 문서는 비율 표현 등 사용법 변화가 없어 수정 불필요.
