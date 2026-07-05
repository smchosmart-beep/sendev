# 문제ZIP 상세 페이지: README/평가 제거, 댓글 추가

## 현재 동작
`src/routes/_main.board.$slug.$postNo.tsx` 상세 페이지의 섹션 노출 조건:
- README + 평가 섹션: `!isBoardPost && !isLink` → **project와 problem 모두** 표시됨 (그래서 문제ZIP에 README·평가가 나옴)
- 댓글 섹션: `isBoardPost`(일반 글 `post`)일 때만 표시 → 문제ZIP에는 댓글이 없음

## 원하는 동작 (문제ZIP `problem` 유형)
- README 섹션 숨김
- 평가 섹션 숨김
- 댓글 섹션 표시

## 변경 내용 (한 파일)
`src/routes/_main.board.$slug.$postNo.tsx`

1. README + 평가는 산출물(`project`)에서만 나오도록 조건 변경
   - `{!isBoardPost && !isLink && ( ... README/평가 ... )}` → `{post.type === "project" && ( ... )}`

2. 댓글은 일반 글과 문제ZIP 모두에서 나오도록 조건 변경
   - `{isBoardPost && <CommentsSection ... />}` → `{(isBoardPost || post.type === "problem") && <CommentsSection ... />}`

## 참고
- 가이드 문서(/guide)에 문제ZIP 관련 설명에 댓글/평가 언급이 있으면 함께 정합성 확인 후 업데이트.

## 검증
- 문제ZIP 글 상세에서 README·평가가 사라지고 댓글 작성 UI가 보이는지 확인
- 산출물(project) 글은 기존대로 README·평가가 유지되는지 확인