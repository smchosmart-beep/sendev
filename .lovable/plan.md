# 평가 진행 관리 → 평가 기준 관리 통합

## 목표
별도의 "평가 진행 관리" 탭을 없애고, 이미 게시판 선택 UI가 있는 "평가 기준 관리" 탭 안에서 선택한 게시판의 평가 셔플 & 개시 / 마감을 처리한다. 평가 기준 탭은 이미 산출물 게시판(`enableProject`)만 노출하므로, 산출물 게시판이 아닌 게시판에는 자연히 버튼이 보이지 않는다.

## 변경 사항

### 1. `src/routes/admin.criteria.tsx`
- 게시판 선택 카드 아래에 선택된 게시판(`activeId`)에 대한 **평가 진행 카드**를 추가.
- 기존 `admin.evaluation.tsx`의 `BoardEvalCard` 로직(셔플/개시, 순서 다시 섞기 + 경고 다이얼로그, 평가 마감, 상태 배지)을 이 탭 안으로 가져온다.
- 이 카드는 선택된 단일 게시판 기준으로 동작하므로 `projectCategories.find(c => c.id === activeId)`로 해당 보드를 찾아 표시.
- 상태/뮤테이션은 `shuffleEvaluation`, `closeEvaluation` 서버 함수를 그대로 사용하고 성공 시 `["categories"]` 무효화.

### 2. `src/routes/admin.tsx`
- `tabs` 배열에서 `/admin/evaluation` 항목 제거.
- 더 이상 쓰지 않는 `Shuffle` 아이콘 import 정리.

### 3. `src/routes/admin.evaluation.tsx`
- 파일 삭제(라우트 제거). `routeTree.gen.ts`는 빌드 시 자동 재생성.

## 동작
- 관리자가 평가 기준 관리 탭에서 게시판을 선택 → 같은 화면에서 평가 셔플 & 개시 가능.
- 산출물 게시판이 없는 게시판은 이 탭 자체에 나타나지 않으므로 셔플 버튼도 없음.
- 평가 잠금/순서 로직(`stableEvalOrder`, `eval_open`/`eval_seed`)은 변경 없음.

## 기술 메모
- DB/서버 함수 변경 없음. UI 재배치만.
- 평가 진행 카드는 `criteriaQueryOptions` 등과 무관하게 `categoriesQueryOptions`의 보드 데이터만 사용.
