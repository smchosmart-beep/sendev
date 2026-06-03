# 공지사항·질문게시판 일반 게시판화 + 관리자 공지 관리

현재 `posts`에는 본문 컬럼이 없고, 게시물 상세 페이지는 산출물 전용(README + 평가)으로만 동작합니다. 공지/질문 글을 일반 게시판 글로 만들기 위해 본문 저장·표시를 추가하고, 공지는 관리자 페이지에서 작성하도록 합니다.

## 1. 데이터베이스 (마이그레이션)
- `posts` 테이블에 본문 컬럼 추가: `content text NOT NULL DEFAULT ''`
- 기존 산출물 글은 빈 본문으로 유지되어 영향 없음

## 2. 본문 작성 에디터 (서식 툴바)
- 공용 컴포넌트 `PostEditor`(서식 툴바 + 입력 영역) 신규 작성
- 툴바 버튼: 굵게/기울임/제목/목록/링크/이미지 삽입 등 ClassWorks 레퍼런스와 유사한 서식 제공
- 안정성·SSR 호환을 위해 본문은 **마크다운**으로 저장하고, 툴바는 선택 영역에 마크다운 서식을 적용하는 방식으로 구현
  - 상세 페이지는 이미 `ReactMarkdown`(+remark-gfm)을 사용 중이라 별도 위험한 HTML 렌더링 없이 안전하게 표시됨
- 이 동일한 `PostEditor`를 질문 작성과 공지 작성에 함께 사용

## 3. 서버 함수 (`src/lib/platform.functions.ts`)
- `PostDTO`·`mapPost`·`listPosts`/`getPost` select에 `content` 추가
- `createPost`: `content` 입력 추가
  - 공지(type=notice) 작성 시 작성자는 서버에서 **"운영진"으로 고정**
- `updatePost`: `content` 수정 지원 (공지는 작성자 운영진 유지)
- 공지 작성/삭제는 관리자 전용이므로, 공지에는 관리자 마스터 비밀번호(`POST_MASTER_PASSWORD`) 기반의 수정·삭제만 허용 (기존 마스터 비밀번호 검증 로직 재사용)

## 4. 게시판 화면 (`_main.board.$categoryId.index.tsx`)
- 질문 등록 다이얼로그를 단순 입력에서 **제목 + 본문(PostEditor) + 비밀번호** 형태로 변경
- 공지/질문 항목 클릭 시 상세 페이지로 이동 (이미 링크 연결됨)

## 5. 게시물 상세 페이지 (`_main.board.$categoryId.$postId.tsx`)
- `post.type`에 따라 분기:
  - `notice`/`question`: 본문(마크다운) 표시. README·평가 섹션은 숨김
  - `project`: 기존 동작(README + 평가) 유지
- 수정 다이얼로그에 본문(PostEditor) 추가
  - 질문: 작성 시 설정한 비밀번호로 수정·삭제
  - 공지: 관리자 마스터 비밀번호로만 수정·삭제

## 6. 관리자 페이지 — 공지사항 관리 탭
- `src/routes/admin.tsx`의 탭 목록에 **"공지사항 관리"** 추가
- 신규 라우트 `src/routes/admin.notices.tsx`:
  - 게시판(카테고리) 선택 → 해당 게시판에 공지 작성(제목 + 본문 PostEditor, 작성자 자동 "운영진")
  - 작성 컴포넌트는 질문게시판과 동일한 `PostEditor` 사용
  - 선택한 게시판의 기존 공지 목록 표시 및 삭제 기능
  - 작성·삭제는 관리자 마스터 비밀번호로 보호

## 기술 세부사항
- 마이그레이션 후 `types.ts`는 자동 갱신됨(직접 수정하지 않음)
- 본문은 마크다운 텍스트로 저장 → XSS 위험 없는 `ReactMarkdown` 렌더링
- 입력값은 zod로 서버에서 검증(제목/본문 길이 제한)
- 새 쿼리 옵션: 게시판별 공지 목록 조회용 헬퍼를 `platform.queries.ts`에 추가
