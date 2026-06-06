# 게시글 목록 제목: 폰트 축소 + 두 줄 표시

## 문제
공지/질문/일반게시판 목록에서 제목이 `truncate`(한 줄 말줄임)로 표시돼, 모바일에서 제목이 너무 짧게 잘린다.

## 변경 사항
`src/routes/_main.board.$slug.index.tsx`의 세 섹션(공지 98행, 질문 145행, 일반 193행) 제목 `span` 클래스를 수정:

- `truncate` → `line-clamp-2` (최대 두 줄까지 표시 후 말줄임)
- 폰트 크기 축소: `text-sm` 추가

즉 `min-w-0 truncate font-medium text-foreground` → `min-w-0 line-clamp-2 text-sm font-medium text-foreground`

카드/댓글수/작성자 영역 등 다른 레이아웃은 그대로 유지된다.