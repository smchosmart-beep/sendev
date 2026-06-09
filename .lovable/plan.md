## 목표
본문 게시글에 캔바(canva) 링크를 삽입했을 때:
- **보기 전용 링크**(리다이렉트 결과가 `/view`) → 링크 게시판처럼 **자동 임베드**(iframe 미리보기)
- **프로젝트 공유 링크**(리다이렉트 결과가 `/edit`, 임베드 불가) → 구글 드라이브처럼 **캔바 아이콘** 미리보기 카드

## 배경 (확인된 사실)
두 링크 모두 `canva.link/...` 단축 URL이라 문자열만으로 구분 불가. 서버에서 리다이렉트를 따라가면 구분됨:
- `canva.link/p1b65...` → `.../design/<id>/<token>/view?...` (임베드 가능)
- `canva.link/ecseu...` → `.../design/<id>/<token>/edit?...` (403, 임베드 불가)

현재 `getEmbedUrl`은 `canva.com/design/.../view`만 임베드 처리하고 `canva.link` 단축 URL은 처리하지 못해, 본문에서 두 링크 모두 일반 미리보기 카드로만 표시됨.

## 작업 내용

### 1. 서버 함수 추가 (`src/lib/platform.functions.ts`)
- `resolveCanvaLink({ url })`: `canva.link`/`canva.com` 링크의 리다이렉트를 서버에서 **수동으로 최대 몇 홉** 따라가(HEAD + Location 헤더, 봇 차단 회피용 User-Agent 지정) 최종 canva.com 디자인 URL을 구함.
- 반환: `{ kind: "view" | "edit" | "other", embedUrl: string | null }`
  - 최종 경로가 `/view` → `kind:"view"`, `embedUrl = https://www.canva.com/design/<id>/<token>/view?embed`
  - 최종 경로가 `/edit` → `kind:"edit"`, `embedUrl: null`
  - 그 외/실패 → `kind:"other"`, `embedUrl: null`

### 2. 쿼리 옵션 (`src/lib/platform.queries.ts`)
- `canvaLinkQueryOptions(url)` 추가(`staleTime` 길게 잡아 외부 요청·서버 비용 최소화).

### 3. 본문 렌더러 + 카드 (`src/routes/_main.board.$slug.$postNo.tsx`)
- 본문 단독 링크(`soleLinkHref`) 처리 순서에서 **캔바 호스트(`canva.link` 또는 `canva.com/design`)면** 새 컴포넌트 `CanvaLinkCard`로 분기(기존 `getEmbedUrl`/`LinkPreviewCard`보다 먼저).
- `CanvaLinkCard`:
  - `canvaLinkQueryOptions`로 해석. 로딩 중에는 가벼운 자리표시(skeleton) 카드.
  - `kind === "view"` → 기존 `EmbeddedFrame`로 자동 임베드.
  - 그 외(`edit`/`other`) → `LinkPreviewCard`로 폴백(아래 아이콘 표시 적용).
- `CanvaIcon`(인라인 SVG, 별도 의존성 없음) 추가하고, `LinkPreviewCard`에서 호스트가 `canva.link`/`canva.com`이면 구글 드라이브처럼 캔바 아이콘을 미리보기 영역과 사이트명 줄에 표시.

### 4. 사용자 가이드 업데이트 (`src/routes/_main.guide.tsx`)
- "본문에 캔바 보기 전용 링크 → 자동 임베드 / 프로젝트 공유 링크 → 캔바 아이콘 카드" 동작 설명 추가.

## 범위/안전
- 외부 요청은 캔바 호스트에 한해 1회 해석 + React Query 캐시로 비용 최소화.
- 기존 YouTube/Vimeo/일반 링크 임베드 및 링크 게시판 동작에는 영향 없음(본문 캔바 분기만 우선 적용).
- DB/스키마 변경 없음. 표시·해석 로직만 추가.
