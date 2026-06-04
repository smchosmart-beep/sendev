## 목표
관리자 대시보드의 "게시판 목록"을 탭별로 필터링해서 볼 수 있게 합니다. 드롭다운에는 [전체] 옵션을 포함합니다.

## 변경 내용 (`src/routes/admin.categories.tsx`)

1. **필터 상태 추가**: `listFilter` 상태를 추가 (기본값 `"all"`), 타입은 `TabGroup | "all"`.

2. **필터 드롭다운 UI**: "게시판 목록" 제목(383번 줄) 옆/아래에 `Select` 드롭다운 추가.
   - 옵션: `전체`(value `all`) + 기존 `TAB_OPTIONS` 4개 (해커톤, 자료집, Dev Ground, Hello, World).

3. **목록 필터링**: 렌더링 시 `categories`를 `listFilter` 기준으로 거른 배열 사용.
   - `all`이면 전체 표시, 그 외에는 `(c.tabGroup ?? "hackathon") === listFilter`인 항목만 표시.
   - 필터 결과가 비었을 때의 빈 상태 메시지도 적절히 처리.

## 참고 (기술 세부)
- 이미 import된 `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`와 `TAB_OPTIONS` / `TabGroup`을 재사용하므로 추가 의존성 없음.
- 추가 폼·수정·삭제 로직은 변경하지 않고, 목록 표시(프론트엔드)만 수정합니다.