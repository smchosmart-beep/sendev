## 목표
해커톤 탭(`/board?tab=hackathon`)에 참가자 후기를 알록달록한 포스트잇 카드로 보여주고, 닉네임·비밀번호로 후기를 작성·수정·삭제한다. 작성 권한은 해커톤(입문형·성장형·도전형) 게시판에 글을 1개 이상 쓴 닉네임으로 한정한다.

## 데이터베이스 (마이그레이션)
새 테이블 `public.hackathon_reviews`:
- `nickname`, `participant_type`(`intro`|`growth`|`challenge`), `content`, `color`(포스트잇 색상 키), 표준 필드(id, created_at, updated_at + updated_at 트리거)

비밀번호는 저장하지 않고 기존 닉네임 소유권 시스템(`user_profiles.nickname_password`)을 재사용한다. GRANT: `service_role` ALL, `anon`/`authenticated` SELECT. RLS 활성화 + 공개 SELECT 정책만(쓰기는 서비스 롤 서버 함수로만).

## 서버 함수 (`src/lib/platform.functions.ts`)
- `listHackathonReviews` — 공개 읽기(닉네임·유형·내용·색상·작성일)
- `checkHackathonEligibility({ author })` — `tab_group='hackathon'` 카테고리에 해당 닉네임 글이 있는지 `EXISTS` 서브쿼리로 boolean 반환
- `createHackathonReview({ nickname, nicknamePassword, participantType, content })` — `ensureNicknameOwnership`로 비번 확인 + 자격 검사 통과 시 저장, 색상 자동 배정. 참가 유형은 작성자가 직접 선택(느슨, 실제 활동 게시판과 일치 강제하지 않음)
- `updateHackathonReview` / `deleteHackathonReview` — 닉네임 소유권 + `nickname` 일치(본인 후기) 검증 후 처리

쿼리 옵션 `hackathonReviewsQueryOptions`를 `platform.queries.ts`에 추가(staleTime으로 캐싱).

## 프론트엔드

### 작성 진입점 버튼
`_main.board.index.tsx`에서 해커톤 탭일 때만 "해커톤" 제목 오른쪽에 포스트잇 아이콘(`StickyNote`) 버튼 표시 → 클릭 시 작성 다이얼로그.

### 후기 다이얼로그 (새 컴포넌트 `HackathonReviewDialog`)
- 입력: 닉네임, 비밀번호(`useNicknameIdentity` 자동 채움), 참가 유형 선택, 후기 내용
- **자격 검사는 입력 중이 아니라 제출 시점에만** `checkHackathonEligibility` 호출(불필요한 DB 조회·서버비 방지). 권한 없으면 안내 토스트
- 본인 후기는 수정·삭제 가능(닉네임 비밀번호 확인)

### 후기카드 표시 (포스트잇 디자인)
닉네임 · 참가 유형 배지 · 후기 내용 표시, 살짝 회전된 포스트잇 + 파스텔 색상.
- **데스크톱(`xl` 이상)**: 중앙 콘텐츠(`max-w-5xl`) 좌우 여백에 세로 배치. 카드에만 `pointer-events` 적용하고 본문/드롭다운/모달을 가리지 않도록 z-index·여백 폭 조정
- **모바일/좁은 화면**: 카테고리 목록 상단에 가로 스크롤 스트립

포스트잇 색상은 `src/styles.css`에 파스텔 토큰을 정의해 사용(하드코딩 색상 클래스 미사용).

## 가이드 문서
`_main.guide.tsx`에 후기카드 기능 설명 추가(표시 위치, 작성 권한 조건, 닉네임·비밀번호, 수정·삭제 방법).

## 안전성 검토 결론
- 서버비: 읽기는 캐싱, 자격 검사는 제출 시 1회만 → 과다 호출 없음. 외부 API 호출 없음.
- 오작동: 본인확인은 `nickname` 일치 조건으로 타인 후기 변조 차단. 참가 유형은 사용자 선택대로 표시.
- 기존 기능: 신규 테이블/함수만 추가, 기존 스키마·로직 미변경 → 악영향 없음.
