## 목표
평가기준 관리 페이지의 게시판 선택 드롭다운에 `enable_project`가 `true`인 게시판만 표시되도록 필터링합니다.

## 변경 내용
파일: `src/routes/admin.criteria.tsx`

1. `CriteriaPage` 컴포넌트에서 `useSuspenseQuery`로 불러온 전체 `categories` 중 `enableProject === true`인 항목만 필터링합니다.
2. `useState` 초기 선택값을 필터링된 목록의 첫 번째 게시판 ID로 설정합니다.
3. 필터링 후 게시판이 0개일 때의 `EmptyState`를 추가합니다. ("산출물 게시판이 활성화된 게시판이 없어요.")
4. `<select>` 내부 옵션도 필터링된 목록(`projectCategories`)만 렌더링합니다.

기능 변경 없이 UI 필터링만 추가합니다.
