# 사용자별 여러 배지 지원

현재는 사용자 한 명당 배지 텍스트 한 칸(`user_profiles.award`)만 담겨, 배지를 하나만 줄 수 있습니다. 별도의 배지 테이블을 만들어 한 사용자에게 배지를 여러 개 부여하고, 내 페이지·관리자 화면에서는 모두 표시하되, 글/댓글 작성자 옆에서는 공간을 아끼는 방식으로 표시합니다.

## 무엇이 달라지나
- 관리자 화면에서 한 사용자에게 배지를 **여러 개 추가/삭제**할 수 있습니다.
- 글·댓글 작성자 옆에서는 **대표 배지 1개 + "+N"** 형태로만 노출하고, 마우스 올리거나(데스크톱) 탭하면(모바일) 나머지 배지를 작은 팝오버로 보여줍니다.
- 내 페이지 레벨 카드와 관리자 목록에서는 **보유 배지를 전부** 표시합니다.
- 기존에 등록되어 있던 배지는 자동으로 새 구조로 옮겨집니다(데이터 유실 없음).

## 작업 내용

### 1. 데이터베이스 (마이그레이션)
- 새 테이블 `user_awards` 생성: 사용자 키(`username_key`), 표시용 이름(`username`), 배지 이름(`name`), 정렬 순서(`sort_order`), 표준 타임스탬프.
- 모두가 읽을 수 있도록 공개 읽기 정책, 표준 권한 부여.
- 기존 `user_profiles.award` 중 값이 있는 항목을 `user_awards`로 복사(백필). `user_profiles.award` 컬럼은 호환을 위해 남겨두되 더 이상 쓰지 않습니다.

### 2. 서버 함수 (`src/lib/platform.functions.ts`)
- `ProfileBadge`/`DashboardDTO`/`UserProfileDTO`의 `award: string` → `awards: string[]`로 변경.
- `getProfileMap`: `user_awards`를 사용자별로 묶어 `awards` 배열(정렬 순서)로 채움.
- `listUserProfiles`: 사용자별 `awards` 배열 포함.
- `getMyDashboard`: 해당 닉네임의 `awards` 배열 반환.
- 배지 부여 방식 변경:
  - `upsertUserProfile`은 사용자명만 등록/유지하도록 정리(배지 입력 제거).
  - 신규 `addUserAward({ username, name })` — 배지 1개 추가.
  - 신규 `deleteUserAward({ id })` — 배지 1개 삭제.

### 3. 관리자 화면 (`src/routes/admin.profiles.tsx`)
- 배지 입력란을 "이 사용자에게 배지 추가" 흐름으로 변경.
- 목록에서 사용자마다 보유 배지를 **칩 목록**으로 모두 보여주고, 각 칩에 삭제(x) 버튼 추가.

### 4. 작성자 옆 배지 표시 (`src/components/AuthorBadge.tsx`) — 핵심
글·댓글 옆은 좁으므로 모든 배지를 한 번에 깔지 않습니다.
- **대표 배지 1개만** 인라인으로 노출(정렬 순서상 첫 번째 = 가장 우선/대표 배지).
- 배지가 2개 이상이면 대표 배지 옆에 **"+N" 칩**을 함께 표시.
- "+N" 칩(또는 대표 배지)에 **hover/클릭 시 팝오버(Tooltip/Popover)**로 보유 배지 전체 목록을 아이콘과 함께 보여줌.
- 배지가 1개면 기존처럼 그 배지만, "+N" 없이 표시.
- 레벨 배지(Lv.N)는 지금처럼 별도로 그대로 표시.

### 5. 내 페이지 (`src/routes/_main.mypage.tsx`)
- `LevelCard`가 단일 `award` 대신 `awards` 배열을 받아 보유 배지를 **모두** 표시. 없으면 "아직 받은 배지가 없어요." 유지.

## 기술 메모
- `awards`는 정렬 순서대로 반환, 모든 화면에서 같은 순서 사용.
- 배지 아이콘은 기존 `resolveAwardIcon`(키워드→아이콘 규칙)을 배지 이름마다 개별 적용.
- 작성자 옆 팝오버는 shadcn `Popover`(클릭/탭) 또는 `Tooltip`(hover) 사용 — 모바일 탭 지원을 위해 `Popover` 우선.
- 쿼리 무효화 키(`user-profiles`, `profile-map`)는 그대로 사용.
