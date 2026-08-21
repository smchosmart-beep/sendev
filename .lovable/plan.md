# 02 문제 정의 과정 - 22일 회의 탭 정리 (수정본3)

## 1. 추가 버튼 정리
- 섹션 하단의 `+ 문제 정의 기록 추가`를 `+ 그 밖의 문제 정의 메모 추가`로 바꿉니다.
- 새 행은 `subtype`이 `[그 밖의 문제 정의 메모]`로 지정된 채 생성되도록, `RowSection`에 선택적 `defaultSubtype` prop을 추가하고 `emptyRowVars` 호출 시 해당 값을 함께 넘깁니다.
- 다른 탭(22일 회의 / 인터뷰 기록 / 인터뷰 후 회의)이 필요하면 만들어진 기록에서 탭을 눌러 바꾸면 됩니다(기존 동작 유지).
- `RowSection`의 `defaultSubtype`은 선택적이라 다른 섹션(개발 기록, 핵심 기능 등)의 추가 버튼 동작은 그대로입니다.

## 2. 표시 순서: 페르소나 > 고객 여정 맵 > 유튜브 링크
- 이미 저장된 기록이 엉뚱한 라벨로 보이지 않도록, 값이 담기는 `col1..col6` 인덱스는 그대로 둡니다.
- `RowTemplate`에 `displayOrder?: number[]`를 추가하여 "어떤 열 인덱스를 어떤 순서로 보여줄지"만 지정합니다. 예: `[4, 5, 3]`이면 `col4` → `col5` → `col3` 순서로 표시됩니다.
- 작성 화면, README 출력, 사례집 PDF 모두 이 순서로 표시하되, 각 값의 라벨은 원래 `cols[i]`를 그대로 사용합니다.
- 데이터 이동·삭제·마이그레이션 없음.

## 3. 첨부 이미지를 크게 보기
- 작성 화면: 저장된 이미지를 칸 전체 너비에 가깝게, 원본 비율을 유지한 채(높이 상한 안에서) 크게 표시. 클릭하면 원본이 새 창에서 열리고, 삭제(X) 버튼은 그대로 유지.
- README 출력: 이미지 확장자 첨부는 파일명 링크 대신 실제 이미지(`![...](url)`)로 삽입. 그 외 파일은 지금처럼 파일명 링크. 이미지가 본문 너비를 넘지 않도록 `RecordOutput.tsx`의 마크다운 `img` 컴포넌트에 `max-w-full h-auto` 스타일을 추가.
- 사례집 PDF: `imageCols`인 첨부를 이미지로 렌더링. 인쇄 시 이미지가 페이지 경계에서 잘리지 않도록 `break-inside: avoid`를 적용하고 높이 상한을 둡니다.

## 4. 유튜브 링크 하이퍼링크
- 작성 화면에서 저장된 링크 옆(또는 아래)에 "링크 열기" 하이퍼링크를 표시. `https://` 없이 입력해도 `normalizeUrl`을 통해 자동 보정해 연결합니다.
- README·사례집 출력은 이미 링크로 처리되어 있어 동일 보정만 맞춥니다.

## 기술 메모
- `src/lib/record-schema.ts`:
  - `RowTemplate`에 `displayOrder?: number[]` 추가.
  - `22일 팀빌딩·문제 정의 회의` 양식에 `displayOrder: [4, 5, 3]` 추가(저장 열 인덱스 불변).
  - `process`의 `addLabel`을 `"그 밖의 문제 정의 메모 추가"`로 변경.
- `src/components/RecordEditor.tsx`:
  - `RowSection`에 선택적 `defaultSubtype?: string` prop 추가.
  - `emptyRowVars`에 선택적 `subtype?: string` 인자 추가, `RowSection`의 `onSave`에서 `defaultSubtype` 전달.
  - `RowItem`에서 `displayOrder`가 있으면 그 순서로 열을 렌더링.
  - 이미지 미리보기 확대(클릭 시 원본 새 창) 및 "링크 열기" UI 추가.
- `src/lib/record-readme.ts`: `imageCols`에 속한 첨부는 마크다운 이미지로, 나머지는 파일명 링크로 출력. `displayOrder` 순서를 적용.
- `src/components/RecordOutput.tsx`: 마크다운 `img` 컴포넌트 매핑 추가(`max-w-full h-auto rounded-lg border`).
- `src/components/record/CasebookDocument.tsx`: `imageCols` 분기 추가, `displayOrder` 순서 적용.
- `src/styles.css` 인쇄 블록: `.casebook-card img { max-width:100%; max-height:120mm; height:auto; }`, `.casebook-card { break-inside: avoid; }` 추가.
- DB 마이그레이션·데이터 삭제 없음, 서버 호출 추가 없음.

## 가이드
`/guide`의 활동기록 02 단계 설명에 추가 버튼 문구, 표시 순서, 이미지 크게 표시, 링크 연결을 반영합니다.
