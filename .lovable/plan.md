# 탭 이름 변경

`src/routes/admin.tsx`의 `tabs` 배열에서 평가 기준 관리 탭 라벨을 변경합니다.

- 변경 전: `{ to: "/admin/criteria", label: "평가 기준 관리", icon: SlidersHorizontal }`
- 변경 후: `{ to: "/admin/criteria", label: "평가 관리", icon: SlidersHorizontal }`

라우트 경로(`/admin/criteria`)와 페이지 내용은 그대로 두고, 네비게이션에 표시되는 텍스트만 "평가 관리"로 바꿉니다.
