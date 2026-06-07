# 비밀번호 이중 입력(확인) 정상화

## 문제
"처음 작성하는 사용자에게 비밀번호를 두 번 입력받기"가 현재 **이 기기에 저장된 신원(localStorage `hasStored`)** 기준으로만 판단됩니다. 그래서:

- 같은 기기에서 이미 한 번이라도 닉네임을 쓴 사용자가 **새 닉네임**을 입력하면 확인 입력칸이 나타나지 않아, 새 닉네임이 단 한 번 입력으로 등록됨 (오타 위험).
- 다른 기기/시크릿창에서 **이미 등록된 닉네임**을 입력하면 불필요하게 두 번 입력을 요구함.

올바른 기준은 "입력한 닉네임이 서버에 이미 비밀번호로 등록(claim)되어 있는가" 입니다.

## 해결 방향
"처음 여부"를 서버의 닉네임 등록 상태로 판단하도록 변경합니다. 입력한 닉네임이 **아직 등록되지 않았을 때만** 비밀번호 확인 입력을 표시·요구합니다. localStorage 자동 채우기 편의는 그대로 유지합니다.

## 작업 내용

### 1. 서버: 닉네임 등록 여부 조회 함수 추가
`src/lib/platform.functions.ts`
- `getNicknameStatus` (GET, `createServerFn`) 신설: 입력 `name`(trim, 1~100자)으로 `user_profiles`에서 해당 닉네임의 `nickname_password` 존재 여부를 조회해 `{ claimed: boolean }` 반환. 비밀번호 값 자체는 노출하지 않음.

### 2. 쿼리/훅 추가
- `src/lib/platform.queries.ts`: `nicknameStatusQueryOptions(name)` 추가 (빈 이름이면 비활성, 짧은 staleTime).
- `src/hooks/useNicknameIdentity.tsx`: 입력 닉네임이 등록됐는지 알려주는 보조 훅 `useNicknameClaimed(name)` 추가. 닉네임 입력을 디바운스(약 400ms)한 뒤 위 쿼리를 호출하고 `{ claimed, isResolved }`를 반환. 미입력/조회 전에는 "미등록(처음)"으로 간주.

### 3. 폼들: 확인칸 표시 조건 변경
아래 모든 작성 폼에서, 확인 입력칸 표시 및 제출 검증 조건을 `!hasStored` → **`입력한 닉네임이 미등록(claimed === false)`** 로 변경. 등록된 닉네임이면 확인칸을 숨기고 단일 입력만 받음.

- `src/routes/_main.board.$slug.new-general.tsx`
- `src/routes/_main.board.$slug.new-link.tsx`
- `src/routes/_main.board.$slug.new-project.tsx`
- `src/routes/_main.board.$slug.new-question.tsx`
- `src/routes/_main.board.$slug.$postNo.tsx`
  - 댓글 작성 폼
  - 답글(reply) 작성 폼
  - 평가(review) 제출 폼 (현재 `reviewPwIsNew = !identity?.nicknamePassword` 기준 → 동일하게 서버 등록여부 기준으로 통일)

검증 로직(제출 시 비밀번호 불일치 차단)과 안내 문구는 유지하되, "이 닉네임을 처음 쓰면" 안내가 실제 동작과 일치하도록 유지.

### 4. 가이드 문구 확인
`src/routes/_main.guide.tsx`의 닉네임 비밀번호 안내가 "닉네임을 처음 등록할 때만 비밀번호 확인을 한 번 더 받는다"는 동작과 일치하는지 확인하고 필요 시 한 줄 보정.

## 기술 메모
- 닉네임 비교는 `trim()` 후 정확히 일치(서버 `ensureNicknameOwnership`와 동일 기준). 대소문자/공백 처리도 서버 검증과 일치시킴.
- `getNicknameStatus`는 읽기 전용·비민감 정보만 반환하므로 인증 미들웨어 불필요.
- 디바운스로 닉네임 한 글자마다 요청이 나가지 않도록 함.
- DB 마이그레이션 불필요(`nickname_password`, `claimed_at` 기존 컬럼 사용).
