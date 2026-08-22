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
- 비밀번호·복구 질문·레벨·배지는 그대로 유지됩니다.

### 2) 이전 범위 보강 (본인 변경에도 동일 적용)
아래까지 함께 새 닉네임으로 옮깁니다.
- 투표 기록(투표자 이름/키)
- 심사 허용 명단(심사위원 이름/키)
- 해커톤 후기 작성자
- 활동기록: 참여자, 성찰, 윤리설문, 표 행 작성자/수정자, 최종 정리 수정자
- 읽음 표시(읽지 않은 글 카운트가 초기화되지 않도록)

### 3) 중복·충돌 방지 (검토 반영)
- 새 닉네임이 이미 어딘가에서 쓰이고 있으면 **시작 전에 거부**합니다. 검사 범위를 넓혀 프로필, 글, 댓글에 더해 좋아요, 투표, 활동기록 참여자, 해커톤 후기까지 확인합니다. "익명", "운영진" 같은 예약어도 거부.
- 그래도 남는 드문 중복(같은 글에 두 이름으로 남은 기록 등)에 대비해, 각 단계는 중복 오류일 때 그 행만 건너뛰고 계속 진행합니다. 변경이 중간에 끊겨 절반만 바뀌는 상태를 막기 위해서입니다.

### 4) 기기에 저장된 닉네임 안내 (검토 반영)
닉네임과 비밀번호는 사용자의 기기에 저장되어 있어서, 관리자가 이름을 바꿔도 그 사람의 브라우저는 여전히 예전 이름으로 글을 씁니다. 그대로 두면 예전 이름이 미등록 상태가 되어 활동이 둘로 갈라질 수 있습니다.
- 관리자 변경 완료 화면에 "사용자에게 기기에서 닉네임을 새 이름으로 바꾸고 기존 비밀번호로 다시 확인하라고 안내하세요"라는 문구를 표시합니다.
- 가이드에도 이 절차를 적습니다.

### 5) 가이드 갱신
사용자 가이드의 닉네임 항목에 관리자 변경 가능 여부, 함께 이전되는 항목, 변경 후 기기에서 해야 할 일을 추가합니다.

## 기술 메모
- `src/lib/platform.functions.ts`
  - 기존 `renameNickname`의 데이터 이전 부분을 같은 파일 안의 `migrateNickname(db, oldName, newName)` 헬퍼로 분리합니다(이 파일은 이미 `normalizeName`, `escapeIlike` 등 모듈 스코프 헬퍼를 두고 정상 동작 중이므로 기존 패턴을 유지).
  - 신규 `adminRenameNickname`: 입력 `{ id, newUsername, adminPassword }`, `requireProfileAdmin` 통과 후 대상 프로필의 현재 닉네임을 조회해 동일한 이전 로직 실행.
  - 이전 대상 추가: `votes(voter_name, voter_key)`, `review_allowlist(reviewer_name, reviewer_key)`, `hackathon_reviews(nickname)`, `record_members / record_reflections / record_ethics(username, username_key)`, `record_rows(author, updated_by)`, `record_final(updated_by)`, `post_reads(username_key)`.
  - 관련 유니크 제약: `post_likes(target_type,target_id,liker_key)`, `post_reads(username_key,post_id)`, `record_members(post_id,username_key)`·`(category_id,username_key)`, `record_reflections/record_ethics(post_id,username_key)`, `review_allowlist(category_id,reviewer_key)`, `reviews(post_id,reviewer_name)`. 각 업데이트를 duplicate/unique 오류 무시 처리로 감싸 부분 적용을 방지합니다(현재 `reviews`가 쓰는 방식과 동일).
  - 대소문자만 바뀌는 변경은 키가 그대로이므로 중복 검사를 건너뜁니다(기존 동작 유지).
- `src/routes/admin.profiles.tsx`: 행 액션에 버튼 + 입력 다이얼로그 추가, 성공 시 목록 쿼리 무효화, 완료 후 기기 안내 문구 노출.
- `src/routes/_main.guide.tsx`: 닉네임 섹션 문구 보강.
- DB 스키마 변경 없음. 관리자 조작 시 1회 실행이라 서버 비용 증가 없음. 기존 마이페이지 변경 흐름은 인증 단계를 그대로 유지한 채 이전 로직만 공유합니다.
