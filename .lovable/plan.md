## PC 키보드 방향키로 이전글/다음글 이동

### 작업 개요
게시글 상세 페이지(PC)에서 좌우 방향키로 이전글/다음글을 이동할 수 있게 한다. 이미 모바일 스와이프와 `usePostNav` 훅이 구현되어 있으므로 키보드 이벤트 연결만 추가하면 된다.

### 변경 파일

1. **`src/hooks/useKeyboardNavigation.ts` (신규)**
   - `onArrowLeft` / `onArrowRight` 콜백을 받는 훅.
   - `keydown` 이벤트 리스너 등록/해제.
   - 입력 요소(`input`, `textarea`, `select`, `[contenteditable]`)에 포커스가 있을 때는 이벤트를 무시한다.
   - 콜백이 `null`이면 해당 방향키를 아무것도 하지 않는다.

2. **`src/routes/_main.board.$slug.$postNo.tsx`**
   - `useKeyboardNavigation` 임포트.
   - `ProjectDetailPage`에서 `usePostNav(post, slug)` 결과를 재사용해 `useKeyboardNavigation`에 연결:
     - `ArrowRight` → `newer`(다음글)
     - `ArrowLeft` → `older`(이전글)
   - 키 이벤트가 페이지 전체에서 동작하도록 `useEffect` 기반으로 구현.

3. **`src/routes/_main.guide.tsx`**
   - 가이드 문서에 "PC에서는 좌우 방향키(← →)로 이전글/다음글을 이동할 수 있어요" 문구 1줄 추가.

### 기술 상세
- 키보드 훅은 `document` 레벨 리스너를 사용해 페이지 어디서나 작동하되, 입력 중인 상태에서는 무시한다.
- 기존 `usePostNav` 훅을 그대로 재사용하므로 이전글/다음글 계산 로직은 중복되지 않는다.
- `useNavigate`는 `ProjectDetailPage`에서 이미 가져오고 있으므로 추가 import 불필요.