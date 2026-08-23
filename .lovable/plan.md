# 활동기록 상단 [수정] 버튼 정리

[관리자로 수정하기]는 정상 작동하므로 손대지 않고, 상단 [수정] 버튼만 정리합니다.

## 고칠 내용

1. **이름 변경** — 활동기록 글에서만 상단 [수정] 버튼을 **[글 정보 수정]**으로 표시하고, 비밀번호 창 안내에 "활동기록 내용(사진 회전 등)은 아래 [관리자로 수정하기]에서 수정합니다" 한 줄을 추가합니다. 다른 게시판 글은 지금 그대로 [수정].
2. **관리자 비번 연동** — 이 창에 넣은 값이 관리자 비밀번호로 확인되면 관리자 세션에 저장해, 창을 닫는 즉시(새로고침 없이) 아래 활동기록도 "관리자 권한으로 편집 중" 상태가 됩니다. 비번을 두 번 넣을 필요가 없어집니다.

## 기술 상세

- `src/routes/_main.board.$slug.$postNo.tsx`
  - `post.type === "record"`일 때만 헤더 버튼 라벨을 **별도 변수(`editNoun`)**로 분기. 기존 `noun`(삭제 다이얼로그·토스트 문구용)은 그대로 둡니다.
  - 수정 게이트 다이얼로그 제목/설명도 `editNoun`과 `post.type === "record"` 분기로 표시.
  - `editGateMutation.onSuccess`에서 `post.type === "record"`일 때만 `isRecordAdmin`(`src/lib/record.functions.ts`)로 입력값을 한 번 검증 → 관리자면 `setAdminPassword(값)` 호출. 팀원/작성자 비번이거나 record가 아닌 글이면 아무 변화 없음.
- `src/lib/admin-auth.ts`
  - `setAdminPassword`에서 저장 직후 `typeof window !== "undefined"` 가드와 `try/catch`로 감싸 `window.dispatchEvent(new Event("admin-password-changed"))`를 발생. 저장 방식·서버 검증은 그대로.
- `src/components/RecordEditor.tsx`
  - `admin-password-changed` 이벤트를 구독해 `adminPw` 상태만 갱신 → `canEdit`/`isAdminEditing` 즉시 반영. 그 외 로직 변경 없음.
- 서버·DB 변경 없음. 권한 판정은 기존대로 서버에서만 이뤄집니다.

## 가이드 갱신

`src/routes/_main.guide.tsx` 활동기록 항목에 "상단 [글 정보 수정]은 제목·작성자·링크용이며, 여기에 관리자 비밀번호를 넣으면 활동기록 편집 잠금도 함께 풀린다"는 설명을 추가합니다.

## 검증

- 활동기록 글에서 버튼 라벨이 [글 정보 수정]으로 보이는지
- 활동기록 글에서 삭제 다이얼로그/토스트 문구가 기존과 동일한지
- 관리자 비번 입력 → 창을 닫아도 활동기록이 편집 가능 상태(사진 회전·저장 성공)
- 작성자 닉네임 비번 입력 → 글 정보만 수정되고 활동기록 잠금은 그대로
- 다른 게시판 글의 [수정] 동작·라벨 변화 없음
- record가 아닌 글에서 `isRecordAdmin` 추가 호출이 발생하지 않음