# 카드 작성자 이름 줄바꿈 방지

목록 카드(링크 카드·산출물 카드)에서 작성자 이름이 "김승/현" 처럼 글자 중간에서 두 줄로 쪼개지는 문제를 고칩니다.

## 원인

작성자 이름·레벨 배지·수상 배지가 한 줄(flex) 안에 함께 있어, 배지가 자리를 차지하면 이름 텍스트가 강제로 줄바꿈됩니다.

## 변경 내용

- 작성자 이름은 절대 글자 중간에서 끊기지 않게 하고, 공간이 부족하면 이름 끝을 `…`로 생략 처리.
- 배지(Lv., 수상)는 공간이 부족하면 이름 아래 줄로 자연스럽게 내려가도록 허용.
- 조회수는 항상 오른쪽에 붙어 축소되지 않게 고정.

## 기술 메모

`src/routes/_main.board.$slug.index.tsx`의 LinkCard·ProjectCard 메타 줄:

- 바깥 `<p>`를 `flex flex-wrap items-center gap-x-2 gap-y-1`로, 조회수 span에 `shrink-0`.
- 작성자 묶음 span에 `flex min-w-0 flex-wrap items-center gap-1`.
- 이름을 별도 span으로 분리해 `truncate whitespace-nowrap` 적용, 아이콘에 `shrink-0`.
- 문제ZIP 카드(ProblemCard)의 작성자 줄에도 동일하게 `min-w-0` + 아이콘 `shrink-0` 적용.

시각 스타일·데이터 로직 변경 없음, 프론트엔드 레이아웃만 수정합니다.
