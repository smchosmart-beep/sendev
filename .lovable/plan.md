## 읽지 않은 게시글 표시 기능 (닉네임 기준, 기기 간 연동)

읽음 상태를 **등록된 닉네임 기준으로 서버(DB)에 저장**합니다. 같은 닉네임이면 휴대폰에서 읽은 글이 PC에서도 읽음으로 반영됩니다. 닉네임이 없으면 카드 숫자/분홍 점 등 어떤 표시도 하지 않습니다.

선택 반영: 카드 카운트는 **일반 글만**, 비밀번호 게시판도 **숫자 표시**, 분홍 점은 **고정글 포함**.

### 1. DB: 읽음 기록 테이블 (`post_reads`)
- 컬럼: `id`, `username_key`(닉네임 정규화 키), `post_id`, `created_at`.
- `(username_key, post_id)` 유니크 → 중복 읽음 방지.
- RLS 활성화, anon/authenticated 정책 없음(공개 읽기 금지). 서버 함수의 service_role 로만 접근.
- GRANT: service_role 전체 권한(서버 함수 전용).

### 2. 서버 함수 (`platform.functions.ts`) + 쿼리 옵션 (`platform.queries.ts`)
- `markPostRead({ author, postId })`: `author` 를 `normalizeUsername` 으로 키화해 `post_reads` 에 upsert(`on conflict do nothing`).
- `listReadPostIds({ author })`: 해당 닉네임이 읽은 모든 `post_id` 배열 반환.
- `listPostStubs()`: 모든 게시글의 `{ id, categoryId, type }[]` 반환(제목/본문 미포함, 비밀번호 무관).
- **입력 검증(zod)**: `author` 는 `trim().min(1).max(50)`, `postId` 는 `z.string().uuid()`. 검증 실패 시 그냥 무시(읽음은 비핵심 기능).
- 쿼리 옵션: `readPostIdsQueryOptions(author)`, `postStubsQueryOptions()`.

### 3. 닉네임 연동 (클라이언트)
- 기존 `useStoredIdentity()`(`sendev:identity`)로 현재 닉네임을 가져옴.
- 닉네임이 없으면 읽음 관련 쿼리를 `enabled: false` 로 비활성화하고, 카드 숫자/분홍 점을 전혀 렌더하지 않음.

### 4. 카테고리 카드 미열람 수 (`_main.board.index.tsx`)
- 닉네임이 있으면 `postStubsQueryOptions()` + `readPostIdsQueryOptions(author)` 로드.
- 카테고리별 `type === "post"`(일반 글) 중 읽은 id 에 없는 개수를 계산.
- `BoardCard` 에 0보다 클 때 미열람 배지(분홍 톤 숫자) 표시. 닉네임 없으면 배지 없음.

### 5. 글 목록 분홍 점 (`_main.board.$slug.index.tsx`)
- `readPostIdsQueryOptions(author)` 사용. 닉네임 없으면 점 없음.
- 고정 게시글 + 일반 게시글 목록에서 읽지 않은 글 제목 앞에 분홍색 점 표시.

### 6. 읽음 처리 (`_main.board.$slug.$postNo.tsx`)
- 상세 진입 시 닉네임이 있으면 `markPostRead({ author, postId })` 호출(useMutation).
- **이중 호출 가드**: `useRef` 로 (postId 기준) 1회만 호출되도록 막아 StrictMode/리렌더 중복 방지.
- 성공 시 `readPostIdsQueryOptions(author)` 무효화 → 목록/카드에 즉시 반영.

### 7. 가이드 업데이트 (`_main.guide.tsx`)
- 읽지 않은 글 표시는 닉네임 등록 시 동작하며, 같은 닉네임이면 기기 간 연동된다는 점과 카드 숫자/분홍 점 의미를 설명에 추가.

### 기술 참고 (검토 반영)
- **행 제한 주의**: Supabase 쿼리당 기본 1000행 제한. 현재 글 58개로 무관하나, `listPostStubs`/`listReadPostIds` 는 명시적 정렬(`created_at`)을 두고, 향후 글이 1000개를 넘으면 범위/페이지네이션이 필요함을 주석으로 남김.
- 읽음 기록은 글을 열 때마다 1행 upsert(중복 무시)로 쓰기 비용 최소화.
- 카운트는 클라이언트에서 스텁 ∩ (읽지 않음) 으로 계산.
- 분홍 점/뱃지는 Tailwind 핑크 계열 또는 `styles.css` 의미 토큰으로 처리.
- 새 테이블·함수·쿼리 키만 추가해 기존 기능(캘린더/평가/좋아요/댓글)과 격리됨.