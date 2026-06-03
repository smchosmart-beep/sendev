## 목표

첫 화면(`/`)이 관리자 대시보드로 이동하지 않고 **캘린더부터** 보이도록 변경합니다. 상단 헤더에 **캘린더 / 게시판** 탭을 두고, 게시판 탭에서 게시판 목록과 게시판 상세를 볼 수 있게 합니다. 모든 데이터는 아직 프론트엔드 상태(State)로 동작하며, **관리자에서 만든 게시판이 메인에도 실시간 공유**되도록 합니다.

## 1단계 — 공유 스토어로 승격

- 현재 `AdminStoreProvider`는 `/admin` 레이아웃 안에만 있어 메인과 공유되지 않음.
- `src/lib/admin-store.tsx`를 앱 전역 스토어로 확장(이름은 그대로 사용):
  - 기존 `categories`, `globalPassword` 유지
  - **`events`** 추가: `{ id, title, date, location, time, description }` (샘플 일정 포함)
  - 게시판 상세용 **`posts`** 샘플 데이터 추가: `{ id, categoryId, type: "notice"|"project", title, author }`
- Provider를 `src/routes/__root.tsx`의 `RootComponent`로 이동(앱 전역 래핑). `/admin` 레이아웃에서는 중복 Provider 제거.

## 2단계 — 메인 레이아웃 + 헤더 탭

- 새 파일 `src/routes/_main.tsx` (pathless 레이아웃):
  - 상단 헤더: 로고 + **캘린더 / 게시판** 탭(Link, active 상태 강조), 우측에 관리자 링크
  - `<Outlet />`로 하위 페이지 렌더
  - 디자인 가이드 유지(민트, `rounded-2xl`, shadow, hover 부상/`active:scale-95`)
- 기존 `src/routes/index.tsx`(랜딩) 는 `/calendar`로 리다이렉트하도록 변경하여 첫 화면이 캘린더가 되게 함.

## 3단계 — 캘린더 페이지 (`/calendar`)

- `src/routes/_main.calendar.tsx`
- **월간 달력 뷰** 직접 구현(외부 라이브러리 없이 그리드로):
  - 이전/다음 달 이동, 오늘 강조
  - 일정이 있는 날짜 셀에 일정 표시(점/제목 칩)
- 일정 칩/셀 클릭 시 **상세 모달**(shadcn Dialog) 오픈 → 제목, 날짜, 시간, 장소, 설명 표시
- 일정 없을 때를 대비한 빈 상태 문구, 초기 로딩 스켈레톤 적용

## 4단계 — 게시판 목록 (`/board`)

- `src/routes/_main.board.index.tsx`
- 공유 스토어의 `categories`를 카드 그리드로 표시(이름, 설명)
- 카드 클릭 시 해당 게시판 상세로 이동
- 빈 상태/스켈레톤 적용

## 5단계 — 게시판 상세 (`/board/$categoryId`)

- `src/routes/_main.board.$categoryId.tsx`
- 상단에 게시판 이름/설명
- **공지사항(Notice) / 산출물(Projects) 서브탭**(shadcn Tabs)
  - Notice: 리스트형
  - Projects: 그리드 썸네일 카드(제목/작성자) — 샘플 데이터 기반
- 잘못된 categoryId일 경우 notFound 처리, 빈 상태/스켈레톤 적용

## 기술 메모

- TanStack Start 파일 기반 라우팅 사용(`src/routes/`). pathless `_main` 레이아웃으로 헤더 공유.
- 색상은 `src/styles.css` 시맨틱 토큰만 사용(직접 색상값 금지), 기존 민트 디자인 시스템 유지.
- shadcn `dialog`, `tabs`, `card`, `skeleton` 등 기존 컴포넌트 재사용.
- GitHub README 렌더링/평가(리뷰)/공용 비밀번호 입장 게이트/실제 DB 연동은 **다음 단계**로 제외.

## 이번 범위에서 제외 (다음 단계 예정)

- Lovable Cloud(Supabase) DB 연동
- 프로젝트 상세 README 렌더링 및 평가(리뷰) 기능
- 공용 비밀번호 입장 게이트
