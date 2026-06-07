## 목표

auth 없이, 관리자가 **사용자명 ↔ 프로필(레벨 + 해커톤 수상)**을 수동으로 매핑하고, 작성자명이 **정확히 일치**하는 모든 표시 위치(글 본문 작성자 / 글 목록 / 댓글)에 레벨·수상 뱃지를 자동으로 보여줍니다.

## 동작 방식

```text
[관리자] 사용자 프로필 관리 탭
   이름: "홍길동"  레벨: 3   수상: "AI교육 부문 대상"
        │  (정확히 일치하는 이름)
        ▼
[글/댓글 작성자 "홍길동"] →  홍길동  ⬡Lv.3  🏆 AI교육 부문 대상
```

- 매칭은 **대소문자·공백 정규화 후 정확히 일치하는 이름만** (부분 일치/추천 없음).
- 일치하는 프로필이 없으면 기존처럼 이름만 표시(뱃지 없음).

## 구현 단계

### 1. 데이터베이스 (마이그레이션)
`user_profiles` 테이블 신설:
- `username` (text, unique) — 작성자명과 매칭하는 키
- `level` (정수, 1~99, nullable)
- `award` (text, 해커톤 수상 내용, 빈 문자열 허용)
- 표준 필드(id, created_at, updated_at) + updated_at 트리거

데이터 접근은 기존 패턴과 동일하게 **service-role 서버 함수로만** 처리(RLS는 직접 클라이언트 접근 차단, 읽기는 공개 서버 함수로 노출). GRANT는 가이드대로 service_role 포함.

### 2. 서버 함수 (`src/lib/platform.functions.ts`)
- `listUserProfiles()` — 관리자 목록용 전체 조회
- `upsertUserProfile({ username, level, award })` — 생성/수정 (username 기준 upsert)
- `deleteUserProfile({ id })`
- `getProfileMap()` — `{ [정규화된 username]: { level, award } }` 형태의 가벼운 맵 반환 (공개 표시용, 본문/목록/댓글에서 공통 사용)

대응하는 query options를 `src/lib/platform.queries.ts`에 추가.

### 3. 재사용 표시 컴포넌트 (`src/components/AuthorBadge.tsx`)
- props: `author`, 그리고 미리 받아온 profile 맵
- 레벨이 있으면 `Lv.N` 뱃지, 수상이 있으면 트로피 아이콘 + 수상명 뱃지 렌더
- 디자인 토큰만 사용(`bg-primary`, `bg-secondary`, `text-muted-foreground` 등), 색상 하드코딩 금지
- 작은/큰 두 가지 크기 지원(목록=작게, 본문=크게)

### 4. 표시 위치 연결
프로필 맵을 한 번 조회해 아래 위치의 작성자명 옆에 `AuthorBadge`를 끼워넣음:
- **글 본문 작성자** — `_main.board.$slug.$postNo.tsx` (작성자 표시 영역)
- **글 목록** — `_main.board.$slug.index.tsx` (공지/질문/일반/프로젝트 목록의 작성자명)
- **댓글 작성자** — `_main.board.$slug.$postNo.tsx` (댓글 영역)

각 라우트 loader에서 `getProfileMap`을 `ensureQueryData`로 프리패치하고 컴포넌트에서 `useSuspenseQuery`로 구독(기존 데이터 로딩 패턴 준수).

### 5. 관리자 페이지 (`src/routes/admin.profiles.tsx`)
- `admin.tsx`의 탭 목록에 "사용자 프로필" 추가
- 등록된 매핑 목록을 표로 표시(이름 / 레벨 / 수상 / 수정·삭제)
- 새 매핑 추가 폼: 이름, 레벨(숫자), 수상(텍스트)
- 저장/삭제 시 관련 query 무효화

## 기술 메모
- 레벨 표기는 우선 `Lv.N` 숫자 뱃지로 통일(요청한 "숫자/등급" 중 숫자 기반). 등급명이 필요하면 추후 매핑 추가 가능.
- 이름 매칭 정규화: `trim().toLowerCase()` 기준. 같은 이름이 여러 사람일 수 있는 한계는 auth 부재로 인한 구조적 제약이며, 본 방식의 알려진 트레이드오프.
- 아바타 이미지 업로드는 이번 범위에서 제외(요청에서 레벨/수상만 선택). 추후 `event-files`처럼 버킷 매핑으로 확장 가능.
