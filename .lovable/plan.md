## 목표

장학사님이 사용할 관리자 대시보드 중 **① 게시판(카테고리) 추가/수정/삭제 UI**와 **② 공용 비밀번호 변경 화면**을 우선 구현합니다. DB 연동 전 단계이므로 모든 로직은 프론트엔드 상태(State)로 동작합니다. 동시에 이후 모든 페이지에서 재사용할 **디자인 시스템**을 먼저 세팅합니다.

> 참고: 현재 프로젝트는 Vite + React Router가 아니라 **TanStack Start(파일 기반 라우팅)** 템플릿입니다. 동작/디자인은 spec과 동일하게 만들되, 라우팅은 이 스택의 방식(`src/routes/`)을 따릅니다. shadcn/ui는 이미 설치되어 있습니다.

## 1단계 — 디자인 시스템 세팅 (가이드라인 엄수)

- **Pretendard 폰트**: `src/styles.css`에 Pretendard CDN(`@import` webfont) 적용, 전역 `font-family`로 지정. 시스템 폰트 사용 금지.
- **컬러 토큰**: `src/styles.css`의 oklch 토큰을 교체.
  - Primary = Mint Green `#10B981`
  - Background = `#F8FAFC` (연한 회색)
  - 기존 blue 계열 ring/primary 토큰 제거 → 민트 계열로 통일
- **라운드**: 기본 `--radius`를 키워 `rounded-2xl` 톤에 맞춤.
- 카드/버튼은 border 최소화 + `shadow-sm`/`shadow-md` + 넉넉한 여백(`p-6`+) 사용.
- 인터랙션 기본값: 버튼/카드에 `transition-all duration-200`, `active:scale-95`, hover 시 살짝 떠오르거나 밝아지는 효과.

## 2단계 — 관리자 대시보드 레이아웃

- 라우트: `src/routes/admin.tsx` (레이아웃 + `<Outlet/>`), `src/routes/admin.index.tsx`(개요), 탭/사이드 네비.
- 좌측 또는 상단 탭: **설정(비밀번호) / 게시판 관리** (이후 콘텐츠·캘린더·평가기준 탭 자리 마련).
- 이 단계에서는 Supabase 로그인 게이트 없이 화면만 구성(DB 연동 전).

## 3단계 — 게시판(카테고리) 관리 UI (핵심)

- `src/routes/admin.categories.tsx`
- 기능 (프론트엔드 state로 구현):
  - 카테고리 **목록** 표시 (카드/리스트, shadow 기반)
  - **추가**: 이름 + 설명 입력 폼 → 목록에 즉시 반영
  - **수정**: 인라인 또는 다이얼로그로 이름/설명 편집
  - **삭제**: 확인 다이얼로그(AlertDialog) 후 제거
- 상태는 컴포넌트 로컬 state(또는 간단한 context)로 관리, 초기 샘플 데이터(예: 입문형, 성장형) 포함.
- **Empty State**: 카테고리가 없을 때 친근한 안내 문구 + 아이콘 중앙 배치.
- **Skeleton**: 목록 표시 영역에 로딩 스켈레톤 컴포넌트 적용(추후 데이터 로딩 대비).

## 4단계 — 공용 비밀번호 변경 화면

- `src/routes/admin.settings.tsx`
- 현재 비밀번호 표시(마스킹) + 새 비밀번호 / 확인 입력 폼.
- 저장 시 state 업데이트 + 성공 토스트(sonner). 불일치 시 에러 메시지.
- 카드형 레이아웃, 디자인 가이드 동일 적용.

## 5단계 — 공용 컴포넌트

- `EmptyState`, `SkeletonList` 등 재사용 컴포넌트를 `src/components/`에 작성하여 이후 페이지에서 재사용.

## 기술 메모

- shadcn/ui 컴포넌트(card, button, input, dialog, alert-dialog, tabs, skeleton, sonner)는 이미 존재 → 그대로 활용.
- 색상은 컴포넌트에 직접 색상값을 쓰지 않고 `src/styles.css`의 시맨틱 토큰만 사용.
- DB(Supabase)·공용 입장 페이지·캘린더·게시판·README 렌더링·평가 기능은 **다음 단계**로 분리(이번 범위 제외).

## 이번 범위에서 제외 (다음 단계 예정)

- Lovable Cloud(Supabase) 활성화 및 모든 DB 연동
- 공용 비밀번호 입장 페이지(`/`), 메인 대시보드, 캘린더, 카테고리 게시판, 프로젝트 상세/README 렌더링, 평가(리뷰) 기능
