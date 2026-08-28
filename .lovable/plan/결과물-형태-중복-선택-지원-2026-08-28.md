# 결과물 형태 중복 선택 지원

## 목표
활동기록 03 최종결과물의 "결과물 형태" 항목을 단일 선택에서 중복 선택으로 변경한다. 기존 데이터는 그대로 유지되며, 쉼표로 구분된 문자열로 저장한다.

## 변경 범위

### 1. 입력 UI (`src/components/RecordEditor.tsx`)
- `FinalInput` 타입에 `type: "multi-select"` 추가.
- `outputType` 필드 정의를 `type: "multi-select"`로 변경.
- `FinalField` 컴포넌트에 "multi-select" 분기 추가:
  - `OUTPUT_TYPES` 옵션을 토글 버튼으로 렌더링.
  - 선택된 값은 쉼표로 연결해 `onChange(key, joinedString)` 호출.
  - 선택 순서는 `OUTPUT_TYPES` 배열 순서를 따르도록 정렬.
  - 비활성 상태일 때는 기존과 동일하게 클릭 불가.

### 2. 출력 형식
- `src/lib/record-readme.ts`의 `buildRecordReadme`에서 `outputType`을 쉼표 기준으로 분리해 `, `로 보기 좋게 출력.
- `src/components/record/CasebookDocument.tsx`의 결과물 형태 필드를 쉼표 기준으로 분리해 뱃지 또는 쉼표 구분 텍스트로 표시.

### 3. 사용자 가이드 (`src/routes/_main.guide.tsx`)
- 활동기록 "03 최종결과물" 안내에 "결과물 형태는 여러 개를 동시에 선택할 수 있어요" 문구 추가.

## 부작용 검토
- DB 컬럼 `output_type`은 기존 `text` 그대로 사용. 쉼표 구분 값은 200자 제한 내에 충분히 저장 가능.
- 기존 단일 값 데이터는 쉼표가 없어 그대로 1개 항목으로 인식됨.
- 저장/불러오기 서버 함수(`saveRecordFinal`, `getRecord`)는 문자열을 그대로 다루므로 변경 없음.
- README 9블록(`buildPublicReadme`)에는 `outputType`이 노출되지 않으므로 영향 없음.

## 검증
- `tsgo` 타입체크 통과.
- 미리보기에서 결과물 형태 여러 개 선택 후 저장·새로고침 시 선택 상태 유지 확인.
- README 원본과 사례집에 선택한 항목들이 정상 출력되는지 확인.
