# 수상 배지 아이콘 커스터마이징

관리자가 수상(award) 배지에 표시되는 아이콘을 미리 준비된 목록에서 골라 **전체 공통 1개**로 지정할 수 있게 합니다. 현재는 항상 Trophy(🏆)로 고정되어 있습니다.

## 동작
- 프로필 관리 페이지(`/admin/profiles`, 시스템 관리자 인증 뒤)에 아이콘 선택 영역 추가.
- 약 12개의 lucide 아이콘(트로피, 별, 왕관, 메달, 불꽃, 하트, 번개, 방패, 보석, 엄지, 로켓, 리본 등)을 그리드로 보여주고 클릭해 선택 → 저장.
- 저장 즉시 게시판 목록·게시글·댓글 등 모든 수상 배지의 아이콘이 바뀜.
- 기본값은 트로피로, 한 번도 설정하지 않은 경우 기존과 동일하게 표시.

## 구현 (기술 상세)

### 1. 전역 설정 저장소 (DB 마이그레이션)
- `site_settings` 테이블 신설: `key`(PK, text), `value`(text), 표준 타임스탬프.
- 적절한 GRANT + RLS(공개 읽기 정도) 추가. 쓰기는 서버 함수(service role)로만 수행.
- 기본 행 `award_icon = 'Trophy'` 삽입.

### 2. 서버 함수 (`src/lib/platform.functions.ts`)
- 허용 아이콘 이름 화이트리스트 상수(`AWARD_ICON_NAMES`) 정의 — 선택지/검증 공용.
- `getAwardIcon` (GET): 저장된 아이콘 이름 반환, 없으면 `'Trophy'`.
- `setAwardIcon` (POST): 입력을 화이트리스트로 검증 후 `site_settings` upsert.

### 3. 쿼리 옵션 (`src/lib/platform.queries.ts`)
- `awardIconQueryOptions()` 추가.

### 4. 배지 렌더링 (`src/components/AuthorBadge.tsx`)
- lucide `icons` 맵에서 이름으로 컴포넌트를 동적 조회(없으면 Trophy 폴백).
- 컴포넌트 내부에서 `awardIconQueryOptions`를 구독해 아이콘 적용 — 기존 호출부(여러 게시판/게시글/댓글) 변경 불필요.

### 5. 관리자 UI (`src/routes/admin.profiles.tsx`)
- 프로필 카드 상단/하단에 "수상 배지 아이콘" 선택 그리드 추가.
- 선택 시 `setAwardIcon` 호출, 성공 토스트 + `award-icon`·`profile-map` 쿼리 무효화.
- 현재 선택된 아이콘 강조 표시.

기존 데이터/동작과 완전히 호환되며, 디자인 토큰을 사용해 스타일링합니다.