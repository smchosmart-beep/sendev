# 02 문제 정의 과정 탭 5개 구조 후속 개선 (수정본)

02 문제 정의 과정을 5탭으로 개편한 구현에서 후속 검토로 발견된 7가지 개선점을 반영한다.

## 개선 항목

### 1. 출력물(README·사례집) 섹션 정렬이 다른 섹션까지 영향 받지 않도록 제한

현재 `src/lib/record-readme.ts`의 `ROW_ORDER` 루프 안에서 모든 `kind`에 대해 `localeCompare` 기반 정렬을 하고 있다. 이 방식은 `subtype`을 갖는 `process`의 탭 순서가 라벨 문자열 비교에 의존하고, `ai_use`(`src/lib/record-schema.ts:83`의 `AI_USE_TYPES`)처럼 `subtype`을 갖는 다른 섹션의 출력 순서도 섞일 수 있다.

- 수정: `subtype`이 있는 kind(`process`, `ai_use`)는 `subtype` 그룹별로 먼저 묶고, 그룹 내에서 `sortOrder`를 적용한다. `process` 그룹 순서는 `PROCESS_SUBTYPES` 배열 인덱스를 따르고, `ai_use`는 `AI_USE_TYPES` 정의 순서를 따른다. 목록에 없는 subtype은 `idx < 0 ? 999 : idx` 폴백으로 맨 뒤 "기타" 그룹으로 보낸다. `subtype`이 없는 kind(핵심 기능, 사용 흐름 등)는 기존 `sortOrder`만 적용한다.
- `AI_USE_TYPES`의 현재 배열 순서(`["서비스 기능", "개발 과정"]`)가 현재 `localeCompare` 출력 순서와 역순이므로, README/사례집 출력 순서를 유지하려면 배열을 `["개발 과정", "서비스 기능"]`으로 재배열하거나, `ai_use`는 현행 `localeCompare` 기준을 유지하도록 범위를 좁혀야 한다. 본 계획에서는 `AI_USE_TYPES` 배열 순서를 현재 출력 순서에 맞춰 재배열하고, `process`와 동일한 정의 순서 정렬을 적용한다. 편집 화면의 subtype 선택 드롭다운 순서도 함께 바뀌는 것은 의도된 변경이다.
- `src/components/record/CasebookDocument.tsx`의 `rowsOf` 함수도 동일한 정렬 기준으로 맞춘다.

### 2. `multi` 탭에서 빈 양식과 추가 버튼이 동시에 보이지 않게

"인터뷰 기록" 탭은 `multi: true`로 여러 건 추가가 가능하지만, 기록이 0건일 때 `showDraft`와 `+ 인터뷰 기록 추가` 버튼이 같이 나타난다. 같은 버튼을 누르면 빈 행이 DB에 하나 더 생긴다.

- 수정: `showDraft`가 true일 때는 추가 버튼을 숨긴다. (draft 입력칸이 이미 추가 의도를 대체)

### 3. 추가 버튼이 즉시 빈 행을 저장하지 않고 로컬 draft만 추가

현재 "+ ... 추가" 버튼은 `onSave(emptyRowVars(...))`를 즉시 호출하여 DB에 빈 행을 생성한다. 이 동작은 `RowSection`을 사용하는 모든 행 섹션(핵심 기능, 사용 흐름, 한계, 계획, 제작자, AI 활용, process 등)에 공통으로 적용된다. `isBlankRow`로 출력은 걸러지지만 DB에 불필요한 빈 행이 쌓인다.

- 수정: 추가 버튼은 클릭한 섹션의 로컬 상태에만 임시 draft를 추가하고, 사용자가 내용을 입력한 뒤 실제 저장(`onSave`)이 일어날 때만 DB에 기록한다. 삭제(취소) 시 DB에 저장되지 않은 draft는 로컬에서만 제거된다. 로컬 draft 배열의 각 항목은 `{ draftId: string; row: DraftRow }` 형태로 저장하며, `DraftRow`의 `id`는 `null`로 유지한다.
- 로컬 draft 관리 규칙을 통일: `multi`/`showDraft`가 true인 탭(예: 인터뷰 기록)은 기록이 0건이면 자동으로 1개의 draft 양식을 노출하고, 그 이상 추가는 "+" 버튼으로만 draft를 로컬에 추가한다. `multi`가 아닌 다른 행 섹션에서도 추가 버튼은 동일하게 로컬 draft만 추가한다. 저장된 실제 행은 서버 응답 후 쿼리 갱신으로 다시 들어오므로, 저장 성공 시 해당 로컬 draft는 제거한다.
- draft 생성 시 `sortOrder` 충돌 방지: 여러 draft가 동시에 추가되면 `rows.length` 기준으로 같은 `sortOrder`를 가질 수 있으므로, `rows.length + draftIndex` 형태로 고유 값을 부여한다.

