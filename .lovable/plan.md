## 목표
`admin.criteria.tsx`의 "게시판 선택"을 현재의 버튼(칩) 형태에서 공지사항 관리(`admin.notices.tsx`)와 동일한 드롭다운(select) 형태로 변경합니다.

## 변경 내용
파일: `src/routes/admin.criteria.tsx` (59~76번째 줄)

- 현재 `<div className="flex flex-wrap gap-2">` 안의 버튼 목록을 제거
- 공지사항 관리와 동일한 스타일의 `<select>` 요소로 교체:
  - `value={activeId}`, `onChange`로 `setSelected` 호출
  - `categories`를 `<option>`으로 렌더링
  - `className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"` (notices와 동일)
- `Label`은 그대로 유지

기능(상태 관리, CriteriaManager 연동)은 변경하지 않고 UI만 드롭다운으로 교체합니다.
