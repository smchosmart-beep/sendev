# 카드 작성자 이름 줄바꿈 방지 — title 속성 추가

## 배경

이전 작업에서 작성자 이름이 글자 중간에서 줄바꿈되는 문제를 `truncate`/`min-w-0`로 해결했다. `plan-check`에서 부작용을 검토한 결과, 유일한 완화 사항은 "긴 닉네임이 `…`로 잘려 전체가 안 보일 수 있음"이었다.

## 이번 변경 (1번 완화만 적용)

잘린 작성자 이름에 `title` 속성을 추가해 마우스 오버 시 전체 닉네임이 보이도록 한다. 레이아웃·데이터·쿼리 변경은 없다.

## 적용 위치

`src/routes/_main.board.$slug.index.tsx`의 카드 컴포넌트들:
- `LinkCard` — 작성자 span (864-868행)
- `ProjectCard` — 작성자 span (931-936행)
- `ProblemCard` — 작성자 span (666-669행)
- 공지/일반게시글 카드의 작성자 span (321-362, 365-433행)

각 작성자 이름 텍스트를 감싼 요소(또는 AuthorBadge가 놓인 부모 span)에 `title={post.author}`(또는 `{n.author}`/`{g.author}`)을 추가한다.
