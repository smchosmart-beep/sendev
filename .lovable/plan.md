# 평가 순서 셔플 + 평가 잠금 기능

## 목표 (확정된 동작)
- **게시판별**로 관리자가 "평가 셔플/개시" 버튼을 누르기 전에는 **평가 제출 자체가 잠김**.
- 버튼을 누르면 그 게시판의 평가가 열리고, 동시에 평가 순서가 새로 셔플됨.
- 평가 순서는 **기기별로 각각 다른 랜덤 순서**(전원 동일 X).
- 셔플 후 새로 등록된 산출물은 기존 순서를 어지럽히지 않고 **기기별 랜덤 순서로 자동 배정**됨.
- 관리자가 다시 셔플을 누르면 모든 기기의 순서가 새로 섞임(의도적 리셋).

## 핵심 아이디어
기존에는 새 산출물이 추가될 때마다 `seededShuffle(projects, seed)`가 **전체 배열을 다시 섞어서** "다음 평가" 순서가 통째로 바뀌는 문제가 있었습니다. 이를 두 가지로 해결합니다.

1. **안정 정렬(stable per-item ordering)**: 각 산출물을 `hash(기기시드 + 게시판셔플값 + 산출물ID)` 값으로 정렬. 산출물이 추가돼도 기존 항목들의 상대 순서는 그대로 유지되고, 새 항목만 자기 해시 위치에 끼워집니다. → "다음 산출물 평가" 버튼이 통째로 흔들리지 않음.
2. **게시판 셔플값(eval_seed)**: 관리자가 셔플을 누르면 이 값이 새로 바뀌어, 모든 기기의 정렬이 한 번에 새로 섞임. 평소 산출물 추가로는 바뀌지 않음.

## 데이터베이스 (마이그레이션)
`categories` 테이블에 컬럼 추가:
- `eval_open boolean not null default false` — 평가 개시 여부
- `eval_seed bigint not null default 0` — 셔플 값(셔플할 때마다 갱신)

(categories는 admin 클라이언트로만 접근하므로 추가 GRANT/RLS 불필요 — 기존 패턴 유지)

## 서버 함수 (`src/lib/platform.functions.ts`)
- `CategoryDTO`에 `evalOpen: boolean`, `evalSeed: number` 추가.
- `listCategories` select/매핑에 `eval_open`, `eval_seed` 포함.
- 신규 `shuffleEvaluation` (admin): 입력 `{ id }` → `eval_open=true`, `eval_seed=<랜덤 정수>`로 업데이트.
- 신규 `closeEvaluation` (admin): 입력 `{ id }` → `eval_open=false` (평가 마감/잠금 복귀용).

## 관리자 화면
`src/routes/admin.tsx` 탭에 **"평가 진행 관리"** 추가하고 새 라우트 `src/routes/admin.evaluation.tsx` 생성:
- 게시판(카테고리) 목록을 카드로 표시.
- 각 게시판마다 현재 상태 배지(평가 잠김 / 평가 진행중) + 산출물 수.
- 버튼: **"평가 셔플 & 개시"**(누르면 확인 후 `shuffleEvaluation` 호출, 이미 열린 경우 "순서 다시 섞기"로 동작), **"평가 마감"**(`closeEvaluation`).
- 다시 셔플 시 "모든 평가자의 순서가 새로 섞입니다" 경고 다이얼로그.

## 산출물 평가 영역 (`src/routes/_main.board.$slug.$postNo.tsx`)
`EvaluationSection`에서:
- `categoriesQueryOptions()`로 현재 `categoryId`의 `evalOpen`/`evalSeed`를 읽음.
- **`evalOpen === false`이면**: 별점 입력/제출 UI 대신 안내 문구 표시("아직 평가가 시작되지 않았어요. 관리자가 평가를 개시하면 참여할 수 있어요."). 평균 요약은 그대로 노출.
- **순서 계산 변경**: 기존 `seededShuffle(projects, orderSeed)` 대신, `orderSeed`와 `evalSeed`를 결합한 키로 **안정 정렬**한 배열을 사용. `nextProjectNo` 로직(앞으로 진행+순환)은 그대로 두되 입력 배열만 안정 정렬 결과로 교체.

## 라이브러리 (`src/lib/series.ts`)
- 신규 `stableEvalOrder(projects, deviceSeed, evalSeed)`: 각 산출물 ID 문자열 + 두 시드를 해시(예: 기존 mulberry32 + 문자열 해시 조합)하여 그 값으로 정렬한 새 배열 반환. 동점 시 ID로 타이브레이크하여 결정적 보장.

## 기술 상세 / 엣지 케이스
- 산출물 1개 이하면 셔플 의미 없음 — 관리자 화면에서 버튼은 노출하되 평가 잠금 로직은 동일 적용.
- 평가 잠김 상태에서 직접 URL로 들어와도 제출 불가(제출 버튼/입력 비표시) — 클라이언트 차단. 필요 시 `createReview` 서버단 검증은 별도 강화 가능(이번 범위에선 클라이언트 차단으로 처리, 원하시면 서버 검증도 추가).
- `eval_seed` 기본값 0이므로 기존 게시판은 전부 "평가 잠김" 상태로 시작 → 관리자가 개시해야 평가 가능(요청하신 동작과 일치).

## 검증
- 마이그레이션 후 `listCategories`가 새 필드를 반환하는지 확인.
- 관리자에서 셔플 → 산출물 페이지에서 평가 가능해지는지, 마감 시 다시 잠기는지 확인.
- 산출물 추가 시 기존 "다음 평가" 순서가 유지되는지(안정 정렬) 확인.
