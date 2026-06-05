## 문제

홈("다가오는 이벤트")의 일정 카드를 누르면 `/calendar`로 이동하지만 날짜 정보를 넘기지 않아서, 캘린더가 항상 오늘 날짜 기준으로 열립니다. (캘린더는 `viewYear/viewMonth`를 오늘로 초기화하고, `selectedDay`가 비어 있으면 오늘을 활성 셀로 사용)

## 해결 방향

홈 카드에서 이벤트 날짜를 URL search param으로 넘기고, 캘린더가 이를 읽어 해당 월로 이동 + 해당 날짜 셀을 선택하도록 합니다.

### 1. 홈 (`src/routes/_main.home.tsx`)
- 이벤트 카드의 `<Link to="/calendar">`에 `search={{ date: e.date }}`를 추가해 클릭한 일정의 날짜(`YYYY-MM-DD`)를 전달.

### 2. 캘린더 (`src/routes/_main.calendar.tsx`)
- `validateSearch`로 옵셔널 `date` 문자열(`YYYY-MM-DD` 형식 검증) 파라미터를 추가.
- `Route.useSearch()`로 `date`를 읽어:
  - 존재하면 `viewYear`/`viewMonth`를 그 날짜의 연/월로 초기화.
  - `selectedDay`를 그 날짜로 초기화 → 데스크톱/모바일 모두 해당 셀이 활성(선택)으로 표시됨.
- `useState` 초기값을 search param 기준으로 설정(없으면 기존처럼 오늘 기준).

### 기술 메모
- 날짜 비교는 기존 ISO 문자열(`YYYY-MM-DD`) 방식 그대로 사용 → 타임존 이슈 없음.
- search param이 없을 때의 동작(오늘 기준)은 그대로 유지.
- 활성 셀 강조는 이미 구현된 `activeDay`(`selectedDay` 우선) 로직을 그대로 활용하므로 추가 UI 변경은 불필요.
