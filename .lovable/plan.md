# 카드 작성자 이름 줄바꿈 방지 (+ 타입 오류 정리)

목록 카드에서 작성자 이름이 "김승/현"처럼 글자 중간에서 두 줄로 쪼개지는 문제를 고칩니다.

## 원인

작성자 이름·레벨 배지·수상 배지가 한 줄(flex) 안에 함께 놓여 있어, 배지가 자리를 차지하면 이름 텍스트가 강제로 줄바꿈됩니다.

## 변경 내용

- 작성자 이름은 글자 중간에서 끊기지 않게 하고, 공간이 부족하면 이름 끝을 `…`로 생략.
- 배지(Lv., 수상)는 공간이 부족하면 이름 아래 줄로 자연스럽게 내려가도록 허용.
- 조회수는 오른쪽에 고정되어 축소되지 않게 처리.

## 함께 정리할 타입 오류

현재 프로젝트 전체에 남아 있는 타입 오류(이번 요청 이전부터 존재)가 있어 같이 정리합니다. 화면 동작에는 영향이 없지만 빌드 검사에서 계속 잡힙니다.

## 기술 메모

1. `src/routes/_main.board.$slug.index.tsx`의 LinkCard·ProjectCard 메타 줄
   - 바깥 `<p>`: `flex flex-wrap items-center gap-x-2 gap-y-1`, 조회수 span에 `shrink-0`.
   - 작성자 묶음 span: `flex min-w-0 flex-wrap items-center gap-1`, 아이콘 `shrink-0`.
   - 이름을 별도 span으로 분리해 `truncate whitespace-nowrap` 적용.
   - ProblemCard 작성자 줄에도 `min-w-0` + 아이콘 `shrink-0` 적용.
2. 타입 오류: `validateSearch: (search: Record<string, unknown>)` 시그니처 때문에 모든 `<Link to="/board/$slug">`·`navigate()`에서 `search` 지정이 필수로 요구됩니다. 해당 라우트들(`_main.board.$slug.index`, `_main.board.index`, `_main.calendar`, `_main.board.$slug.new-general`, `_main.search`)의 입력 타입을 `Record<string, unknown> | undefined` 형태로 바꿔 `search`를 선택 항목으로 되돌립니다. 반환값과 기본값 로직은 그대로라 런타임 동작 변화 없음.
