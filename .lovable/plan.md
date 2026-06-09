## 목표
관리자가 특정 게시판(폴더 또는 하위 게시판)을 **목록에서 즉시 숨길 수 있는** 토글을 제공한다. 예: 지금은 "성장형" 기간이라 "입문형", "도전형" 게시판을 잠시 숨겨둔다.

선택된 동작:
- **즉시 숨김 토글** (날짜 기간 없이 ON/OFF)
- **목록에서만 숨김** (직접 URL로는 여전히 접근 가능 — 관리자 미리보기·공유 링크 유지)
- **폴더를 숨기면 하위 게시판도 함께 숨김**

## 작업 내용

### 1. DB: `hidden` 컬럼 추가 (migration)
`public.categories`에 `hidden boolean not null default false` 컬럼 추가. 기존 행은 모두 노출 상태(false) 유지.

### 2. 서버/데이터 매핑 (`src/lib/platform.functions.ts`)
- `CategoryDTO`에 `hidden: boolean` 필드 추가.
- `listCategories` select 목록에 `hidden` 추가하고 매핑(`hidden: !!c.hidden`). (관리자/공개 양쪽이 같은 쿼리를 쓰므로 여기서는 **필터링하지 않고** 값만 내려줌.)
- `createCategory` 입력에 `hidden`(default false), `updateCategory` 입력에 `hidden`(optional) 추가 → patch 반영.

### 3. 공개 목록 필터 (`src/routes/_main.board.index.tsx`)
- 탭 필터(`visible`)에서 `hidden === true`인 항목 제외.
- **폴더 함께 숨김**: 어떤 항목의 상위(부모/조상) 폴더가 hidden이면 그 항목도 목록에서 제외(조상 체인을 따라 hidden 여부 확인하는 헬퍼 추가).
- 직접 URL 접근(`_main.board.$slug...`)은 변경하지 않음 → 목록에서만 숨김.

### 4. 관리자 설정 UI (`src/routes/admin.categories.tsx`)
- 생성/수정 모달에 "목록에서 숨기기" 스위치(Switch) 추가 — 폴더·게시판 공통.
- 카테고리 트리 항목에 숨김 상태 표시(예: `EyeOff` 아이콘 + "숨김" 배지)로 한눈에 식별.
- 저장 시 `hidden` 값을 create/update에 전달.

### 5. 사용자 가이드 업데이트 (`src/routes/_main.guide.tsx`)
- 관리자 설정에 "게시판 숨기기(목록 비노출)" 동작 설명 추가 — 프로젝트 메모리 규칙(가이드 동기화) 준수.

## 기술 메모
- 숨김은 표시 로직만 변경하며, 게시글/평가 등 다른 기능에는 영향 없음.
- 폴더 숨김의 하위 전파는 DB가 아닌 렌더 단계(조상 체인 검사)에서 처리해 데이터 일관성 유지(폴더를 다시 노출하면 하위도 즉시 복귀).

```text
입문형 폴더(hidden) ─┐ (목록에서 숨김)
  ├─ 입문 1게시판   ─┤ → 조상이 숨김이라 함께 숨김
  └─ 입문 2게시판   ─┘
도전형 게시판(hidden) → 단독 숨김
성장형 게시판        → 정상 노출
```
