## 문제 & 목표

"제주도는 정말 '삼다도(三多島)'인가?" 산출물의 `github_url`이 DB에 빈 값으로 저장되어 README 섹션이 "링크 없음"으로 표시됩니다.

이번에 두 가지를 처리합니다.
1. 해당 산출물의 GitHub 링크를 올바른 값으로 채웁니다.
2. **GitHub 링크의 필수/선택 여부를 관리자가 게시판(카테고리)별로 지정**할 수 있게 합니다.

## 1. 데이터 채우기

- 마이그레이션으로 해당 게시물(id `d9275801-...`)의 `github_url`을 `https://github.com/greatsong-danggok/is-jeju-really-samdado`로 업데이트합니다.

## 2. 게시판별 GitHub 링크 필수 설정

### DB
- `categories` 테이블에 `github_required` 불리언 컬럼 추가 (기본값 `false` = 선택 입력).

### 서버 (`src/lib/platform.functions.ts`)
- `CategoryDTO`에 `githubRequired` 추가, `listCategories`에서 해당 컬럼 조회·매핑.
- `createCategory` / `updateCategory` 입력에 `githubRequired` 추가하여 저장.
- `createPost`에서 해당 카테고리의 `github_required` 설정을 조회해, 필수인 게시판에서 `githubUrl`이 비어 있거나 github.com 형식이 아니면 거부.

### 관리자 화면 (`src/routes/admin.categories.tsx`)
- 새 게시판 추가 폼과 수정 다이얼로그에 "GitHub 링크 필수" 토글(Switch)을 추가.
- 게시판 목록 항목에 필수 여부를 작게 표시.

### 산출물 등록 폼 (`src/routes/_main.board.$categoryId.index.tsx`)
- 현재 게시판의 `githubRequired` 값(카테고리 목록에서 조회)에 따라:
  - 필수면 라벨에 필수 표시 + 빈 값/형식 오류 시 등록 차단.
  - 선택이면 지금처럼 비워둬도 등록 가능.

## 기술 세부사항

- **마이그레이션**: `ALTER TABLE public.categories ADD COLUMN github_required boolean NOT NULL DEFAULT false;`
- **데이터 업데이트**(insert 도구): 해당 post의 `github_url` 설정.
- GitHub URL 형식 검증은 클라이언트·서버 양쪽에서 수행 (`https://github.com/owner/repo` 패턴).
- 기존 게시판은 모두 기본값 `false`(선택 입력)로 유지되어 동작 변화 없음.