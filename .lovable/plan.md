## 목표
내 페이지에서 닉네임을 변경할 수 있게 하되, **레벨·점수·보유 배지·작성한 글/댓글·받은·누른 좋아요**가 모두 그대로 유지되도록 한다.

## 배경 (왜 단순 변경이 안 되는가)
이 사이트는 로그인 계정이 아니라 "닉네임(텍스트)"으로 활동이 연결됩니다. 닉네임이 다음 위치에 **문자열로** 저장되어 있어, 이름만 바꾸면 활동 기록이 끊깁니다.
- `posts.author`, `comments.author` — 레벨/점수 산정의 기준 (이름 매칭)
- `user_awards` (`username_key`, `username`) — 보유 배지
- `user_profiles` (`username_key`, `username`) — 레벨·비밀번호·복구질문
- `post_likes.liker_name` — 내가 누른 좋아요
- `reviews.reviewer_name` — 내가 작성한 평가
- (받은 좋아요는 글/댓글 ID로 연결되어 이름 변경과 무관 → 자동 유지)

따라서 닉네임 변경 = **이 모든 위치의 이름을 새 이름으로 일괄 이전**.

## 서버 함수 추가 (`src/lib/platform.functions.ts`)
**`renameNickname`** (username, password, newUsername)
1. 현재 닉네임 + 비밀번호 검증 (본인만 변경 가능).
2. 새 이름 검증: 1~100자, 공백만/"익명"/"운영진" 금지.
3. `newKey = normalizeName(newUsername)` 계산.
4. **충돌 방지**: 대소문자만 바뀌는 경우(같은 key)가 아니라면, 새 이름이 이미 사용 중이면 차단
   - 다른 `user_profiles` 행이 `newKey`를 가진 경우
   - `newKey`로 작성된 글/댓글이 이미 존재하는 경우 (타인 닉네임 탈취 방지)
   → "이미 사용 중인 닉네임이에요" 안내.
5. 일괄 업데이트 (모두 기존 이름 key 기준, 대소문자 무시 매칭):
   - `user_profiles`: `username`, `username_key` 변경 (레벨·비밀번호·복구질문 그대로 유지)
   - `user_awards`: 해당 `username_key` 행들의 `username`, `username_key` 변경
   - `posts.author`, `comments.author`: 새 이름으로 변경
   - `post_likes.liker_name`, `reviews.reviewer_name`: 새 이름으로 변경
6. 성공 반환.

## UI 변경 (`src/routes/_main.mypage.tsx` + 신규/기존 컴포넌트)
- 대시보드(로그인 후)에 **"닉네임 변경"** 카드/섹션 추가: 새 닉네임 입력 + 변경 버튼.
- 변경 성공 시:
  - 이 기기에 저장된 닉네임을 새 이름으로 갱신 (`useStoredIdentity.save`)
  - 대시보드를 새 이름으로 다시 불러와 화면 갱신 (상위 `MyPage`에서 username 상태 갱신 후 재조회)
  - 성공 토스트 안내.

## 데이터베이스
- 스키마 변경 없음. 기존 컬럼들의 데이터만 업데이트 (서버 함수 내 admin 클라이언트 사용).

## 엣지 케이스 / 주의
- 대소문자/공백만 바뀌는 경우: 같은 key이므로 충돌 검사 건너뛰고 표시 이름만 갱신.
- `reviews`는 (post_id, reviewer_name) 유니크 제약이 있어, 드물게 동일 글을 새 이름으로 이미 평가한 경우 충돌 가능 → 안전하게 처리(무시/스킵)하고 안내.
- 변경 후에도 받은 좋아요/댓글 반응은 ID 기반이라 그대로 유지됨.