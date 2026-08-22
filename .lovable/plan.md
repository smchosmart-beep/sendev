# 02 문제 정의 과정 탭 5개 구조 후속 개선

02 문제 정의 과정을 5탭으로 개편한 구현에서 후속 검토로 발견된 3가지 개선점을 반영한다.

## 개선 항목

### 1. 출력물(README·사례집) 섹션 정렬이 다른 섹션까지 영향 받지 않도록 제한

현재 `src/lib/record-readme.ts`의 `ROW_ORDER` 루프 안에서 모든 `kind`에 대해 `localeCompare` 기반 정렬을 하고 있다. 이 방식은 "process" 외의 섹션(핵심 기능, 사용 흐름 등)에서도 `subtype`이 없으므로 `sortOrder`를 무너뜨리고, 순서가 localeCompare에 의해 결정되어 원래 의도와 달라진다.

- 수정: "process" kind에만 `PROCESS_SUBTYPES` 배열의 인덱스를 기준으로 정렬하고, 다른 kind는 기존 `sortOrder`만 따르도록 분기.
- `CasebookDocument.tsx`에도 동일한 정렬 조건이 있으면 함께 맞춘다.

### 2. `multi` 탭에서 빈 양식과 추가 버튼이 동시에 보이지 않게

"인터뷰 기록" 탭은 `multi: true`로 여러 건 추가가 가능하지만, 기록이 0건일 때 `showDraft`와 `+ 인터뷰 기록 추가` 버튼이 같이 나타난다. 같은 버튼을 누르면 빈 행이 DB에 하나 더 생긴다.

- 수정: `showDraft`가 true일 때는 추가 버튼을 숨긴다. (draft 입력칸이 이미 추가 의도를 대체)

### 3. 추가 버튼이 즉시 빈 행을 저장하지 않고 로컬 draft만 추가

"+ 인터뷰 기록 추가" 버튼을 누르면 `onSave(emptyRowVars(...))`가 즉시 호출되어 DB에 빈 행이 생성된다. 출력과 진행도는 `isBlankRow`로 걸러지지만 DB에 불필요한 빈 행이 쌓인다.

- 수정: 추가 버튼은 로컬 상태에만 임시 draft 행을 추가하고, 사용자가 내용을 입력한 뒤 실제 저장(`onSave`)이 일어날 때만 DB에 기록한다. 삭제(취소) 시 DB에 저장되지 않은 draft는 그냥 사라진다.

## 영향 범위

- `src/lib/record-readme.ts`: process kind 전용 정렬
- `src/components/record/CasebookDocument.tsx`: 동일 정렬 로직 확인·수정
- `src/components/RecordEditor.tsx`: `RowSection`의 draft/추가 버튼 조건 및 임시 draft 관리

## 데이터·보안·비용

- 데이터 손실 없음: 기존 데이터를 변경하지 않음.
- DB 스키마/RLS/grants 변경 없음.
- 서버 호출 빈도 감소: 추가 버튼 클릭이 더 이상 빈 행을 즉시 저장하지 않음.
- AI/외부 API 호출 변화 없음.
