# 활동기록 2단계(문제 정의 과정) 진입 오류 수정

## 증상
팀원 정보를 저장하고 "다음"을 눌러 02 단계로 넘어가면 화면이 깨지며
`Cannot read properties of undefined (reading 'addLabel')` 오류가 뜹니다.

## 원인 (확인됨)
편집기 2단계는 `ROW_SECTION_DEFS["process"]`, 4단계는 `ROW_SECTION_DEFS["devlog"]`를
참조하지만, `src/lib/record-schema.ts`의 `ROW_SECTION_DEFS`에는 이 두 종류의 정의가
없습니다(feature, flow, limit, plan, maker, decision, stuck, ai_use, ai_error, privacy만 존재).
그래서 `def`가 `undefined`가 되고 내부에서 `def.addLabel`을 읽다가 오류가 납니다.

## 수정 내용
1. `src/lib/record-schema.ts`의 `ROW_SECTION_DEFS`에 두 항목 추가
   - `process`: 제목 "문제 정의 과정 기록", 열 `["언제·어디서", "무엇을 나눴나요?", "그래서 정한 것"]`,
     긴 입력 `[1,2]`, 추가 버튼 "과정 기록 추가"
   - `devlog`: 제목 "개발 과정 자유기록", 열 `["날짜", "무슨 일이 있었나", "어떻게 해결했나"]`,
     긴 입력 `[1,2]`, 추가 버튼 "개발기록 추가"
   (편집기에서 title/hint/cols를 덮어쓰고 있으므로 기존 화면 문구는 그대로 유지됩니다.)
2. `RecordEditor.tsx`의 `RowSection`에 방어 코드 추가 — `def`가 없으면 렌더링을 건너뛰어
   앞으로 정의 누락이 생겨도 페이지 전체가 죽지 않게 합니다.

## 영향 범위
데이터 구조·저장 로직 변경 없음. 서버 호출량 변화 없음. 기존 저장된 행에도 영향 없습니다.
