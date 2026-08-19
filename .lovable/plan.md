# 활동기록 — 06 윤리 설문 단계 추가

기존 5단계 뒤, 출력 보기 앞에 **06 윤리 설문** 단계를 넣고 출력 보기를 **07**로 옮깁니다. 나머지 단계 번호와 내용은 그대로입니다.

```text
01 팀 공통정보 · 02 문제 정의 · 03 최종 결과물 · 04 개발·점검 · 05 개인 후기 · 06 윤리 설문 · 07 출력 보기
```

## 화면 (06 윤리 설문)

- 작성 단위: **팀원 개인별 1건**. 05 개인 후기와 같은 규칙 — 본인 닉네임 비밀번호로만 저장·수정, 남의 응답은 읽기만, 관리자는 삭제만 가능.
- 문항(첨부 화면 그대로):
  1. 학생 성장 최우선 — 편리함보다 학생의 학습권과 성장을 앞에 두는 것
  2. 개인정보·데이터 보호 — 학생·교사의 데이터를 최소로 모으고 안전하게 다루는 것
  3. 책임과 출처 존중 — AI가 만든 코드와 남의 자료의 출처를 밝히고 책임지는 것
  4. 안전한 실험과 검증 — 교실에 들이기 전에 충분히 시험하고 점검하는 것
  5. 역할 경계 인식 — 기술이 교사의 판단과 관계를 대신하지 않도록 선을 긋는 것
  6. 공공성 — 내가 만든 것을 사적 소유가 아닌 공교육의 자산으로 여기는 것
  7. 투명성 및 설명 가능성 — 도구가 어떻게 판단하는지 학생·학부모에게 설명할 수 있는 것
- 각 문항은 **5점 만점 · 0.5점 단위 별점**(별 클릭 = 정수, 별 왼쪽 절반 = 0.5). 현재 점수를 `0.0 / 5.0` 형태로 옆에 표시.
- 마지막 서술 문항: "이 일곱 가지 말고, 교사 개발자가 지켜야 할 약속을 하나 더 만든다면 무엇일까요?" — 200자 이내, 실시간 글자수 표시.
- 상단 안내 배너 한 줄 + 팀원들의 응답 요약(이름 / 평균 점수 / 추가 약속)을 아래에 읽기 전용으로 표시.
- 저장은 기존과 동일: 별점은 클릭 즉시 1회 저장, 서술은 1초 지연 저장. `knownUpdatedAt` 비교로 동시 수정 충돌 안내.

## 데이터

새 테이블 `record_ethics` (마이그레이션 1건):

- `id, post_id, username, username_key, s1~s7 (numeric(2,1) NOT NULL DEFAULT 0), extra_promise text NOT NULL DEFAULT '', updated_by, updated_at, created_at`
- `unique (post_id, username_key)`
- RLS 활성화, `record_reflections`와 동일한 보안 모델: `GRANT ALL ... TO service_role`만 부여, `anon`/`authenticated` 권한 없음, RLS 정책 없음(모든 접근은 서버 함수 경유).
- 점수 범위 체크 제약: 0 이상 5 이하, 0.5 배수.

## 서버

`src/lib/record.functions.ts`:

- `getRecord` 조회에 `record_ethics` 추가 → 번들에 `ethics: RecordEthicsDTO[]`.
- 신규 `saveRecordEthics` / `deleteRecordEthics` — `saveRecordReflection` / `deleteRecordReflection`과 같은 구조(팀원 확인, 본인 `username_key`만 쓰기, 관리자 비밀번호면 삭제, `knownUpdatedAt` 충돌 검사).
- `src/lib/record.server.ts`의 `fetchRecordOverview`에도 윤리 응답 집계(응답 인원 수 / 문항별 평균)를 추가.

## 출력 반영

- `src/lib/record-readme.ts`: 마지막에 **10 교사 개발자 윤리 자가점검** 블록 추가 — 응답 인원 수, 7원칙 평균 점수 표, 추가 약속 목록. 블록 상태는 기존 3단계(`empty` / `partial` / `done`) 규칙을 따름(응답 0건 = 미작성, 일부 팀원만 = 작성중, 전원 = 작성완료).
- `src/routes/admin.records.tsx`: 진행률 계산에 윤리 설문 응답 여부를 포함하고, 엑셀에 `윤리 응답 인원`·`문항별 평균`·`추가 약속` 열, ZIP README에도 위 블록 포함.

## 기술 메모

- `src/components/RecordEditor.tsx`의 `STEPS` 배열에 `{ no: "06", title: "윤리 설문" }`을 05 뒤에 삽입하고 출력 보기를 `07`로 변경. 렌더 조건 `step === 5` → `EthicsSection`, `step === 6` → `RecordOutput`. 현재 단계는 `useState(0)`만 쓰고 localStorage 저장이 없으므로 마이그레이션 이슈 없음.
- `getPublicReadmeBlocks`의 기존 9개 블록은 `step` 값이 2 또는 3뿐이라 번호 변경의 영향을 받지 않습니다(`src/lib/record-readme.ts:341-379`). 새 10번 블록만 `step: 5`로 지정.
- `RecordOverviewTeam`(`src/lib/record.server.ts:172`)에 `ethics` 배열을 추가하면 이를 만드는 두 지점을 모두 갱신해야 합니다: `fetchRecordOverview`의 팀 매핑(같은 파일 255~)과 `RecordEditor`에서 `RecordOutput`에 넘기는 team 객체(`RecordEditor.tsx:606-617`). 한 곳만 고치면 타입 에러 또는 빈 블록이 됩니다.

- 새 컴포넌트 `src/components/record/EthicsSection.tsx` + 별점 입력 `StarRating`(0.5 단위, 키보드 접근 가능: 화살표로 0.5씩 증감).
- 요청량 변화: 팀원당 최대 8회 저장(별점 7 + 서술 1, 서술은 디바운스)으로 기존 후기 단계와 동일 수준. 서버 비용 영향 없음.

## 마무리

- 사용자 가이드(`/guide`) 활동기록 섹션에 06 윤리 설문 단계 설명과 "별점은 0.5점 단위, 본인만 수정 가능" 규칙을 추가하고, 단계 번호 표기(출력 보기 07)를 갱신합니다.
