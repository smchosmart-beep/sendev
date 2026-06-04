# 댓글 · 답글 기능 추가

공지사항·질문게시판·일반게시판 글(`type`이 `notice`, `question`, `general`)에 댓글과 답글(대댓글)을 달 수 있게 합니다. 산출물·링크 게시판은 기존처럼 평가/README/임베드만 유지합니다.

## 1. 데이터베이스 (마이그레이션)

새 테이블 `public.comments` 추가:

```text
comments
- id            uuid (PK)
- post_id       uuid (어떤 글의 댓글인지)
- parent_id     uuid nullable (답글이면 부모 댓글 id, 일반 댓글이면 null)
- author        text (작성자, 기본값 '익명')
- content       text (댓글 내용)
- edit_password text (삭제용 비밀번호)
- created_at    timestamptz
```

- 기존 `posts`/`reviews` 패턴과 동일하게 RLS는 켜되 정책은 두지 않아, 모든 접근은 서버의 service-role 클라이언트를 통해서만 이뤄집니다. (비밀번호가 브라우저로 노출되지 않음)
- `service_role`에 GRANT 부여.

## 2. 서버 함수 (`src/lib/platform.functions.ts`)

기존 reviews 함수들과 같은 스타일로 추가:

- `CommentDTO` 타입 (id, postId, parentId, author, content, createdAt)
- `listComments({ postId })` — 해당 글의 댓글 전체를 작성 순으로 반환
- `createComment({ postId, parentId?, author, content, editPassword })` — 댓글/답글 작성. `parentId`가 있으면 답글
- `deleteComment({ id, password })` — 작성 시 비밀번호 또는 관리자 마스터 비밀번호(`POST_MASTER_PASSWORD`)로 삭제 (기존 `checkPostPassword`와 동일한 검증 방식)

내용에는 비밀번호(`edit_password`)를 절대 DTO로 반환하지 않습니다.

## 3. 쿼리 옵션 (`src/lib/platform.queries.ts`)

- `commentsQueryOptions(postId)` 추가 (queryKey: `["comments", postId]`)

## 4. UI (`src/routes/_main.board.$slug.$postNo.tsx`)

- 게시판 글(`isBoardPost`)일 때만 본문 카드 아래에 `CommentsSection` 렌더링
- `CommentsSection` 구성:
  - 댓글 목록을 부모/답글 트리로 표시 (답글은 들여쓰기). 작성자, 작성일, 내용 표시
  - 각 댓글에 "답글" 버튼 → 인라인 답글 입력 폼 토글
  - 각 댓글에 "삭제" 버튼 → 비밀번호 입력 다이얼로그(기존 글 삭제 UI와 동일한 패턴)
  - 하단에 새 댓글 작성 폼 (작성자, 내용, 비밀번호)
  - 작성/삭제 후 `["comments", postId]` 무효화로 즉시 갱신
- 디자인 토큰(rounded-2xl, bg-card, text-foreground 등) 기존 섹션과 통일

## 기술 메모

- 댓글 작성/삭제는 `useServerFn` + `useMutation`으로 호출하고 `onClick`에서 직접 서버 함수를 부르지 않습니다.
- 부모 댓글이 삭제될 때 답글 처리: 부모 댓글 삭제 시 해당 댓글의 답글도 함께 삭제(서버에서 `parent_id`로 정리).
- 답글의 답글(3단계)은 만들지 않고 2단계(댓글 → 답글)까지만 지원합니다.
