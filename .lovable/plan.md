## 목표
별도의 **메인 페이지**(`/home`)를 만들어 ① 관리자가 올린 이미지들을 좌우 스와이프 캐러셀(히어로 배너)로 보여주고 ② 다가오는 이벤트를 크게 노출합니다. 관리자 대시보드에는 **메인화면 구성** 메뉴를 추가해 이미지를 여러 장 업로드/삭제/정렬할 수 있게 합니다.

## 데이터베이스
새 테이블 `hero_slides` 추가 (마이그레이션):
- `image_url` (text) — 업로드된 이미지의 서명 URL
- `caption` (text, 선택) — 이미지 위 짧은 문구
- `link_url` (text, 선택) — 클릭 시 이동할 주소
- `sort_order` (int) — 노출 순서
- 표준 필드(id, created_at) 포함
- RLS 활성화 + 적절한 GRANT (읽기는 공개, 쓰기/삭제는 service_role — 모든 접근이 서버 함수의 admin 클라이언트를 통하므로 events/posts와 동일한 패턴)

이미지 저장은 기존 이벤트 첨부와 동일하게 **비공개 버킷 + 장기 서명 URL** 방식을 사용합니다. 새 비공개 스토리지 버킷 `hero-images`를 생성합니다.

## 서버 함수 (`src/lib/platform.functions.ts`)
events 패턴을 그대로 따릅니다:
- `listHeroSlides` — sort_order 순으로 슬라이드 목록 반환
- `uploadHeroImage` — base64 이미지를 `hero-images` 버킷에 업로드 후 서명 URL 반환 (기존 `uploadEventFile`과 동일 로직)
- `createHeroSlide` — image_url/caption/link_url 저장 (sort_order 자동 부여)
- `deleteHeroSlide` — 슬라이드 삭제
- `updateHeroSlideOrder` — 위/아래 이동으로 순서 변경

`src/lib/platform.queries.ts`에 `heroSlidesQueryOptions` 추가.

## 메인 페이지 (`src/routes/_main.home.tsx`)
- **히어로 캐러셀**: `hero_slides`를 `Carousel`(embla, 좌우 스와이프 지원)로 렌더링. 좌우 화살표 + 도트 인디케이터, 모바일 스와이프 동작. 슬라이드에 caption/link 있으면 표시·연결. 슬라이드가 없으면 기본 안내 배너.
- **다가오는 이벤트**: 기존 `listEvents`에서 오늘 이후 가장 가까운 행사들을 골라 크게 카드로 노출(날짜/장소/설명, 캘린더로 가는 링크).
- 라우트에 `head()` 메타데이터(title/description/og) 작성.

## 라우팅 & 네비게이션
- `src/routes/index.tsx`: 기존 `/calendar` 리다이렉트 → `/home`으로 변경.
- `src/routes/_main.tsx`: 상단 네비게이션에 "홈"(Home 아이콘) 탭을 캘린더 앞에 추가(데스크톱·모바일 메뉴 모두). 로고 링크도 `/home`으로 변경.

## 관리자: 메인화면 구성 (`src/routes/admin.home.tsx`)
- `src/routes/admin.tsx`의 `tabs` 배열에 `{ to: "/admin/home", label: "메인화면 구성", icon: ImageIcon }` 추가.
- 페이지 구성:
  - 이미지 업로드 영역: 파일 선택 시 여러 장을 순차로 `uploadHeroImage` → `createHeroSlide` 호출. 선택적으로 문구/링크 입력.
  - 등록된 슬라이드 목록: 썸네일, 위/아래 순서 이동 버튼, 삭제 버튼.
  - 업로드/삭제 후 `heroSlidesQueryOptions` 무효화로 즉시 반영.

## 기술 메모
- 이미지 업로드는 클라이언트에서 base64로 인코딩 후 서버 함수에 전달(기존 이벤트 첨부 방식과 동일, 파일당 최대 ~15MB).
- 캐러셀은 이미 설치된 `embla-carousel-react` 기반 `@/components/ui/carousel`을 사용하므로 신규 의존성 없음.
