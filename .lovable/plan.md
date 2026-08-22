# 02 문제 정의 과정 — 5번 탭에서 '콘티 내용' 입력칸 삭제

멈춰 두었던 작업을 이어서 진행합니다.

## 바뀌는 것

- [5. 종이 프로토타입 영상 콘티] 탭에서 **'콘티 내용' 입력칸을 없애고**, 유튜브 링크 칸만 남깁니다.
- 콘티 템플릿 **안내 블록(복사 버튼 포함)은 그대로 유지**합니다.
- 이미 저장된 콘티 내용 값은 DB에 그대로 보존되며, 화면·README·사례집에서 표시만 되지 않습니다.

## 함께 고칠 부작용 (검토에서 확인)

지금 '빈 행' 판정이 col1~col6 전체를 보기 때문에, **콘티 내용만 쓰고 링크가 없는 행**은
"내용 있는 행"으로 취급되어 출력에서 제목만 있는 빈 항목으로 남고, 작성 현황도
'작성완료'로 잘못 집계됩니다.

→ 판정 기준을 **화면에 표시되는 열 기준**으로 바꿉니다.

- 표시되는 열(`displayOrder` + 라벨이 있는 열)이 전부 비어 있으면 그 행은
  README 출력·사례집 출력·작성 현황 집계에서 모두 제외합니다.
- 다른 단계·탭은 표시 열이 곧 전체 열이라 동작이 지금과 동일합니다.

## 기술 메모

- `src/lib/record-schema.ts`
  - `"5. 종이 프로토타입 영상 콘티"`: `cols[0]`을 `""`로, `placeholders[0]` 비움,
    `longCols: []`, `displayOrder: [3]`으로 변경. `linkCol: 3` 유지.
  - 라벨이 빈 열은 에디터가 이미 렌더하지 않으므로 입력칸이 자동으로 사라집니다.
- `src/lib/record-readme.ts`
  - 신규 헬퍼 `isBlankForOutput(kind, row)`: `rowTemplate(kind, row.subtype)`의
    `displayOrder ?? 전체열` 중 라벨이 있는 열만 검사해 모두 공백이면 true.
    기존 `isBlankRow`는 호환용으로 남겨 둡니다.
  - `buildRecordReadme`(230행 부근)와 `getPublicReadmeBlocks`(367행 부근)의
    `filter((r) => !isBlankRow(r))`를 `isBlankForOutput(section.kind, r)`로 교체.
- `src/components/record/CasebookDocument.tsx`: 24행 필터를 같은 헬퍼로 교체
  (섹션 노출 여부 판정도 동일 기준).
- `src/components/RecordEditor.tsx`: 510·528행 작성 현황 집계 필터를 같은 헬퍼로 교체.
- `src/routes/_main.guide.tsx`: 02단계 5번 탭 설명에서 '콘티 내용' 언급 제거,
  "콘티는 안내 템플릿을 참고해 따로 작성하고 화면에는 유튜브 링크만 제출" 로 갱신.

DB 스키마 변경·마이그레이션 없음, 서버 함수 변경 없음, 추가 네트워크 요청 없음.
