# 게시판별 섹션 On/Off + 일반게시판 추가

## 목표
관리자가 게시판을 만들거나 수정할 때 4개 섹션을 각각 켜고 끌 수 있게 합니다.
- 공지사항 (notice)
- 질문 게시판 (question)
- 일반게시판 (general) — 질문 게시판과 동작 동일, 게시판마다 이름 지정
- 산출물 게시판 (project)

새 게시판은 4개 모두 **기본 켜짐**. 일반게시판 이름은 게시판마다 지정(기본값 "일반게시판").

## 동작 예시
"베타테스터 게시판"은 공지사항 + 일반게시판만 켜고 질문/산출물은 끔 → 해당 게시판 화면에는 공지와 일반게시판 섹션만 보이고, 꺼진 섹션의 글 등록 버튼·목록은 나타나지 않음.

---

## 1. 데이터베이스 변경 (마이그레이션)
`categories` 테이블에 컬럼 추가:
- `enable_notice` boolean, 기본 true
- `enable_question` boolean, 기본 true
- `enable_general` boolean, 기본 true
- `enable_project` boolean, 기본 true
- `general_name` text, 기본 '일반게시판'

`posts` 테이블의 type 체크 제약조건에 `'general'` 추가 (기존 notice/project/question 유지).

기존 게시판은 모두 4개 섹션이 켜진 상태로 유지됩니다.

## 2. 서버 함수 (`src/lib/platform.functions.ts`)
- `CategoryDTO`에 `enableNotice`, `enableQuestion`, `enableGeneral`, `enableProject`, `generalName` 추가.
- `PostDTO`의 type에 `"general"` 추가.
- `listCategories` select/매핑에 새 컬럼 반영.
- `createCategory` / `updateCategory` 입력 스키마와 저장 로직에 새 필드 추가.
- `createPost` type enum에 `"general"` 추가.

## 3. 관리자 화면 (`src/routes/admin.categories.tsx`)
추가 폼과 수정 다이얼로그에:
- 공지/질문/일반/산출물 섹션 4개 토글(Switch) 추가.
- 일반게시판 토글이 켜져 있을 때 "일반게시판 이름" 입력란 표시.
- 목록 카드에 켜진 섹션을 작은 배지로 표시.

## 4. 게시판 화면 (`src/routes/_main.board.$slug.index.tsx`)
- 각 섹션을 카테고리 플래그에 따라 조건부 렌더링.
- 일반게시판 섹션 신규 추가(질문 섹션과 동일한 형태, 제목은 `generalName`, 글은 type `general` 필터).
- 꺼진 섹션은 목록과 등록 버튼 모두 숨김.

## 5. 일반게시판 글 등록 라우트
- `src/routes/_main.board.$slug.new-general.tsx` 신규 생성 (기존 new-question 복제, type `general`, 제목에 `generalName` 사용).

---

## 기술 메모
- 마이그레이션은 승인 후 실행되고 그 다음 타입이 재생성되므로, 스키마 의존 코드는 마이그레이션 승인 이후에 작성합니다.
- 라우트 추가 시 `routeTree.gen.ts`는 자동 생성되므로 직접 수정하지 않습니다.
- 게시글 작성/조회는 service-role admin 클라이언트를 통하므로 RLS 추가 변경은 불필요합니다.