### 4. 로컬 draft의 React key 고유성 확보 및 취소 UI 제공

`showDraft`로 표시하는 임시 draft는 `key={\`draft-${selectedSubtype}\`}`를 사용하고 있다. 같은 탭에서 "+" 버튼으로 여러 draft를 추가하면 key가 충돌하여 React 리스트 오류가 발생할 수 있다. 또한 draft는 `id`가 `null`이라 기존 `RowItem`의 삭제 버튼 조건(`row.id` 존재)에 걸려 취소할 방법이 없다.

- 수정: 로컬 상태에서 draft를 별도 배열로 관리하며, 각 항목은 `{ draftId: string; row: DraftRow }` 형태로 저장한다. `DraftRow`의 `id`는 계속 `null`로 유지하고, `key`는 `draftId`로 사용한다. 각 draft에 고유 ID(`draft-<sectionKey>-<index>` 또는 `crypto.randomUUID`)를 부여하여 key 충돌을 방지한다. 저장되지 않고 제거된 draft는 배열에서 필터링한다.
- `RowItem`에 `onCancel?: (draftId: string) => void` prop을 추가하여 `row.id`가 없는 draft에도 삭제(취소) 아이콘을 노출하고, 클릭 시 서버 호출 없이 로컬 draft 배열에서만 제거한다. `RowItem`은 `row.id == null`이면 `onDelete`를 호출하지 않고 `onCancel`을 호출하도록 조건을 변경한다. 기존 실제 행(`id != null`)의 삭제는 기존 `onDelete` 경로를 그대로 사용한다.

### 5. 임시 draft 저장 후 실제 행과 중복 표시되지 않게 (요청별 추적)

`RowItem`의 저장 버튼은 `id: row.id`로 전달한다. draft 행의 `id`는 `null`이므로 신규 저장이 되고, 쿼리 갱신 후 서버에서 실제 `id`를 가진 행이 `filteredRows`에 추가된다. 이때 로컬 draft가 그대로 남아 있으면 같은 내용이 두 줄로 보인다.

- `rowMutation`은 `RecordEditor.tsx` 전체에서 단 하나이므로, 모든 `RowSection`이 같은 `isPending` 상태를 공유한다. `isPending`이 false로 돌아오는 시점에 draft를 제거하면, **다른 섹션에서 저장이 일어날 때도** 현재 탭의 미저장 draft가 사라져 입력 중이던 내용이 유실될 수 있다. 따라서 전역 `isPending` prop 방식은 사용하지 않는다.
- 수정: `RecordEditor.tsx` 내부의 `RowSection` 및 `RowItem` 함수를 수정한다. `RowSection`의 `onSave` prop 타입을 `Promise<void>`를 반환하는 비동기 콜백으로 변경하고, `RecordEditor.tsx`에서 `rowMutation.mutateAsync`를 전달한다. `RowItem`이 실제로 저장 버튼을 가지고 있으므로, `RowItem`에 `draftId`와 `onRemoveDraft(draftId: string) => void` prop을 추가하고, 저장 버튼 클릭 시 `try { await onSave({ ...row, sectionKey }); onRemoveDraft(draftId); } catch { ... }` 형태로 호출한다. 성공 시에만 해당 `draftId`를 가진 로컬 draft를 배열에서 제거하고, 실패 시 draft는 그대로 두어 재시도할 수 있게 한다.
- `onSave`의 반환형 변경은 `RecordEditor.tsx` 내부의 `rowSectionProps`, `StanceSection`/`StanceItem` 등 연관 호출부에 모두 영향을 미친다. 모든 `onSave` 호출부의 타입을 `Promise<void>`로 통일하고, `RowItem` 내부의 저장 호출은 `try/catch`로 감싸 실패 시 draft를 유지한다. `StanceItem`처럼 draft가 없는 곳은 `void onSave(...)` 형태로 호출하여 rejection을 삼키지 않도록 처리한다.
- React 상태에서 draft와 서버 행을 분리해 관리하며, 저장된 draft는 성공 콜백에서만 로컬 배열에서 필터링한다.

