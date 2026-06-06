# 모바일 글쓰기/수정 컨테이너 넘침 수정

## 문제
모바일 세로 화면에서 글 수정 모달(및 글쓰기 에디터)에 **긴 URL**을 붙여넣으면, 그 URL이 줄바꿈되지 않아 에디터 → 모달 컨테이너가 화면 밖으로 늘어납니다. 그 결과 좌우가 화면을 벗어나 잘려 보입니다.

## 원인
- `src/styles.css`의 `.tiptap-editor` 본문(p)과 링크(a, `display:inline-flex` 알약형)에 줄바꿈 규칙이 없어 긴 단어/URL이 끊기지 않음.
- 모달(`DialogContent`)과 에디터에 `min-width:0` / overflow 처리가 없어, 내부 콘텐츠가 넘치면 컨테이너 자체가 뷰포트보다 넓어짐.

## 작업

1. `src/styles.css` — `.tiptap-editor` 줄바꿈 보강
   - `.tiptap-editor`, `.tiptap-editor p`에 `overflow-wrap: anywhere; word-break: break-word;` 추가.
   - 링크 알약(`.tiptap-editor a`)이 긴 URL일 때 줄바꿈되도록 `max-width: 100%; overflow-wrap: anywhere; word-break: break-word;` 추가(필요 시 `white-space: normal`).

2. `src/components/PostEditor.tsx` — 에디터 컨테이너 폭 고정
   - 루트 `div`와 `EditorContent`에 `min-w-0`, `overflow-hidden`(가로) / `break-words` 적용해 부모 폭을 넘기지 않게 함.

3. `src/routes/_main.board.$slug.$postNo.tsx` — 수정 모달 폭/스크롤 고정
   - 수정 다이얼로그 `DialogContent`에 가로 넘침 방지(`overflow-hidden`)와 세로 스크롤(`max-h-[90vh] overflow-y-auto`) 적용, 폼/필드에 `min-w-0` 보장.

## 기대 결과
- 긴 URL/단어가 에디터 안에서 자동 줄바꿈되어 모달이 항상 화면 폭 안에 머무름.
- 모바일 세로 화면에서 좌우 컨테이너가 화면 크기에 맞게 고정.

## 기술 메모
- 글쓰기 전용 페이지(new-question/general/link/project)도 동일한 PostEditor를 쓰므로 함께 개선됨.
- 디자인 토큰/레이아웃 구조는 변경하지 않고 줄바꿈·overflow만 보정.
