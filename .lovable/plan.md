## 목표
게시글 상세 페이지 **하단**에 **이전글 / 다음글** 버튼을 추가해, 목록으로 돌아가지 않고 같은 게시판의 같은 종류 글을 순서대로 넘겨본다.

선택 동작: **같은 종류만 이동** + **글 하단 배치**. 부작용 검토에서 나온 **서버 부하 보완**을 반영한다.

## 작업 내용

### 1. 가벼운 이웃 글 조회 서버 함수 추가 (`src/lib/platform.functions.ts`)
- 새 함수 `listPostNav` 추가: 입력 `{ slug, boardPassword?, adminPassword? }`.
- 해당 카테고리의 글에서 **`id, post_no, type, pinned, title, created_at`만** select(본문 content·댓글 집계 없음), `created_at desc` 정렬.
- 비밀번호 게시판은 기존 `boardAccessOk`(또는 동일 검증)로 접근 확인 후 빈 배열 반환.
- 가벼운 DTO 배열 반환(`PostNavItemDTO[]`: id, postNo, type, pinned, title).
- 기존 `listPosts`는 그대로 두어 목록 페이지에 영향 없음.

### 2. 쿼리 옵션 추가 (`src/lib/platform.queries.ts`)
- `postNavQueryOptions(slug, boardPassword)` 추가: `queryKey: ["post-nav", slug, boardPassword]`, `queryFn: () => listPostNav(...)`.

### 3. 상세 페이지에 이전/다음 네비게이션 (`src/routes/_main.board.$slug.$postNo.tsx`)
- `useQuery(postNavQueryOptions(slug, getBoardPassword(slug)))`로 가벼운 목록을 가져온다.
- 현재 글과 **같은 `type`**만 추리되, 게시글(post)은 목록과 동일하게 **pinned 그룹/일반 그룹을 분리**해 현재 글이 속한 그룹 안에서만 순서를 만든다.
- 배열에서 현재 글 위치를 찾아 바로 앞(다음글)·뒤(이전글)를 결정. (정렬이 최신순이므로 "이전글 = 더 오래된 글", "다음글 = 더 최신 글"로 라벨링.)
- 글 하단(좋아요 아래, 연재/댓글 위)에 카드형 네비게이션 렌더:
  - `<Link to="/board/$slug/$postNo" params=...>` 사용, 대상 글 제목 표시.
  - 한쪽 끝이면 해당 버튼 숨김/비활성.
- 데이터 로딩 중이거나 이웃이 없으면 영역 자체를 렌더하지 않아 깜빡임/오작동 방지.

```text
[ ← 이전글            다음글 → ]
  (더 오래된 글 제목)   (더 최신 글 제목)
```

### 4. 사용자 가이드 업데이트 (`src/routes/_main.guide.tsx`)
- "게시글 하단의 이전글/다음글 버튼으로 같은 게시판의 같은 종류 글을 순서대로 넘겨볼 수 있다" 설명 추가(가이드 동기화 규칙 준수).

## 기술 메모 / 부작용 대응
- **서버 부하**: 본문·댓글집계를 제외한 경량 컬럼만 조회하는 전용 함수 사용 → 글 하나 열 때 비용 최소화. 캐시 키 분리로 목록 쿼리와 독립.
- **기존 기능 영향 없음**: DB 변경 없음, `listPosts`/연재/댓글/조회수/평가 로직 미수정. 연재 네비와 역할이 달라 중복 동작 아님.
- **잠금 게시판 안전**: 통과한 비밀번호만 사용, 서버에서 접근 재검증.
- **엣지 케이스**: pinned/일반 그룹 분리 처리로 순서 어긋남 방지. 삭제·이동된 이웃 클릭 시 "글 없음"으로 자연 처리.
