# 비밀번호 입력 개선: 보기(눈) 버튼 + 두 번 입력 확인

## 목표
비밀번호 오타로 의도와 다르게 등록되는 것을 막는다.
1. 모든 비밀번호 입력칸에 평문을 볼 수 있는 눈(보기/숨김) 토글 버튼 추가.
2. 새 글 작성 시 닉네임 비밀번호와 수정·삭제 비밀번호를 두 번 입력받아 일치 여부를 확인.

## 1. 재사용 컴포넌트 `PasswordInput`
`src/components/PasswordInput.tsx` 신규 생성.
- shadcn `Input`을 감싸고, 오른쪽 안에 `Eye` / `EyeOff`(lucide-react) 토글 버튼 배치.
- 내부 state로 `type`을 `password` ↔ `text` 전환. 버튼에 `aria-label`("비밀번호 보기"/"숨기기"), `tabIndex={-1}`로 폼 흐름 방해 최소화.
- `Input`의 모든 props를 그대로 전달(value, onChange, placeholder, id, maxLength, className 등). 오른쪽 패딩(`pr-10`) 확보.
- 기존 디자인 토큰만 사용(`text-muted-foreground` 등), 커스텀 색상 금지.

이 컴포넌트로 현재 `type="password"`인 모든 입력칸을 교체한다.

### 교체 대상 (전체)
```text
components/NicknameSetup.tsx
components/NicknameRecovery.tsx
components/ThumbnailUploadButton.tsx
routes/_main.board.$slug.tsx
routes/_main.board.$slug.new-general.tsx
routes/_main.board.$slug.new-question.tsx
routes/_main.board.$slug.new-project.tsx
routes/_main.board.$slug.new-link.tsx
routes/_main.board.$slug.$postNo.tsx (수정/삭제/댓글/평가 등 모든 비번칸)
routes/_main.mypage.tsx
routes/admin.tsx
routes/admin.notices.tsx
routes/admin.profiles.tsx
```

## 2. 두 번 입력(일치 확인)
적용 위치: **새 글 작성 폼 4종** (general / question / project / link).

각 폼에 확인 입력칸을 추가한다.
- **닉네임 비밀번호 확인**: 저장된 닉네임이 없을 때(`hasStored === false`, 즉 신규 등록 상황)에만 노출. 자동 채워진 경우(`hasStored === true`)에는 숨김.
- **수정·삭제 비밀번호 확인**: 항상 노출(글마다 새로 정하는 값이므로).

제출 직전 검증(toast로 안내):
- 닉네임 비밀번호 확인칸이 보이는데 원본과 다르면 "닉네임 비밀번호가 일치하지 않아요." → 중단.
- 수정·삭제 비밀번호와 확인칸이 다르면 "수정·삭제 비밀번호가 일치하지 않아요." → 중단.
- 일치하지 않을 때 확인칸 아래 작은 빨간 도움말 텍스트도 함께 표시.

확인칸도 `PasswordInput` 사용. 확인용 로컬 state(`nicknamePasswordConfirm`, `editPasswordConfirm`) 추가.

`NicknameSetup` 다이얼로그에도 신규 등록(저장된 닉네임 없음)일 때 닉네임 비밀번호 확인칸을 동일 규칙으로 추가.

## 3. 가이드 업데이트
`src/routes/_main.guide.tsx`의 닉네임/비밀번호 관련 설명에 "비밀번호 입력칸의 눈 버튼으로 입력값을 확인할 수 있고, 새 글 작성 시 비밀번호를 두 번 입력해 일치를 확인한다"는 안내 추가.

## 기술 메모
- 서버 로직(`platform.functions.ts`) 변경 없음 — 전부 프론트엔드 표현/검증 계층.
- 아이콘은 `lucide-react`의 `Eye`, `EyeOff` 사용.
- 확인 검증은 클라이언트 측 UX 보조이며 기존 서버 검증/등록 동작은 그대로 유지.
