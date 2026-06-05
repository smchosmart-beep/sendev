## 목표
댓글에 첨부된 이미지를 클릭하면 새 탭으로 여는 대신, 앱 내 모달(라이트박스)로 크게 확인할 수 있게 한다.

## 변경 사항 (`src/routes/_main.board.$slug.$postNo.tsx`)

### 1. 라이트박스 모달 상태
- 댓글 영역 상위(`CommentsSection`)에 선택된 이미지 URL 상태(`lightboxUrl`)를 두고, 값이 있으면 `Dialog`로 원본 이미지를 크게 표시.
- 모달 내용: 어두운 배경 위 이미지를 화면에 맞게(`max-h`/`max-w`, `object-contain`) 표시, 닫기 버튼. 이미 import된 `Dialog`/`DialogContent` 재사용.

### 2. 썸네일 클릭 동작 변경 (`CommentItem`)
- 기존 `<a target="_blank">`를 `<button>`으로 교체. 클릭 시 새 탭 대신 `onImageClick(url)` 콜백 호출 → 라이트박스 열림.
- `CommentItem`에 `onImageClick` prop 추가, 댓글 목록 렌더링부에서 전달.

### 3. 접근성/UX
- 모달은 ESC·바깥 클릭으로 닫힘(Dialog 기본 동작).
- 썸네일에 커서 포인터, hover 효과 유지.

## 검토 사항
- 첨부 방식·저장 구조 변경 없음(표시 동작만 변경).
- 게시글 본문 이미지 등 다른 영역은 영향 없음(요청 범위인 댓글 이미지에 한정).