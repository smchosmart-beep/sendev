# 활동기록 '작성자' 칸 개선 (수정안 v3)

## 무엇이 바뀌나
- **문제 정의 과정 기록(process)과 개발 과정 자유기록(devlog)** 행에서만 작성자 칸을 쓰고, 나머지 표(기능·흐름·한계·계획·판단·막힌 순간·AI 활용 등)에서는 작성자 입력칸을 감춥니다.
- 이 두 섹션에서 행을 **새로 추가할 때만** 로그인한 닉네임(팀 멤버인 경우)이 작성자 칸에 자동으로 채워집니다. 이후 자유롭게 수정·삭제 가능하고 다시 덮어쓰지 않습니다.
- 작성자 칸에 `기록한 사람` 라벨을 붙이고, 플레이스홀더를 `예) 김수학 (수정 가능)`으로 바꿉니다.
- 이미 저장된 기존 행의 값은 변경하지 않습니다.
- 사용자 가이드에 자동 입력 안내를 추가합니다.

## 왜 이 방식인가
- 행이 화면에 나타난 뒤 채우면 저장이 두 번 일어나고, 사용자가 일부러 비운 값을 다시 덮어쓸 위험이 있습니다. 생성 시점에만 채우면 저장 횟수는 그대로입니다.
- 작성자 입력칸은 모든 표에 공통으로 렌더링되고 있어, 기능·흐름 같은 표에서는 의미가 없습니다. 노출 범위를 서술형 기록에만 한정합니다.

## 기술 메모
- `src/components/RecordEditor.tsx`
  - `emptyRowVars`의 기본 `rowAuthor: ""`는 그대로 둡니다(`StanceSection`이 직접 호출하므로 영향 없음).
  - `RowSection`에 `defaultAuthor?: string` prop 추가. **공통 `rowSectionProps`에는 `defaultAuthor: ""`를 기본값으로 넣고**, process 섹션과 devlog 섹션에서만 `{...rowSectionProps}` **뒤에** `defaultAuthor={memberAuthor}`를 명시적으로 덮어씁니다(스프레드 뒤에 와야 적용됨).
  - `memberAuthor`는 `isMember ? (identity?.author ?? "") : ""`로 계산합니다. 멤버가 아니거나 닉네임이 없으면 빈 문자열.
  - `RowSection`의 “추가” 버튼: `onSave({ ...emptyRowVars(def.kind, rows.length), rowAuthor: defaultAuthor ?? "" })` — 첫 저장에 작성자가 함께 들어가 2회 저장이 발생하지 않습니다.
  - `RowItem`에 `showAuthor: boolean` prop 추가(`RowSection`이 `!!defaultAuthor || 섹션이 process/devlog`가 아니라, **`RowSection`이 작성자 사용 섹션인지 여부**를 그대로 내려줍니다 — `authorEnabled` 플래그 1개).
    - `authorEnabled`가 true면: `기록한 사람` 라벨 + 새 플레이스홀더로 입력칸 표시.
    - false면: 입력칸을 렌더링하지 않습니다. 단, 기존에 저장된 `row.author` 값이 있으면 읽기 전용 텍스트로만 표시해 데이터가 사라져 보이지 않게 합니다. 저장 시 `rowAuthor`는 기존 `row.author`를 그대로 보냅니다(값 유실 방지).
  - `RowItem`에 자동 주입 `useEffect`는 넣지 않습니다.
- `src/routes/_main.guide.tsx`: 활동기록 섹션에 “과정 기록·개발 자유기록에서 행을 추가하면 팀 멤버의 닉네임이 자동 입력되며, 수정하거나 지울 수 있어요. 다른 표에는 작성자 칸이 없습니다.” 안내를 추가합니다.

## 영향 없음 확인
- DB 스키마·RLS·GRANT 변경 없음, 서버 요청 수 변화 없음.
- `StanceSection`은 `emptyRowVars`를 직접 호출하므로 영향 없음.
- `src/lib/record-readme.ts`의 작성자 출력 로직은 그대로 두며, 작성자가 없는 kind는 지금처럼 이름 없이 출력됩니다.
