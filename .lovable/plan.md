## 문제

에디터에서 글자 색/크기를 바꾸면 화면엔 보이지만, 저장하면 검은색으로 나옵니다.

원인은 **저장 단계**에 있습니다. 색상/크기는 TipTap의 `textStyle` 마크(`<span style="color:...">`)로 적용되는데, 에디터가 내용을 마크다운으로 내보낼 때(`tiptap-markdown`의 `getMarkdown()`) `textStyle` 마크에 대한 직렬화 규칙이 없어서 span이 통째로 버려지고 글자만 남습니다. 그래서 저장된 본문엔 색 정보가 사라집니다. (렌더링 쪽은 이미 `<span style>`를 허용하므로 문제 없음.)

## 해결

`src/components/PostEditor.tsx`에서 `TextStyle` 확장에 마크다운 직렬화 규칙을 추가해, 색상(`color`)과 글자 크기(`fontSize`) 속성을 `<span style="...">`로 내보내도록 합니다.

- `TextStyle`을 `.extend()`로 감싸 `addStorage`에 마크다운 serialize(open/close)를 정의
  - `open`: `color`/`fontSize` 속성이 있으면 해당 style을 가진 `<span ...>` 태그 출력, 둘 다 없으면 빈 문자열
  - `close`: 열린 경우에만 `</span>` 출력
- 확장 배열에서 기존 `TextStyle` 대신 새 확장을 사용
- `Color`, `FontSize` 확장은 그대로 두되 `types`가 새 textStyle 마크를 가리키도록 유지

## 검증

- 에디터에서 색/크기 변경 후 저장 → 상세 페이지에서 색/크기 유지되는지 확인
- 기존(색 없는) 글이 정상적으로 보이는지 확인

## 가이드 업데이트

이 변경은 내부 버그 수정이라 사용자 가이드(/guide)에 새 사용법 추가는 불필요. 단, 가이드에 글자 색/크기 관련 설명이 이미 있다면 그대로 유효하므로 별도 수정 없음.