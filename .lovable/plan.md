## 목표
게시물 상세 페이지에서 제목과 수정/삭제 버튼이 모바일에서 겹치는 문제를 해결합니다.

## 변경 내용
파일: `src/routes/_main.board.$slug.$postNo.tsx`

1. 제목 + 버튼 컨테이너(150~154번째 줄)를 모바일에서 세로 정렬, 데스크톱에서 가로 정렬로 변경:
   - `flex items-start justify-between gap-4` → `flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4`
   - 제목에 `break-words` 추가하여 긴 제목 줄바꿈 보장
2. `ManagePost`의 버튼 영역(295번째 줄)이 모바일에서 잘 보이도록 확인 (`flex shrink-0 gap-2` 유지, 모바일에서 제목 아래로 자연스럽게 배치됨)

기능 변경 없이 반응형 레이아웃만 조정합니다.
