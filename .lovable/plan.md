# 수상명 키워드 → 아이콘 규칙

수상 배지 아이콘을 전체 공통 1개가 아니라, **수상명에 포함된 키워드에 따라** 다르게 표시합니다. 예: 수상명에 "대상"이 들어가면 왕관, "최우수"면 별, "인기"면 하트. 매칭되는 규칙이 없으면 기존 기본 아이콘(현재 전역 설정값)을 사용합니다.

## 동작
- 프로필 관리 페이지(`/admin/profiles`)의 "수상 배지 아이콘" 영역에 **키워드 규칙 목록**을 추가.
- 각 규칙 = 키워드(예: "대상") + 아이콘. 관리자가 키워드 입력 + 아이콘 선택으로 규칙을 추가/삭제.
- 기존 "기본 아이콘" 선택은 그대로 유지 → 어떤 규칙에도 안 맞을 때 사용.
- 매칭은 수상명에 키워드가 포함(부분일치, 대소문자 무시)되는지로 판단. 여러 규칙이 맞으면 위(우선순위)에 있는 규칙 적용.
- 저장 즉시 게시판 목록·게시글·댓글의 수상 배지 아이콘이 수상명에 맞게 바뀜.

## 구현 (기술 상세)

### 1. DB 마이그레이션
- `award_icon_rules` 테이블 신설: `keyword`(text), `icon`(text), `sort_order`(int, 우선순위), 표준 타임스탬프.
- GRANT + RLS(공개 읽기). 쓰기는 서버 함수(service role)로만.
- 기존 `site_settings`의 `award_icon`(기본 아이콘)은 폴백으로 그대로 유지.

### 2. 서버 함수 (`src/lib/platform.functions.ts`)
- `listAwardIconRules` (GET): 규칙을 `sort_order` 순으로 반환.
- `addAwardIconRule` (POST): 키워드(1~100자) + 아이콘(화이트리스트 검증) 추가.
- `deleteAwardIconRule` (POST): id로 삭제.
- 아이콘 해석 헬퍼(`resolveAwardIcon(award, rules, defaultIcon)`) export — 첫 매칭 규칙의 아이콘, 없으면 기본 아이콘.

### 3. 쿼리 옵션 (`src/lib/platform.queries.ts`)
- `awardIconRulesQueryOptions()` 추가. (기존 `awardIconQueryOptions` 유지)

### 4. 배지 렌더링 (`src/components/AuthorBadge.tsx`)
- 규칙 목록 + 기본 아이콘을 구독 → 수상명으로 `resolveAwardIcon` 호출해 아이콘 결정.
- lucide `icons` 맵에서 이름으로 동적 조회, 폴백 Trophy. 기존 호출부 변경 불필요.

### 5. 관리자 UI (`src/routes/admin.profiles.tsx`)
- 기존 기본 아이콘 그리드 아래에 "수상명 키워드 규칙" 섹션 추가.
- 규칙 목록(키워드 + 아이콘 미리보기 + 삭제 버튼), 새 규칙 추가 폼(키워드 입력 + 아이콘 선택 그리드).
- 저장/삭제 시 `award-icon-rules` 쿼리 무효화 + 토스트.

디자인 토큰을 사용하며 기존 동작과 호환됩니다.