# 게시판 트리 구조 확장 + 게시글 통합 계획

## 목표
1. 게시판(카테고리)을 **트리 구조**로 확장 — 폴더(게시판 그룹)는 중첩 가능, 그 하위에 실제 게시판이 위치.
2. **공지/질문/일반** 세 게시글 타입을 하나의 "글" 스트림으로 통합 (산출물·링크는 기존대로 별도 유지).
3. **공지**를 관리자 전용에서 해제 — 누구나 작성 가능, 공지는 단지 상단 고정/강조되는 글.
4. 기존 4개 탭(해커톤·자료집·Dev Ground·Hello World)은 유지하되 트리와 별개로 둠.

## 데이터 구조 변경 (마이그레이션)

### categories 테이블
- `parent_id uuid` 추가 (자기참조, `ON DELETE CASCADE`) — 트리 부모.
- `is_group boolean default false` 추가 — true면 폴더(게시판 그룹, 글 없음), false면 실제 게시판.
- `tab_group`은 최상위 노드에서만 의미 있게 유지(별개 분류).
- 기존 카테고리는 모두 최상위(`parent_id = null`), `is_group = false`로 그대로 동작.

### posts 테이블
- `type` 체크 제약을 변경: `notice/question/general` → 단일 값 `post`로 통합. `project`, `link`는 유지.
  - 즉 허용값: `post`, `project`, `link`.
- `pinned boolean default false` 추가 — 공지(상단 고정) 표시용.
- 데이터 이관: 기존 `notice` → `type='post', pinned=true`, 기존 `question`/`general` → `type='post', pinned=false`.

### categories 토글 정리
- `enable_notice/enable_question/enable_general` 3개를 `enable_post`(글 게시판) 하나로 통합. `general_name`은 글 게시판 이름으로 재활용.
- `enable_project`, `enable_link`는 그대로.

## 화면/코드 변경

### 1. 게시판 트리 사이드/목록 (스크린샷 형태)
- `/board` 목록 페이지를 **트리 뷰**로 개편: 폴더(접기/펼치기) → 하위 폴더/게시판을 들여쓰기로 표시. 폴더 아이콘/게시판 아이콘 구분, 펼침 화살표(`ChevronRight/Down`).
- 폴더 클릭 시 펼침, 게시판 클릭 시 해당 게시판으로 이동.
- 기존 탭(4개)은 트리 상단 분류 필터로 유지.

### 2. 게시판 내부 (`_main.board.$slug.index.tsx`)
- 통합된 "글" 섹션 하나로 표시: `pinned=true`(공지)인 글을 상단에 고정 강조, 나머지는 최신순 목록 + 페이지네이션.
- 글쓰기 버튼 하나로 통합("글쓰기"). 작성 폼에서 "상단 고정(공지)" 체크로 누구나 공지 작성 가능.
- 산출물/링크 섹션은 기존 로직 유지.

### 3. 글 작성/수정 폼
- `new-question`/`new-general` 라우트를 단일 `new-post` 작성 폼으로 통합(기존 두 라우트는 새 폼으로 리다이렉트/대체).
- "상단 고정(공지)" 체크박스 추가 → `pinned` 저장.

### 4. 관리자 카테고리 페이지 (`admin.categories.tsx`)
- 카테고리 생성/수정 시 **상위 폴더 선택**(드롭다운, 트리 경로 표시)과 **폴더 여부(is_group)** 토글 추가.
- 토글 정리(`enable_post` 등) 반영.
- 목록을 트리 형태로 표시.

### 5. 공지 관리 페이지 (`admin.notices.tsx`)
- 별도 공지 작성 개념이 사라지므로 단순화하거나 제거(누구나 일반 글쓰기에서 공지 체크로 대체). 관리자는 글 고정/해제·삭제만.

### 6. 서버 함수 (`platform.functions.ts` / `platform.queries.ts`)
- `listCategories`에 `parentId`, `isGroup` 포함, 트리 구성 유틸 추가.
- `createPost`/`updatePost`에 `pinned` 추가, `type` 통합 반영.
- 게시판 목록 필터 로직(`notice/question/general` 분리)을 `post`+`pinned` 기준으로 변경.
- 통합으로 더 이상 쓰지 않는 타입 분기 정리.

### 7. 가이드 페이지 (`/guide`)
- 트리 구조 게시판, 통합된 글쓰기, 공지(상단 고정) 작성법 설명 업데이트.

## 단계 순서
1. 마이그레이션(스키마 + 데이터 이관) 적용.
2. 서버 함수/쿼리 옵션 업데이트.
3. 관리자 카테고리(트리/폴더) UI.
4. 게시판 트리 목록 뷰.
5. 게시판 내부 통합 글 목록 + 통합 작성 폼 + 공지 고정.
6. 공지 관리 페이지 정리.
7. 가이드 문서 업데이트 및 전체 점검.

## 기술 메모
- 트리 깊이 제한 없음(재귀 렌더). 순환 참조 방지: 부모 선택 시 자기 자신/자손 제외.
- 기존 URL(`/board/$slug`, `/board/$slug/$postNo`)과 post_no 체계는 그대로 유지하여 링크 호환.
- `validate_category_tab_group` 트리거는 유지(최상위 노드 대상).
