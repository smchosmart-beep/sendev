# 평가 진행 관리 카드 모바일 레이아웃 정리

`src/routes/admin.criteria.tsx`의 `BoardEvalCard` 카드만 수정합니다. 데스크톱 레이아웃은 그대로 두고, 모바일(작은 화면)에서만 깔끔하게 세로로 정렬되도록 반응형 클래스를 조정합니다.

## 변경 내용

1. **콘텐츠/버튼 컨테이너**: 현재 `flex flex-wrap items-center gap-3` 를 모바일에서 세로 스택, `sm` 이상에서 가로 정렬로 변경
   - 예: `flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center`

2. **버튼 영역**: 모바일에서 버튼이 카드 폭에 맞게 꽉 차도록(`w-full`), `sm` 이상에서는 기존처럼 자동 폭으로 유지
   - 버튼 컨테이너: `flex flex-col gap-2 sm:flex-row sm:items-center`
   - 버튼들: 모바일 `w-full`, `sm:w-auto`

3. **상태 배지 줄**: 모바일에서 배지와 "산출물 N개" 텍스트가 줄바꿈되어도 자연스럽도록 `flex-wrap` 유지.

## 동작
- 모바일: 제목 → 상태 배지/개수 → 안내문 → 버튼(전체 폭)이 세로로 깔끔하게 쌓임.
- 데스크톱: 기존 좌(텍스트)·우(버튼) 가로 배치 유지.
- 로직, 서버 함수, 라우트 변경 없음 — 순수 UI 클래스 조정.
