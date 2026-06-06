# 이동 시 글 종류를 대상 게시판에 맞게 변환

## 문제
질문글을 일반게시판으로 이동해도 글의 `type`이 `question`으로 유지되어, 대상 카테고리의 질문 섹션이 꺼져 있으면 목록에 표시되지 않는다.

## 해결 방향
이동할 때 대상 게시판이 지원하는 종류로 글의 `type`을 자동 변환한다.
- 대상 게시판이 일반게시판(`enable_general`)을 지원하면 → `type = "general"`
- 아니면 질문게시판(`enable_question`)을 지원하면 → `type = "question"`
- (현재 모든 카테고리는 일반/질문 중 하나만 활성화되어 있어 규칙이 모호하지 않음)

또한 글이 안 보이는 곳으로 가지 않도록, 이동 대상 목록을 **일반 또는 질문 게시판이 켜진 카테고리**로 제한한다(링크/산출물 전용 게시판은 텍스트 글 이동 대상에서 제외).

## 변경 사항

### `src/lib/platform.functions.ts` — `movePost`
- 대상 카테고리 조회 시 `slug` 외에 `enable_general`, `enable_question`도 함께 select.
- 이동 update에 `type` 결정 로직 추가:
  - `enable_general` true → `general`
  - 아니고 `enable_question` true → `question`
  - 둘 다 아니면 기존 type 유지(이 경우는 클라이언트에서 대상 목록에 안 뜨도록 막음)
- `update({ category_id, post_no, type: newType })` 형태로 한 번에 갱신.

### `src/routes/_main.board.$slug.$postNo.tsx`
- `moveTargets` / `tabsWithBoards` 필터에 "일반 또는 질문 게시판이 켜진 카테고리" 조건 추가:
  - `c.enableGeneral || c.enableQuestion`
- 이렇게 하면 해커톤(질문) 탭은 그대로 보이고, 링크/산출물 전용 게시판(youtube, 사례집)만 텍스트 글 이동 대상에서 빠진다.

## 기술 메모
- 이동 후 `navigate`가 대상 글로 이동하는데, type이 바뀌어도 `postNo` 기반 URL이라 그대로 동작.
- DB 스키마 변경 없음. 데이터 마이그레이션 불필요.