### 6. 로컬 draft를 subtype(탭)별로 격리

`multi` 탭이나 다른 행 섹션에서 추가 버튼으로 만든 로컬 draft가 현재 선택된 탭과 무관하게 노출되면, 탭 전환 시 다른 탭의 draft가 섞여 보이거나 잘못된 `subtype`으로 저장될 수 있다.

- 수정: draft 항목에 생성 당시의 `subtype` 값을 저장하고(`DraftRow`에 `subtype` 필드가 이미 있음), 렌더 시 `RowSection` 필터링에서 `currentSubtype`과 일치하는 draft만 `visibleDrafts`로 노출한다. 다른 subtype의 draft는 숨겨진 상태로 유지되며, 해당 탭으로 돌아왔을 때만 다시 보인다.
- `draftId` 생성 시 `sectionKey`와 `subtype`을 포함하여 같은 섹션 내에서도 탭별 key 충돌이 없도록 한다.

### 7. "아직 등록된 내용이 없어요" 빈 상태 문구가 draft를 반영하도록

기존 빈 상태 문구는 `filteredRows.length === 0`일 때만 출력된다. draft 배열을 따로 관리하면 실제 행은 없지만 draft가 있을 때도 빈 상태 문구가 동시에 출력되어 사용자가 혼란을 겪을 수 있다.

- 수정: 빈 상태 안내 문구(`아직 등록된 내용이 없어요`)의 노출 조건을 `filteredRows.length === 0 && visibleDrafts.length === 0`로 변경한다. draft가 있으면 안내 문구를 숨기고 draft 입력 양식만 보여준다.

### 8. 저장 성공 시 draft 제거 시점을 쿼리 갱신 완료 후로 맞추고 중복 토스트 방지

`mutateAsync`가 resolve되어도 `invalidateQueries`는 비동기로 동작하여, draft를 즉시 제거하면 서버에서 실제 행이 목록에 나타나기까지 잠깐 항목이 사라지는 플리커가 발생할 수 있다. 또한 `rowMutation`의 `onError` 토스트와 `RowItem`의 `catch` 내부 토스트가 중복될 수 있다.

- 수정: `rowMutation`의 `onSuccess`에서 `invalidateQueries`를 `return`하여 mutation 결과가 resolve되기 전에 쿼리 갱신이 완료되도록 한다. `RowItem` 내부에서 저장 버튼 클릭 시 `try { await onSave({ ...row, sectionKey }); onRemoveDraft(draftId); } catch { ... }`로 호출하고, `catch` 블록에서는 토스트를 띄우지 않고 draft만 유지하여 재시도를 가능하게 한다. 실제 에러 토스트는 `rowMutation`의 `onError` 콜백에서 한 곳에서만 담당한다.

## 영향 범위

- `src/lib/record-readme.ts`: subtype 사용 kind(process, ai_use) 그룹 정렬 + process/ai_use 정의 순서 + 폴백
- `src/lib/record-schema.ts`: `AI_USE_TYPES` 배열 순서를 현재 README/사례집 출력 순서에 맞춰 재배열
- `src/components/record/CasebookDocument.tsx`: 동일 정렬 로직 확인·수정
- `src/components/RecordEditor.tsx` (내부 `RowSection`/`RowItem` 함수 수정): draft/추가 버튼 조건, 임시 draft 배열 관리, draft key, 저장 후 제거, `onSave` 비동기 콜백 전달, 연관 호출부 통일, subtype별 draft 필터링, 빈 상태 문구 조건, 토스트 중복 방지
- 별도 신규 파일(`RowSection.tsx`, `RowItem.tsx`)은 만들지 않는다.

## 데이터·보안·비용

- 데이터 손실 없음: 기존 데이터를 변경하지 않음.
- DB 스키마/RLS/grants 변경 없음.
- 서버 호출 빈도 감소: 추가 버튼 클릭이 더 이상 빈 행을 즉시 저장하지 않음.
- AI/외부 API 호출 변화 없음.
