서울시교육청 교사 개발자 플랫폼의 다음 3단계를 구현합니다: ① Lovable Cloud(DB) 연동, ② 프로젝트 상세 README 렌더링·평가, ③ 게시판별 개별 비밀번호 입장 게이트.

## 사용자 결정 사항
- **비밀번호 게이트**: 게시판마다 개별 비밀번호
- **평가 권한**: 비밀번호로 입장한 사람 누구나
- **평가 점수 형태**: 관리자가 게시판별로 별도의 평가 루브릭(기준 + 척도)을 설정
- **프로젝트 등록**: 입장자가 직접 등록 (제목/작성자/GitHub 링크)

## 1. Lovable Cloud(DB) 연동

Lovable Cloud를 활성화하고 다음 테이블을 생성합니다. 비회원 공개 플랫폼이므로 익명(anon) 읽기/쓰기를 허용하되, 비밀번호 컬럼은 클라이언트에 노출되지 않도록 처리합니다.

```text
categories      id, name, description, created_at
                + 비밀번호는 별도 안전 처리(아래 보안 항목)
events          id, title, date, time, location, description, created_at
posts           id, category_id(FK), type(notice|project),
                title, author, github_url, created_at
review_criteria id, category_id(FK), criterion_name, max_score, is_active, sort_order
reviews         id, post_id(FK), reviewer_name, scores(jsonb), created_at
```

기존 `src/lib/admin-store.tsx`의 in-memory 상태를 TanStack Query + 서버 함수(`createServerFn`) 기반 데이터 접근으로 전환합니다. 카테고리/이벤트/게시글 CRUD를 서버 함수로 구현하고, 화면에서는 `useQuery`/`useMutation`으로 사용합니다.

## 2. 게시판별 비밀번호 입장 게이트

- 각 게시판(category)에 개별 입장 비밀번호 부여.
- **보안**: 비밀번호 평문을 클라이언트로 내려보내지 않음. `verify-board-password` 서버 함수에서 입력값과 DB의 비밀번호(해시 비교)를 검증해 통과 여부만 반환.
- 게시판 상세(`/board/$categoryId`) 진입 시, 입장 검증이 안 된 경우 비밀번호 입력 카드 게이트를 표시. 통과하면 `sessionStorage`에 해당 게시판 입장 토큰을 저장하고 내용 노출.
- 관리자 페이지에 게시판별 비밀번호 설정/변경 UI 추가(기존 `admin.categories.tsx` 확장).
- 기존 단일 공용 비밀번호 화면(`admin.settings.tsx`)은 사이트 전체 진입용으로 유지하거나, 게시판별 방식으로 대체할지는 게시판 비밀번호 우선으로 구현.

## 3. 프로젝트 상세 README 렌더링 + 평가

### 프로젝트 등록 (입장자)
- 게시판 상세의 산출물 탭에 "산출물 등록" 버튼 → 모달 폼(제목, 작성자, GitHub 링크). 입장 검증된 사용자만 노출.
- 등록 시 `posts`에 `type='project'`로 저장.

### 프로젝트 상세 페이지 (`/board/$categoryId/$postId`)
- 새 라우트 파일 `_main.board.$categoryId.$postId.tsx` 생성.
- **README 렌더링**: GitHub 링크에서 `owner/repo`를 파싱 → `fetch-readme` 서버 함수가 GitHub raw README(main/master, 여러 파일명 후보)를 서버에서 가져와 마크다운 텍스트 반환(CORS 회피). 화면에서 `react-markdown` + `remark-gfm`로 렌더링하고, Pretendard/Mint 디자인 토큰에 맞춰 포트폴리오처럼 스타일링.
- **평가 섹션**:
  - 해당 게시판의 활성 `review_criteria`(루브릭)를 조회.
  - 각 기준마다 `max_score` 척도로 점수 입력 + 평가자 이름. 제출 시 `reviews`에 `scores`(jsonb: {criterionId: score}) 저장.
  - 제출된 평가들의 기준별 평균/총점 요약 표시.

### 관리자 루브릭 관리
- 관리자에 "평가 기준 관리" 탭 추가(`admin.criteria.tsx`): 게시판 선택 → 기준 추가/수정/삭제, max_score 설정, 활성/비활성 토글.

## 기술 세부사항

- **패키지 추가**: `react-markdown`, `remark-gfm` (마크다운 렌더링).
- **서버 함수** (`src/lib/*.functions.ts`):
  - 카테고리/이벤트/게시글/평가기준/평가 CRUD
  - `verifyBoardPassword({ categoryId, password })` → boolean
  - `fetchReadme({ githubUrl })` → { markdown } (서버에서 GitHub fetch)
- **보안 (RLS/GRANT)**: anon 읽기 허용(비밀번호 컬럼 제외 뷰 또는 컬럼 미선택), posts/reviews insert 허용. 비밀번호 검증·README fetch는 서버 함수에서 처리. 비밀번호 컬럼은 SELECT로 노출하지 않음(뷰 또는 서버 함수 전용).
- **디자인 가이드 준수**: Pretendard 폰트, Mint Green(#10B981), rounded-2xl, shadow 기반 카드 일관 적용.

## 작업 순서
1. Lovable Cloud 활성화 + 테이블/RLS 마이그레이션
2. 서버 함수 + Query 훅으로 데이터 계층 구성, 기존 admin-store 대체
3. 게시판별 비밀번호 게이트 (검증 서버 함수 + 게이트 UI + 관리자 설정)
4. 프로젝트 등록 폼
5. 프로젝트 상세 라우트 + README 렌더링
6. 루브릭 관리(admin) + 평가 제출/요약 UI
7. 빌드 검증 및 프리뷰 확인