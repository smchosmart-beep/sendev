## 문제

댓글 첨부 이미지 썸네일이 `h-24 w-24` 고정 정사각형(1:1)이라, 모바일에서 2열로 배치될 때 각 셀이 컬럼 너비를 채우지 못하고 오른쪽 공간이 낭비됩니다.

## 해결

`CommentItem`의 썸네일 영역(`comment.imageUrls.map`)을 고정 정사각형 대신 반응형 그리드로 변경합니다.

- 컨테이너: `flex flex-wrap` → `grid grid-cols-2 sm:grid-cols-3 gap-2`로 변경해 모바일 2열 / 넓은 화면 3열로 셀이 컬럼 너비를 채우게 함.
- 각 썸네일 버튼: `h-24 w-24` 제거하고 `w-full`로 컬럼 너비를 채움. 정사각형 강제 대신 원본 비율을 살리도록 이미지를 `h-auto object-contain`(또는 적당한 `aspect` 없이 자연 높이)으로 표시. 이미지가 컬럼 폭에 맞춰 들어가고 세로는 비율대로 늘어남.
- 라이트박스 열기(onImageClick), hover 효과, 테두리/라운드 스타일은 그대로 유지.

`src/routes/_main.board.$slug.$postNo.tsx` 한 곳만 수정합니다.
