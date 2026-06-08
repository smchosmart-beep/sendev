첨부파일 종류별 아이콘 표시

## 현재 상황
- 게시글 본문의 다운로드 카드(FileCard)와 캘린더 첨부 파일 목록에서 모든 파일이 `FileText` 아이콘으로 동일하게 표시됨.
- 사용자 요청: HWP/PDF는 문서 아이콘, XLS/XLSX는 시트 아이콘, ZIP은 압축파일 아이콘으로 구분해서 보여줘야 함.

## 작업 내용
1. **확장자별 아이콘 매핑 함수 추가** (`src/lib/download.ts` 또는 별도 유틸)
   - 확장자를 받아 적절한 Lucide 아이콘 컴포넌트를 반환하는 `getFileIcon(ext)` 함수.
   - 매핑:
     - hwp, pdf → `FileText`
     - xls, xlsx → `Table`
     - zip → `Archive`
     - 기타 → `FileText`

2. **게시판 다운로드 카드 수정** (`src/routes/_main.board.$slug.$postNo.tsx`)
   - `FileCard` 컴포넌트에서 파일 확장자에 따라 매핑 함수로 아이콘을 선택하도록 변경.

3. **캘린더 첨부 파일 목록 수정** (`src/routes/_main.calendar.tsx`)
   - 첨부 파일 버튼의 아이콘도 확장자별로 변경.

## 기술 메모
- `Table`, `Archive`는 모두 `lucide-react` 기본 아이콘으로 사용 가능(버전 확인 완료).
- 기존 다운로드 동작(`downloadFile`)은 그대로 유지.