게시판 상단의 카테고리 카드와 검색 바를 한 행에 좌우 50:50으로 배치합니다.

## 변경 범위
- `src/routes/_main.board.$slug.tsx` (부모 레이아웃)
- `src/routes/_main.board.$slug.index.tsx` (게시판 목록 페이지)

## 현재 상태
- `src/routes/_main.board.$slug.tsx`에서 카테고리 카드만 전체 폭으로 렌더링하고, 그 아래 `<Outlet />`로 목록을 보여줍니다.
- `src/routes/_main.board.$slug.index.tsx`에서 검색 바(`BoardSearchBox`)를 최상단에 렌더링합니다.
- 검색 파라미터 스키마(`boardSearchSchema`)는 인덱스 라우트에만 정의되어 있습니다.

## 변경 내용
1. **검색 파라미터 스키마를 부모 라우트로 이동**
   - `boardSearchSchema`와 `BoardSearch` 타입을 `src/routes/_main.board.$slug.tsx`로 이동합니다.
   - 부모 라우트에 `validateSearch: zodValidator(boardSearchSchema)`를 추가합니다.
   - 인덱스 라우트의 `validateSearch`는 제거하고 부모로부터 상속받도록 합니다.

2. **검색 바를 부모 라우트로 이동**
   - `BoardSearchBox` 컴포넌트를 `src/routes/_main.board.$slug.tsx`로 이동합니다.
   - `src/routes/_main.board.$slug.index.tsx`에서는 검색 바를 제거하고, 목록/섹션 콘텐츠만 남깁니다.

3. **카테고리 카드 + 검색 바 50:50 배치**
   - `src/routes/_main.board.$slug.tsx`의 `BoardLayout`에서, 뒤로가기 링크 아래에 2열 그리드를 추가합니다.
   - 왼쪽 열: 카테고리 카드
   - 오른쪽 열: 검색 바
   - 그리드: `grid-cols-1 md:grid-cols-2 gap-4` (데스크탑 50:50, 모바일은 세로 스택)
   - 두 항목의 높이를 맞추기 위해 `items-stretch`를 적용하고, 검색 바 입력 높이를 카드와 균형 맞춥니다.

4. **검색 바는 게시판 목록(인덱스) 페이지에서만 노출**
   - `useRouterState`를 사용해 현재 활성 라우트가 인덱스 라우트(`/_main/board/$slug/`)인지 확인합니다.
   - 인덱스 라우트가 아닌 경우(글 상세, 글쓰기, 시리즈 등)에는 검색 바를 숨기고 카테고리 카드만 전체 폭으로 표시합니다.

## 부작용 검토
- **기능 회귀**: 검색 바의 `onChange`는 여전히 동일한 `useNavigate`와 `boardSearchSchema`를 사용하므로 검색 기능에는 변화가 없습니다. 인덱스 라우트도 부모의 `useSearch()`를 통해 파라미터를 계속 읽을 수 있습니다.
- **타입 안정성**: 스키마를 부모로 이동하더라도 인덱스 라우트가 동일한 스키마를 상속받으므로 기존 타입이 깨지지 않습니다.
- **기존 페이지 영향**: 인덱스가 아닌 페이지에서는 기존처럼 카테고리 카드만 상단에 표시되므로 레이아웃이 어색해지지 않습니다.
- **데이터/서버/인증**: 변경 없음, 순수 UI 및 라우트 구조 변경입니다.
- **사용자 가이드**: 검색 기능 자체는 동일하고, 검색 바의 위치만 변경되므로 가이드 업데이트는 불필요합니다.
