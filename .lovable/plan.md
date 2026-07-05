# 문제ZIP 게시판 신설 계획

기존 3종(글/산출물/링크)과 다른 **구조화된 폼 수집형** 게시판을 새 유형으로 추가합니다. 사용자는 ① 고통 영역 선택 → ② 발생 빈도 선택 → ③ 한 줄 고발(최대 30자)만 입력하고, 제출된 문제들은 공개 카드 목록으로 보이며 공감(좋아요), 상세 열람 및 댓글이 가능합니다. 영역·빈도 선택지는 관리자가 편집합니다.

## 데이터 저장 방식

- `posts` 테이블에 문제 유형 전용 정보를 담을 두 컬럼을 추가: **영역(problem_area)**, **빈도(problem_frequency)**. 한 줄 고발은 기존 `title`(최대 30자)에 저장, 본문은 비움.
- 새 게시판 유형 식별을 위해 posts의 `type`에 `"problem"` 값을 추가로 사용.
- `categories`에 이 게시판 유형 사용 여부(enable_problem)와 표시명(problem_name) 컬럼 추가.
- 관리자가 편집하는 **영역/빈도 선택지 목록**은 `site_settings` 테이블에 JSON으로 저장(키: `problem_areas`, `problem_frequencies`). 기본값은 아래 주신 항목으로 시드.
  - 영역: 💊보건/건강, 📝행정/공문, 👩‍🏫수업/평가, 💬학부모소통, 🏃‍♂️학교행사
  - 빈도: 숨 쉴 때마다(매일), 잊을 만하면(주 1~2회), 시즌 한정(학기초/말)

## 구현 단계

### 1) DB 마이그레이션
- `categories`에 `enable_problem boolean default false`, `problem_name text default '문제ZIP'` 추가.
- `posts`에 `problem_area text default ''`, `problem_frequency text default ''` 추가.
- `site_settings`에 `problem_areas`, `problem_frequencies` 기본 항목 시드.

### 2) 서버 함수 (`src/lib/platform.functions.ts`)
- `createPost`의 `type` enum에 `"problem"` 추가, 입력에 `problemArea`/`problemFrequency` 필드 추가 및 저장. title은 문제 유형일 때 30자 제한.
- 게시판 조회 시 area/frequency도 함께 반환하도록 PostDTO 확장.
- 카테고리 조회/생성/수정에 `enableProblem`/`problemName` 반영.
- 영역/빈도 선택지 조회 함수 + 관리자 편집 저장 함수 추가.
- 공감(좋아요)·댓글은 기존 `post_likes`/`comments` 로직을 그대로 재사용.

### 3) 작성 폼 라우트 (신규 `src/routes/_main.board.$slug.new-problem.tsx`)
모바일 우선 폼:
- Q1 영역: 버튼형 단일 선택
- Q2 빈도: 버튼형 단일 선택
- Q3 한 줄 고발: 텍스트 입력(최대 30자, 글자수 표시), placeholder "예) 보건실 방문 기록 수기 작성, 교내 행사 신청 채널 파편화 등"
- 작성자 닉네임 + 닉네임 비밀번호(기존 방식 재사용)

### 4) 목록 표시 (`src/routes/_main.board.$slug.index.tsx`)
- `type === "problem"` 항목을 카드 그리드로 렌더: 영역 배지 + 빈도 라벨 + 한 줄 고발 + 공감 버튼 + 작성자.
- 상단에 "문제 제보하기" 버튼(→ new-problem).

### 5) 상세 + 댓글 (`src/routes/_main.board.$slug.$postNo.tsx`)
- 문제 유형일 때 영역/빈도/한 줄 고발을 표시하고 기존 댓글·공감 UI 재사용.

### 6) 관리자
- `src/routes/admin.categories.tsx`: enable_problem 토글 + problem_name 입력 추가.
- `src/routes/admin.settings.tsx`(또는 신규 탭): 영역/빈도 선택지 추가·수정·삭제 UI.

### 7) 가이드 문서
- `src/routes/_main.guide.tsx`에 문제ZIP 게시판 사용법 섹션 추가(프로젝트 규칙).

## 확인/검증
- 마이그레이션 승인 후 타입 재생성 → 코드 연결.
- 폼 제출 → 목록 카드 표시 → 공감/댓글 동작을 모바일 뷰포트로 확인.

## 참고 (기술 세부)
- 새 컬럼은 모두 기본값 있는 non-null이라 기존 게시글 영향 없음.
- `type="problem"`은 pinned/series/github 등과 무관하게 처리.
- 선택지 편집은 관리자 비밀번호(ADMIN_PASSWORD) 게이트 재사용.
