## 목표

산출물(project) 평가를 제출해 버튼이 "평가 수정"으로 바뀐 상태에서, 그 옆에 **[다음 산출물 평가]** 버튼을 추가합니다. 누르면 산출물 목록으로 돌아가지 않고 같은 게시판의 다음 산출물 상세 페이지로 바로 이동해 연속 평가가 가능하게 합니다. 다음 순서는 기존의 기기별 고정 랜덤 순서를 그대로 따릅니다.

## 동작 규칙

- "다음 산출물 평가" 버튼은 `alreadyReviewed`(= 이미 평가함, 버튼이 "평가 수정"인 상태)일 때만 표시.
- 다음 대상은 **기기별 랜덤 순서(seededShuffle + getOrderSeed)** 로 정렬된 산출물 목록에서 현재 글 다음 위치부터 순회하여 **아직 평가하지 않은 첫 산출물**을 선택(목록 끝에 도달하면 처음으로 순환).
- 평가 안 한 산출물이 더 이상 없으면 버튼 대신 "모든 산출물 평가를 마쳤어요" 안내 문구 표시.

## 구현

`src/routes/_main.board.$slug.$postNo.tsx`의 `EvaluationSection`만 수정합니다.

1. 호출부(232행)에서 현재 글의 `postId`(현재 식별용)에 더해 식별을 위해 그대로 `postId` 사용. 추가로 `categoryId`는 이미 전달됨 — 별도 prop 추가 불필요(현재 postId로 현재 글 매칭).

2. `EvaluationSection` 내부:
   - `postsQueryOptions(categoryId)`로 게시판 전체 글을 가져와 `type === "project"`만 필터.
   - `getOrderSeed()`(마운트 후 `useEffect`로 seed 상태 세팅, 인덱스 페이지와 동일 패턴)로 `seededShuffle(projects, seed)` 정렬.
   - 평가 완료 집합: `myReviewedPostIdsQueryOptions(lockedName ?? debouncedName)` 결과를 `Set`으로. 방금 제출한 현재 글도 평가됨으로 간주.
   - 현재 글(`postId`)의 정렬 내 위치를 찾아 그 다음부터 순환하며 평가 안 한 첫 산출물의 `postNo`를 계산.

3. 제출 폼 하단 버튼 영역(823~833행)을 `flex flex-wrap gap-2`로 감싸고:
   - 기존 제출/수정 버튼 유지.
   - `alreadyReviewed && 다음대상 존재`이면 `<Button asChild variant="secondary">` 로 `<Link to="/board/$slug/$postNo" params={{ slug, postNo: 다음postNo }}>다음 산출물 평가</Link>` 렌더(우측 화살표 아이콘 포함).
   - `alreadyReviewed && 다음대상 없음`이면 안내 문구 표시.

## 기술 메모

- `Link`, `seededShuffle`, `getOrderSeed`, `postsQueryOptions`는 해당 파일/모듈에 이미 존재하거나 동일 패턴으로 import만 추가하면 됩니다.
- 페이지 이동 시 `postNo` 파라미터가 바뀌어 라우트가 리마운트되므로 별도 상태 초기화 불필요.
- 셔플/seed 로직은 인덱스 페이지와 동일하게 SSR 안전(최초 null → 마운트 후 seed)하게 처리.
