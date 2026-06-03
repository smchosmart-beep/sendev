## 목표

게시판 추가/수정 시 "산출물" 게시판의 이름도 일반게시판 이름(generalName)처럼 관리자가 자유롭게 바꿀 수 있게 합니다. (예: "산출물" → "프로젝트", "작품")

## 현재 구조

이미 일반게시판은 `general_name` 컬럼으로 이름을 바꿀 수 있게 되어 있습니다. 산출물 게시판은 이름이 코드에 "산출물"로 고정되어 있어 변경이 불가합니다. 동일한 패턴으로 `project_name` 컬럼을 추가합니다.

## 1. DB 마이그레이션

`categories` 테이블에 `project_name` 컬럼 추가:
- `project_name text NOT NULL DEFAULT '산출물'`

## 2. 서버 함수 (src/lib/platform.functions.ts)

`general_name`이 처리되는 모든 곳에 동일하게 `project_name` / `projectName` 추가:
- `CategoryDTO`에 `projectName: string` 추가
- `listCategories` select 목록에 `project_name` 추가, 매핑에 `projectName: c.project_name ?? "산출물"`
- `createCategory` 입력 스키마에 `projectName` (기본값 "산출물"), insert에 `project_name`
- `updateCategory` 입력 스키마에 `projectName` (optional), patch에 반영

## 3. 관리자 폼 (src/routes/admin.categories.tsx)

`generalName` UI 패턴을 그대로 따라:
- 추가 폼: `projectName` state 추가, "산출물 게시판" 토글이 켜져 있을 때(`enableProject`) "산출물 게시판 이름" 입력란 표시
- 수정 다이얼로그: `editProjectName` state 추가, 동일하게 토글 켜졌을 때 입력란 표시, `openEdit`에서 초기값 세팅
- 추가/수정 mutation 데이터에 `projectName` 포함, 초기화 로직에도 반영
- 목록 배지: 산출물 배지를 `c.projectName || "산출물"`로 표시

## 4. 사용자 화면에 반영

`category.projectName || "산출물"`로 고정 텍스트 치환:
- `src/routes/_main.board.$slug.index.tsx`: 산출물 섹션 제목(166행), "산출물 등록" 버튼(171행), 빈 상태 제목(179행)
- `src/routes/_main.board.$slug.$postNo.tsx`: 산출물 타입 라벨(230행) — 해당 게시글의 카테고리 projectName 사용
- `src/routes/_main.board.$slug.new-project.tsx`: "산출물 등록" 제목 등 카테고리 이름 반영

## 기술 세부사항

- 빈 값이면 항상 "산출물"로 폴백 처리해 기존 데이터/빈 입력 안전 처리
- generalName과 완전히 동일한 검증(max 100, trim) 적용
- 마이그레이션 승인·실행 후 타입이 재생성되면 코드 변경 진행
