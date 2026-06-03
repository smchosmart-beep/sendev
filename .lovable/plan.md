## 카드 클릭 무반응 + 하이드레이션 오류 수정

### 근본 원인
`BoardDetailPage`에서 `unlocked` 초기 상태를 렌더링 중에 `sessionStorage`로 읽음
→ 서버는 항상 `false`(게이트 화면), 클라이언트는 `true`(목록 화면)로 렌더링 결과가 달라짐
→ 하이드레이션 불일치 발생 → React가 트리를 재생성하며 `<Link>` 이벤트 핸들러가 정상 연결되지 않음
→ 산출물 카드를 눌러도 페이지 이동이 일어나지 않음.

### 해결 방법
SSR과 클라이언트 첫 렌더 결과를 동일하게 맞추는 "mounted" 패턴 적용.

1. `src/routes/_main.board.$categoryId.tsx`
   - `unlocked` 초기값을 항상 `false`로 시작.
   - `useEffect`로 마운트 이후에 `sessionStorage`를 읽어 `unlocked`를 갱신.
   - 비밀번호가 있는 게시판은 마운트 직후 잠깐 게이트가 보였다가 해제되므로, 첫 렌더에서 깜빡임을 줄이기 위해 `mounted` 플래그가 false인 동안에는 콘텐츠 영역을 렌더링하지 않거나 로딩 상태로 처리.

2. `src/routes/admin.tsx`
   - 동일한 패턴: `granted` 초기값을 `false`로 두고 `useEffect`에서 `sessionStorage`를 읽어 갱신하여 잠재적 하이드레이션 불일치 예방.

### 변경 대상 파일
- `src/routes/_main.board.$categoryId.tsx`
- `src/routes/admin.tsx`

### 검증
- 비밀번호로 입장한 게시판에서 산출물 카드 클릭 시 상세 페이지로 정상 이동하는지 확인.
- 콘솔에 하이드레이션 오류가 더 이상 나오지 않는지 확인.