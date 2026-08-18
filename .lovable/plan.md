# 게시판별 글 작성 템플릿 (관리자 등록)

관리자가 각 카테고리의 **게시판 유형별로** 글 작성 템플릿을 등록해 두면, 사용자가 글쓰기 화면에 들어갔을 때 본문 편집기에 그 템플릿이 미리 채워집니다.

## 동작

- 관리자 > 카테고리 편집 화면에 "글 작성 템플릿" 영역을 추가하고, 유형별로 각각 입력칸을 둡니다: 일반게시판 / 질문 / 산출물 / 링크 / 문제ZIP / 투표.
- 비워두면 지금처럼 빈 본문으로 시작합니다.
- 템플릿이 있으면 해당 유형 글쓰기 페이지의 본문 편집기에 초기값으로 들어가고, 사용자는 자유롭게 고치거나 지울 수 있습니다(강제 아님).
- 이미 작성 중인 내용은 덮어쓰지 않습니다(페이지 진입 시 최초 1회만 채움).
- 예시로 요청하신 문장은 기본값으로 넣지 않고, 관리자 화면에서 직접 붙여넣어 등록합니다.

## 기술 메모

1. **DB 마이그레이션**: `categories`에 유형별 템플릿 컬럼 추가 (모두 `text not null default ''`)
   - `template_post`, `template_question`, `template_project`, `template_link`, `template_problem`, `template_vote`
   - 기존 `categories` 정책·GRANT 그대로 사용(신규 테이블 없음).

2. **서버/쿼리** (`src/lib/platform.functions.ts`)
   - 카테고리 매핑(`listCategories` 반환 타입)에 `templates: { post, question, project, link, problem, vote }` 추가.
   - `createCategory` / `updateCategory` 입력 스키마에 각 템플릿 필드(`z.string().max(4000).optional()`) 추가 및 patch 반영.

3. **관리자 화면** (`src/routes/admin.categories.tsx`)
   - 편집 폼에 접이식 "글 작성 템플릿" 섹션 추가, 유형별 `Textarea` 6개. 각 유형이 비활성인 경우 입력칸을 숨깁니다.
   - 저장 시 기존 mutation 페이로드에 템플릿 값 포함.

4. **글쓰기 폼 초기값**
   - `new-general.tsx`(post), `new-question.tsx`, `new-project.tsx`, `new-link.tsx`, `new-problem.tsx`, `new-vote.tsx`에서 카테고리를 찾은 뒤 해당 템플릿을 `content` 초기값으로 사용.
   - 카테고리는 loader에서 미리 로드되므로 추가 서버 호출 없음. `useState`에 바로 넣지 말고, 카테고리 로드 이후 값이 비어 있을 때만 한 번 채우는 방식으로 처리(문제ZIP처럼 본문 편집기가 없는 폼은 해당 필드가 있을 때만 적용).

5. **사용자 가이드** (`src/routes/_main.guide.tsx`)
   - "글쓰기와 공지" 항목에 게시판별 작성 템플릿이 자동으로 채워질 수 있다는 설명 추가.
   - 관리자 안내 섹션에 템플릿 등록 위치(관리자 > 카테고리) 명시.

## 부작용 검토

- 템플릿이 비어 있는 기존 게시판은 동작이 전혀 바뀌지 않습니다.
- 추가 DB 조회/서버 호출이 없어 부하 증가가 없습니다(카테고리 목록에 컬럼만 추가).
- 연재(다음 편 작성)처럼 기존 내용을 불러오는 흐름에는 템플릿을 적용하지 않습니다.
