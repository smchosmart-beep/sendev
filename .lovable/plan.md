## 목표
게시글 작성 에디터 툴바에 밑줄(underline) 서식 버튼을 추가한다.

## 배경
현재 에디터에는 굵게(Bold), 기울임(Italic), 제목, 목록, 링크, 이미지, 인용, 글자색, 글자크기 버튼이 있지만 밑줄 버튼은 없다.

## 작업 내용

1. **의존성 설치**
   - TipTap underline 확장이 필요: `@tiptap/extension-underline`를 설치한다.

2. **PostEditor.tsx 수정**
   - `Underline`을 `@tiptap/extension-underline`에서 import한다.
   - `lucide-react`의 `Underline` 아이콘을 import한다.
   - `useEditor`의 `extensions` 배열에 `Underline`을 추가한다.
   - 툴바에 "밑줄" 버튼을 추가한다. Bold/Italic 버튼 사이에 배치하며, `editor?.isActive('underline')`로 활성 상태를 표시하고 `toggleUnderline()` 명령을 실행한다.

3. **저장 및 렌더링 호환성 확인**
   - tiptap-markdown(`html: true`) 설정으로 인해 `<u>` 태그가 markdown에 그대로 저장된다.
   - 게시글 상세 페이지(`_main.board.$slug.$postNo.tsx`)의 `react-markdown` + `rehype-sanitize` 조합이 `<u>` 태그를 허용하는지 확인한다. 필요 시 sanitize 설정에 `u` 태그를 추가한다.
   - `styles.css`에 `post-content u` 및 `tiptap-editor u` 스타일이 필요한 경우 추가한다(기본적으로 브라우저가 underline을 렌더링하므로 대부분 불필요).