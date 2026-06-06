## 목표
질문게시판과 일반게시판의 글이 많아질 경우를 대비해, 각 게시판 목록에 페이지네이션을 추가합니다. 공지사항·산출물·링크는 그대로 둡니다.

## 동작 방식
- 데이터는 이미 한 번에 모두 불러오고 있으므로(`postsQueryOptions`), 추가 서버 호출 없이 **클라이언트 측 페이지네이션**으로 구현합니다.
- 한 페이지당 표시 글 수: **10개**.
- 질문게시판과 일반게시판이 같은 화면에 있으므로 페이지 상태를 각각 분리합니다.
  - URL 검색 파라미터로 관리: `qpage`(질문), `gpage`(일반).
  - URL에 두면 새로고침·공유 시에도 페이지가 유지됩니다.
- 표시할 글이 한 페이지(10개) 이하이면 페이지네이션 UI는 숨깁니다.

## 구현 세부사항 (기술)
파일: `src/routes/_main.board.$slug.index.tsx`

1. `validateSearch` 추가 (zod + `@tanstack/zod-adapter`의 `fallback`):
   - `qpage: fallback(z.number().int().min(1), 1).default(1)`
   - `gpage: fallback(z.number().int().min(1), 1).default(1)`
2. `BoardInner`에서 `Route.useSearch()`와 `useNavigate()` 사용.
3. 질문/일반 목록을 각각 `slice((page-1)*10, page*10)` 으로 잘라서 렌더링.
4. 목록 하단에 기존 `src/components/ui/pagination.tsx` 컴포넌트로 페이지 이동 UI 추가. 페이지 변경 시 `navigate({ search: (prev) => ({ ...prev, qpage: n }) })` 형태로 해당 파라미터만 갱신.
5. 페이지 수 = `Math.ceil(목록길이 / 10)`. 페이지 번호 버튼(많을 경우 ellipsis 포함)과 이전/다음 버튼 표시. 이전/다음은 한국어("이전"/"다음")로 라벨 조정.

기존 카드/목록 스타일과 간격은 그대로 유지합니다.