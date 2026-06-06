## 목표

일반게시판 / 질문 게시판 게시글 상세에서 수정·삭제 버튼 오른쪽에 **이동** 버튼을 추가한다. 이동 버튼을 누르면 관리자 비밀번호 입력 모달이 뜨고, 비밀번호가 맞으면 이동 대상을 **탭메뉴(해커톤/자료집/Dev Ground/Hello, World) 선택 → 게시판 선택** 순서로 고른 뒤 게시글을 그 게시판으로 옮긴다.

## 동작 흐름

```text
[이동] 클릭
  → 비밀번호 모달 (관리자 비밀번호 입력)
      비번 불일치 → 토스트 에러
      비번 일치   → 이동 대상 선택 모달
          1) 탭메뉴 선택 (4개 탭)
          2) 해당 탭의 게시판(카테고리) 선택
             - 현재 게시판은 제외
             - 글 종류(일반/질문)를 지원하는 게시판만 노출
          [이동하기] → 서버에서 이동 → 해당 게시판의 새 글 URL로 이동
```

## 변경 사항

### 1. 서버 함수 추가 — `src/lib/platform.functions.ts`

새 `movePost` 서버 함수:
- 입력: `{ id, password, targetCategoryId }`
- 관리자 비밀번호(`POST_MASTER_PASSWORD`)만 허용 — 일반 글 비밀번호로는 이동 불가. 비밀번호 불일치 시 `{ ok: false }` 반환.
- 글 종류가 `general` 또는 `question`인 경우에만 이동 허용.
- 대상 게시판에서 다음 `post_no`를 채번하여 `category_id`와 `post_no`를 함께 갱신.
- 성공 시 새 위치 정보(대상 게시판 slug, 새 post_no)를 반환해 클라이언트가 이동할 수 있게 함.

비밀번호 전용 검증은 기존 `checkPostPassword`를 재사용하되, 관리자 비번만 통과시키도록 `master` 비교 경로만 사용(전용 헬퍼 또는 인라인 검증).

### 2. 이동 UI — `src/routes/_main.board.$slug.$postNo.tsx`

`ManagePost` 컴포넌트에:
- 일반/질문 글(`post.type === "general" || "question"`)일 때만 수정·삭제 버튼 오른쪽에 **이동** 버튼(아이콘 포함) 추가.
- 비밀번호 게이트 `Dialog` 추가 — 관리자 비밀번호 입력, 확인 중 로딩, 취소 버튼.
- 비번 통과 후 **이동 대상 선택 `Dialog`** 추가:
  - 탭메뉴 4개 중 선택(현재는 `categoriesQueryOptions` 데이터로 그룹화).
  - 선택한 탭의 게시판 목록에서 현재 게시판 제외, 글 종류 지원 게시판만 표시.
  - 게시판 선택 후 `movePost` 호출.
- 성공 시 관련 쿼리 무효화 + 새 게시판 글 URL(`/board/$slug/$postNo`)로 이동 + 성공 토스트.

탭 라벨은 `_main.board.index.tsx`의 `TAB_LABELS`와 동일한 매핑을 재사용한다.

## 기술 메모

- 글 종류별 게시판 노출 필터: 일반 글이면 `enableGeneral`, 질문 글이면 `enableQuestion`인 카테고리만 대상으로 노출.
- `movePost`는 채번 충돌(중복 post_no) 대비를 위해 기존 createPost와 동일한 재시도 패턴을 따른다.
- 비밀번호/관리자 비번은 서버에서만 비교되며 클라이언트로 노출되지 않는다.
