# 02 문제 정의 과정 탭 5개 구조 후속 개선 (수정본)

02 문제 정의 과정을 5탭으로 개편한 구현에서 후속 검토로 발견된 7가지 개선점을 반영한다.

## 개선 항목

### 1. 출력물(README·사례집) 섹션 정렬이 다른 섹션까지 영향 받지 않도록 제한

현재 `src/lib/record-readme.ts`의 `ROW_ORDER` 루프 안에서 모든 `kind`에 대해 `localeCompare` 기반 정렬을 하고 있다. 이 방식은 "process" 외의 섹션(핵심 기능, 사용 흐름 등)에서도 `subtype`이 없으므로 `sortOrder`를 무너뜨리고, 순서가 localeCompare에 의해 결정되어 원래 의도와 달라진다.

- 수정: "process" kind에만 `PROCESS_SUBTYPES` 배열의 인덱스를 기준으로 정렬하고, 다른 kind는 기존 `sortOrder`만 따르도록 분기. 목록에 없는 subtype은 `idx < 0 ? 999 : idx` 폴백으로 맨 뒤로 보낸다.
- `src/components/record/CasebookDocument.tsx`에도 동일한 정렬 조건이 있으면 함께 맞춘다.

### 2. `multi` 탭에서 빈 양식과 추가 버튼이 동시에 보이지 않게

"인터뷰 기록" 탭은 `multi: true`로 여러 건 추가가 가능하지만, 기록이 0건일 때 `showDraft`와 `+ 인터뷰 기록 추가` 버튼이 같이 나타난다. 같은 버튼을 누르면 빈 행이 DB에 하나 더 생긴다.

- 수정: `showDraft`가 true일 때는 추가 버튼을 숨긴다. (draft 입력칸이 이미 추가 의도를 대체)

### 3. 추가 버튼이 즉시 빈 행을 저장하지 않고 로컬 draft만 추가

"+ 인터뷰 기록 추가" 버튼을 누르면 `onSave(emptyRowVars(...))`가 즉시 호출되어 DB에 빈 행이 생성된다. 출력과 진행도는 `isBlankRow`로 걸러지지만 DB에 불필요한 빈 행이 쌓인다.

- 수정: 추가 버튼은 로컬 상태에만 임시 draft 행을 추가하고, 사용자가 내용을 입력한 뒤 실제 저장(`onSave`)이 일어날 때만 DB에 기록한다. 삭제(취소) 시 DB에 저장되지 않은 draft는 그냥 사라진다.
- 로컬 draft 관리 규칙을 통일: 탭에 기록이 0건이면 자동으로 1개의 draft 양식을 노출하고, 그 이상 추가는 "+" 버튼으로만 draft를 로컬에 추가한다. 저장된 실제 행은 서버 응답 후 쿼리 갱신으로 다시 들어오므로, 저장 성공 시 해당 로컬 draft는 제거한다.

### 4. 로컬 draft의 React key 고유성 확보

`showDraft`로 표시하는 임시 draft는 `key={`draft-${selectedSubtype}`}`를 사용하고 있다. 같은 탭에서 "+" 버튼으로 여러 draft를 추가하면 key가 충돌하여 React 리스트 오류가 발생할 수 있다.

- 수정: draft를 배열로 관리하고 각 draft에 고유 ID(`draft-<tab>-<index>` 또는 `crypto.randomUUID`)를 부여하여 key 충돌을 방지한다. 저장되지 않고 제거된 draft는 배열에서 필터링한다.

### 5. 임시 draft 저장 후 실제 행과 중복 표시되지 않게

`RowItem`의 저장 버튼은 `id: row.id`로 전달한다. draft 행의 `id`는 `null`이므로 신규 저장이 되고, 쿼리 갱신 후 서버에서 실제 `id`를 가진 행이 `filteredRows`에 추가된다. 이때 로컬 draft가 그대로 남아 있으면 같은 내용이 두 줄로 보인다.

- 수정: `RowSection`은 `onSave` 성공 시(또는 상위 쿼리가 갱신된 후) 저장된 draft를 로컬 배열에서 제거한다. 가장 단순한 방법은 draft 행을 "저장 중" 상태로 표시하고, `onSave`가 완료된 draft는 배열에서 제거하는 것이다. React 상태에서 draft와 서버 행을 분리해 관리한다.

## 영향 범위

- `src/lib/record-readme.ts`: process kind 전용 정렬 + subtype 폴백
- `src/components/record/CasebookDocument.tsx`: 동일 정렬 로직 확인·수정
- `src/components/RecordEditor.tsx`: `RowSection`의 draft/추가 버튼 조건, 임시 draft 배열 관리, draft key, 저장 후 제거
- `src/lib/record-schema.ts` (참고): `PROCESS_SUBTYPES` 순서가 정렬 기준으로 사용됨

## 데이터·보안·비용

- 데이터 손실 없음: 기존 데이터를 변경하지 않음.
- DB 스키마/RLS/grants 변경 없음.
- 서버 호출 빈도 감소: 추가 버튼 클릭이 더 이상 빈 행을 즉시 저장하지 않음.
- AI/외부 API 호출 변화 없음.
