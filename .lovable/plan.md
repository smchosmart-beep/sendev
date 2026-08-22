# 관리자 닉네임 변경 기능

## 목표
관리자가 프로필 관리 화면에서 사용자의 닉네임을 직접 변경할 수 있게 합니다. 변경 시 그 닉네임에 붙어 있는 활동 기록(글, 댓글, 좋아요, 배지, 평가, 투표, 활동기록 등)이 함께 따라오도록 합니다.

## 현재 상태
- 사용자 본인용 닉네임 변경은 이미 있습니다(마이페이지 → 본인 비밀번호 입력 필요).
- 관리자용 변경 수단은 없습니다. 관리자 프로필 화면에는 "비밀번호 초기화"와 "삭제"만 있습니다.
- 기존 변경 로직은 프로필/배지/게시글/댓글/좋아요/평가만 이전하고, 투표·심사위원 명단·해커톤 후기·활동기록(참여자·성찰·윤리설문·표 작성자)·읽음 표시는 예전 닉네임에 남습니다.

## 만들 것

### 1) 관리자 닉네임 변경
- 관리자 프로필 목록의 각 행에 "닉네임 변경" 버튼 추가.
- 새 닉네임 입력 → 확인 다이얼로그(무엇이 함께 이동하는지 안내) → 실행.
- 본인 비밀번호 없이, 이미 쓰이고 있는 프로필 관리자 비밀번호 인증으로 동작.
- 중복 검사: 이미 존재하는 프로필/글/댓글 작성자와 겹치면 거부. "익명", "운영진" 등 예약어도 거부.
- 비밀번호·복구 질문·레벨·배지는 그대로 유지됩니다.

### 2) 이전 범위 보강 (본인 변경에도 동일 적용)
아래까지 함께 새 닉네임으로 옮깁니다.
- 투표 기록(투표자 이름/키)
- 심사 허용 명단(심사위원 이름/키)
- 해커톤 후기 작성자
- 활동기록: 참여자, 성찰, 윤리설문, 표 행 작성자/수정자, 최종 정리 수정자
- 읽음 표시(읽지 않은 글 카운트가 초기화되지 않도록)

### 3) 가이드 갱신
사용자 가이드의 닉네임 항목에 "관리자도 닉네임을 변경해줄 수 있다"는 설명과 이전되는 항목을 추가합니다.

## 기술 메모
- `src/lib/platform.functions.ts`
  - 기존 `renameNickname` 내부의 데이터 이전 부분을 `migrateNickname(db, oldName, newName)` 헬퍼로 분리(서버 전용 모듈에 배치, 서버 함수 파일은 얇게 유지).
  - 신규 `adminRenameNickname`: 입력 `{ id, newUsername, adminPassword }`, `requireProfileAdmin` 통과 후 대상 프로필의 현재 닉네임을 조회해 동일한 이전 로직 실행.
  - 이전 대상 추가: `votes(voter_name, voter_key)`, `review_allowlist(reviewer_name, reviewer_key)`, `hackathon_reviews(nickname)`, `record_members / record_reflections / record_ethics(username, username_key)`, `record_rows(author, updated_by)`, `record_final(updated_by)`, `post_reads(username_key)`.
  - `post_reads`는 `(username_key, post_id)` 유니크가 있어 새 키에 같은 글 행이 이미 있으면 충돌 가능 → 충돌 행은 무시하고 진행하도록 처리(현재 `reviews` 처리 방식과 동일).
- `src/routes/admin.profiles.tsx`: 행 액션에 버튼 + 입력 다이얼로그 추가, 성공 시 목록 쿼리 무효화.
- `src/routes/_main.guide.tsx`: 닉네임 섹션 문구 보강.
- DB 스키마 변경 없음, 추가 비용 발생 없음(관리자 조작 시 1회 실행).
