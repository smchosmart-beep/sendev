## 라이트박스 모달 버튼 배치 개선

게시글 본문 이미지 라이트박스에서 닫기/다운로드 버튼이 **이미지 위가 아니라 라이트박스의 어두운 배경 영역**에 위치하도록 한다.

### 핵심 변경
현재는 `DialogContent`가 투명하고 이미지 크기에 딱 맞게 줄어들어 버튼이 이미지 위에 겹쳐 보인다.
→ `DialogContent`를 **화면 전체(거의 전체)를 차지하는 어두운 오버레이**로 만들고, 그 안에서 이미지는 중앙에 작게(여백 두고) 배치한다. 버튼은 화면 우측 상단의 어두운 영역에 둔다.

### 작업 항목 (`src/routes/_main.board.$slug.$postNo.tsx` - `BodyImage`)
1. `DialogContent`를 전체화면 컨테이너로 변경
   - `max-w/max-h`를 화면 가득 채우도록(`w-screen h-screen` 수준), 어두운 배경 유지, 패딩으로 이미지 주변 여백 확보
   - 기존 `DialogContent` 내장 닫기 버튼은 숨김(`[&>button]:hidden`) 처리
2. 이미지는 컨테이너 중앙에 배치하되 버튼 영역과 겹치지 않도록 상단 여백 확보(`object-contain`, `max-h` 조정)
3. 우측 상단 **어두운 영역**에 버튼 2개 배치 (커스텀 버튼)
   - 다운로드 버튼(왼쪽) + 닫기 버튼(오른쪽), 흰색 아이콘
   - 다운로드: `Download` 아이콘, 클릭 시 `downloadFile(src, 파일명)` 호출
   - 닫기: `X` 아이콘, 클릭 시 `setOpen(false)`
   - 파일명: 이미지 URL 마지막 path segment, 없으면 `image`

### 가이드 업데이트 (`src/routes/_main.guide.tsx`)
- 라이트박스 안내에 "우측 상단에서 이미지 다운로드/닫기 가능" 문구 반영

### 외부 라이브러리
- 없음 (`Dialog`, `lucide-react`의 `Download`/`X`, `downloadFile` 재사용)