## 변경 사항

문제ZIP 카테고리 목록을 3x3(9개) 단위로 페이지네이션한다.

### 파일 수정
- `src/routes/_main.board.$slug.index.tsx`
  - 문제ZIP 전용 상수 `PROBLEM_PAGE_SIZE = 9` 신설 (기존 `PAGE_SIZE = 10`은 일반글 목록에서 그대로 사용).
  - 문제ZIP 관련 계산 3곳(`problemPageCount`, slice의 start/end, 최신순 좋아요 배치 조회 주석)에서 `PAGE_SIZE` → `PROBLEM_PAGE_SIZE`로 교체.

### 부작용
- 일반글 페이지네이션(10개)에는 영향 없음.
- 좋아요 배치 조회는 페이지당 항목 수만 10→9로 줄어들어 서버 부하 감소.
- 가이드 문서에는 페이지 크기 수치가 명시되어 있지 않아 추가 수정 불필요.