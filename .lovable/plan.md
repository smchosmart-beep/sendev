## 요약
게시글과 댓글의 작성일자 표시에 시간을 추가한다.

## 변경 대상

1. **게시글 작성일자** (`src/routes/_main.board.$slug.$postNo.tsx:199`)
   - `new Date(post.createdAt).toLocaleDateString("ko-KR")` → `toLocaleString("ko-KR", { year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit", hour12:true })`

2. **댓글 작성일자** (`src/routes/_main.board.$slug.$postNo.tsx:1810`)
   - 동일하게 `toLocaleDateString` → `toLocaleString` 변경

3. **사용자 가이드** (`src/routes/_main.guide.tsx`)
   - 게시판/댓글 관련 설명에 "작성 일시" 표시로 문구 업데이트

## 기대 결과
- "2024. 10. 15." → "2024. 10. 15. 오후 3:30" 형태로 시간이 추가되어 표시됨.
- 초 단위는 생략하여 가독성 유지.