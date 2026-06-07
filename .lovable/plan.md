## 목표
댓글/답글 입력창에 세로 스크롤바를 없애고, 내용이 길어지면 입력창 높이가 자동으로 늘어나도록(반응형) 변경합니다.

## 변경 대상
`src/routes/_main.board.$slug.$postNo.tsx` 의 두 개 `Textarea` (댓글 입력 1543줄, 답글 입력 1844줄).

## 구현 방법
1. 입력값(`content`)이 바뀔 때마다 textarea 높이를 내용에 맞게 조정하는 작은 로직을 추가합니다.
   - `ref`를 textarea에 연결하고, `onChange` 시 `el.style.height = "auto"` 후 `el.style.height = el.scrollHeight + "px"` 로 설정.
   - 또는 재사용을 위해 `useAutoResizeTextarea` 훅(또는 `AutoTextarea` 래퍼 컴포넌트)을 만들어 두 곳에서 사용.
2. 스크롤 제거: `className`에 `resize-none overflow-hidden` 추가, 고정 `rows`는 최소 높이 용도로 유지(`min-h`로 대체 가능).
3. 초기 렌더 및 값이 외부에서 초기화될 때(등록 후 비워질 때)도 높이가 다시 줄어들도록 `useEffect`로 `content` 변화에 반응.

### 기술 메모
- `maxLength={5000}` 등 기존 속성은 그대로 유지.
- 디자인 토큰/기존 `rounded-xl` 스타일 유지, 색상 추가 없음.
- 자동 높이 외 다른 동작(이미지 첨부, 등록 버튼)은 변경하지 않음.