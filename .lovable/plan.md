# 상단 탭 5개 확장 + 게시판 그룹 분류

## 목표

상단 헤더를 `캘린더 / 게시판` → `캘린더 / 해커톤 / 자료집 / Dev Ground / Hello, World` 5개 탭으로 확장합니다. 각 게시판(category)을 4개 탭 그룹 중 하나에 소속시키고, 탭을 누르면 그 그룹에 속한 게시판 목록만 보여줍니다.

## 탭 구성

```text
캘린더      → /calendar (기존 유지)
해커톤      → 해커톤 그룹 게시판 목록 ([Lv1]/[Lv2]/[Lv3])
자료집      → 자료집 그룹 게시판 목록 (처음엔 비어 있음)
Dev Ground → Dev Ground 그룹 게시판 목록 (베타테스터 모집)
Hello, World → Hello, World 그룹 게시판 목록 (처음엔 비어 있음)
```

기존 게시판 배치:
- `[Lv1] 입문형`, `[Lv2] 성장형`, `[Lv3] 도전형` → 해커톤
- `베타테스터 모집` → Dev Ground

## 동작 방식

- 탭(해커톤/자료집/Dev Ground/Hello, World)을 누르면 해당 그룹의 게시판 카드 목록이 나오고, 카드를 누르면 기존처럼 게시판 안으로 들어갑니다 (공지/질문/일반/산출물 섹션 그대로).
- 게시판이 없는 그룹(자료집, Hello, World)은 "아직 등록된 게시판이 없어요" 빈 화면을 보여줍니다.
- 관리자가 새 게시판을 추가/수정할 때 먼저 4개 탭 중 어디에 넣을지 선택해야 합니다.

## 작업 내용

### 1. 데이터베이스 (migration)
- `categories` 테이블에 `tab_group` 컬럼 추가 (text, 기본값 `'hackathon'`).
- 허용값을 검증하는 트리거(또는 체크) 추가: `hackathon` / `resources` / `devground` / `helloworld`.
- 기존 데이터 분류: Lv1·Lv2·Lv3 → `hackathon`, 베타테스터 모집 → `devground`.

### 2. 서버 함수 (`src/lib/platform.functions.ts`)
- `CategoryDTO`에 `tabGroup` 필드 추가.
- `listCategories` select/매핑에 `tab_group` 포함.
- `createCategory` / `updateCategory` 입력 스키마에 `tabGroup`(enum) 추가 및 저장.

### 3. 헤더 (`src/routes/_main.tsx`)
- 탭 배열을 5개로 교체. 캘린더는 `/calendar`, 나머지 4개는 게시판 목록 라우트로 연결.
- 각 게시판 탭은 그룹 식별자를 들고 게시판 목록 화면으로 이동. 현재 활성 탭 하이라이트 처리.

### 4. 게시판 목록 (`src/routes/_main.board.index.tsx`)
- 현재 탭 그룹을 기준으로 categories를 필터링해서 그 그룹의 게시판만 카드로 표시.
- 그룹별 제목(해커톤/자료집/Dev Ground/Hello, World) 표시.
- 빈 그룹은 빈 상태 안내.

### 5. 관리자 (`src/routes/admin.categories.tsx`)
- 추가 폼·수정 다이얼로그 맨 위에 "탭 선택"(해커톤/자료집/Dev Ground/Hello, World) 컨트롤 추가 — 게시판 추가 시 필수.
- 게시판 목록 카드에 소속 탭 배지 표시.

## 기술 메모

- 탭 그룹은 `/board` 인덱스 라우트의 검색 파라미터(예: `?tab=hackathon`)로 전달합니다. `/board/$slug`(게시판 상세)와 라우트 충돌을 피하기 위함이며, 기본 탭은 해커톤입니다.
- `src/routes/_main.board.$slug.tsx`(상세)와 섹션 구조는 변경하지 않습니다.
- 시간 기반 검증이 아니므로 `tab_group` 값 제한은 CHECK 제약 또는 간단한 검증 트리거로 처리합니다.
- `src/integrations/supabase/types.ts`는 migration 승인 후 자동 갱신되므로, 코드 변경은 그 다음에 진행합니다.
