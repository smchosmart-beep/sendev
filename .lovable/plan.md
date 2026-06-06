## 목표
전체 게시글을 **제목 / 제목+내용 / 작성자** 기준으로 검색할 수 있는 기능을 추가합니다. 검색창은 메뉴의 "Hello, World"와 "관리자" 사이에 배치합니다.

## 검색 동작
- 검색 대상: 모든 카테고리의 모든 글(공지·질문·일반·산출물·링크).
- 검색 유형 3가지(드롭다운으로 선택):
  - 제목: 제목에서만 검색
  - 제목+내용: 제목 또는 본문에서 검색
  - 작성자: 작성자 이름에서 검색
- 대소문자 구분 없이 부분 일치(`ilike '%검색어%'`).
- 검색 결과는 전용 페이지(`/search`)에 목록으로 표시하고, 각 결과를 클릭하면 해당 글로 이동합니다.

## 검색창 위치 / UI
- 모바일 메뉴(Sheet)와 데스크톱 헤더 모두에 검색 영역을 추가하되, **"Hello, World" 항목과 "관리자" 항목 사이**에 배치합니다.
- 검색창 구성: 검색어 입력칸 + 검색 유형 선택(제목 / 제목+내용 / 작성자) + 검색 버튼(돋보기).
- 검색 실행 시 `/search?q=검색어&mode=유형` 으로 이동하고, 모바일에서는 메뉴 Sheet를 닫습니다.

## 구현 세부사항 (기술)

### 1. 서버 검색 함수 — `src/lib/platform.functions.ts`
- `searchPosts` 서버 함수 추가 (`createServerFn`, GET).
- 입력 검증(zod): `q`(1~100자), `mode`(`"title" | "title_content" | "author"`).
- `posts`를 조회하면서 `categories`(slug, name)를 조인해, 결과를 링크로 만들 수 있게 `slug`와 카테고리 이름을 포함.
- mode에 따라 `ilike` 필터 적용:
  - title → `title.ilike`
  - title_content → `or(title.ilike, content.ilike)`
  - author → `author.ilike`
- 최신순 정렬, 최대 100건 제한. 댓글 수도 기존 `mapPost` 방식으로 집계.
- 반환 타입: `PostDTO` + `{ categorySlug, categoryName }` 형태의 검색 결과 DTO.

### 2. 쿼리 옵션 — `src/lib/platform.queries.ts`
- `searchPostsQueryOptions(q, mode)` 추가. `enabled: q.trim().length > 0`.

### 3. 검색 결과 라우트 — `src/routes/_main.search.tsx` (신규)
- `validateSearch`로 `q`(문자열), `mode`(3가지, 기본 title) 파싱.
- `useQuery`로 `searchPosts` 호출(공개 라우트이므로 loader 대신 컴포넌트에서 호출).
- 상단에 검색 유형 토글 + 입력칸(현재 검색어/유형 반영, 재검색 가능).
- 결과 목록: 글 제목, 작성자, 카테고리 이름 표시. 각 항목은 `/board/$slug/$postNo`로 이동.
- 검색어 없음/결과 없음일 때 `EmptyState` 표시.
- `errorComponent`, `notFoundComponent` 정의.

### 4. 메뉴에 검색창 추가 — `src/routes/_main.tsx`
- 모바일 Sheet 메뉴: boardTabs 렌더 뒤(= "Hello, World" 다음), "관리자" 링크 앞에 검색 입력 + 유형 드롭다운 + 검색 버튼 배치.
- 데스크톱 헤더: "관리자" 설정 아이콘 앞에 동일한 검색 영역(아이콘 버튼 형태로 컴팩트하게) 배치.
- 검색 상태는 로컬 `useState`로 관리하고, 제출 시 `navigate({ to: "/search", search: { q, mode } })` 실행 후 메뉴 닫기.
- 디자인 토큰(`bg-card`, `text-foreground`, `border-border` 등) 사용, 기존 스타일과 통일.

기존 게시판/페이지네이션 동작은 변경하지 않습니다.