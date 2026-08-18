# 모바일 카드: 제목과 작성자 정보를 분리 + PostListCard 추출

모바일 화면에서 일반/공지 카드의 제목과 작성자명·레벨·배지가 한 줄을 공유해 제목이 "[보건] 키..."처럼 과도하게 잘리는 문제를 해결합니다. 모바일에서는 제목이 전체 폭을 쓰고, 작성자 정보는 별도 행으로 분리합니다. 동시에 공지·일반 카드의 중복 마크업을 하나의 `PostListCard` 컴포넌트로 추출합니다.

## 동작

- 모바일(<sm): 카드 내부를 세로(`flex-col`)로 배치.
  - 1행: 제목이 전체 폭을 차지, `line-clamp-2`로 두 줄까지 표시.
  - 2행: 작성자명 + Lv + 펼친 배지를 왼쪽에, 댓글 수를 오른쪽에 배치.
  - 조회수는 모바일에서 계속 숨김(기존 `hidden sm:flex` 유지).
- 데스크톱(sm 이상): 기존처럼 가로 한 줄로 제목(왼쪽)과 메타 정보(오른쪽)를 배치.
- 작성자명은 `min-w-0` + `truncate`, 배지는 `expand`로 전체 표시.

## 기술 사항

- 새 파일 `src/components/PostListCard.tsx`
  - props: 제목 노드(뱃지/말머리 포함), 작성자, `profileMap`, 조회수, 댓글 수, 공지 여부, 링크 `to`/`params`, 부가 클래스.
  - 내부 레이아웃: `flex-col sm:flex-row sm:items-center`, 제목 `flex-1 min-w-0 line-clamp-2`, 메타 `w-full sm:w-auto sm:shrink-0`.
  - 작성자 행: `User` 아이콘 + `truncate` 이름 + `AuthorBadge only="level"` + `AuthorBadge only="awards" expand`.
  - 조회수는 `hidden sm:flex`, 댓글 수는 항상 표시(`shrink-0`).
- `src/routes/_main.board.$slug.index.tsx`
  - 공지(`notices`)와 일반(`pagedGenerals`) 렌더링을 `PostListCard` 호출로 교체하고 중복 마크업 제거.
- `src/routes/_main.guide.tsx`
  - 게시판 목록 카드의 모바일 레이아웃 변경을 사용자 가이드에 반영.

## 영향 범위

- 순수 마크업/CSS 리팩터링. 서버·DB·API·권한 변화 없음.
- 링크/프로젝트/문제ZIP/투표 카드는 구조가 달라 이번 변경 대상 제외.

## 검증

- 모바일 좁은 폭에서 제목이 한 줄 전체를 사용하는지 확인.
- 작성자명+레벨+배지가 제목 아래 별도 행으로 나타나는지 확인.
- 데스크톱 기존 가로 레이아웃 유지 및 조회수 표시 확인.
- 가로 스크롤이 발생하지 않는지 확인.
