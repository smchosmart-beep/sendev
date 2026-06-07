## 목표

게시글 **본문(content)** 안에 단독으로 넣은 링크가 일반 웹사이트(블로그·뉴스·깃허브 등)여도 OG 미리보기 카드(썸네일 + 제목 + 도메인)로 표시되게 한다. 지금은 유튜브/비메오/캔바만 임베드되고, 나머지는 파란 텍스트 링크로만 나온다.

## 현재 동작 (확인 완료)

- `src/routes/_main.board.$slug.$postNo.tsx`의 마크다운 렌더러에서 `soleLinkEmbed()`가 문단 안에 링크 하나만 있을 때 동작하지만, `getEmbedUrl()`(유튜브/비메오/캔바)이 지원하는 링크에만 `EmbeddedFrame`을 만든다.
- OG 이미지 추출 함수 `resolveOgImage()`(모든 사이트 대응)는 존재하지만, "링크 게시물"의 별도 입력칸(`deploy_url`)에만 쓰이고 본문 마크다운 링크에는 적용 안 됨.

## 변경 계획

### 1) OG 메타 조회 서버 함수 추가 (`src/lib/platform.functions.ts`)
- 기존 `resolveOgImage()`가 이미지 URL만 반환하므로, OG 제목/이미지/사이트명을 함께 뽑는 헬퍼와 서버 함수를 추가한다.
  - `resolveOgMeta(url)`: `extractMetaContent()`를 재사용해 `og:image`, `og:title`(없으면 `<title>`), `og:site_name`/도메인을 추출해 `{ image, title, siteName }` 반환.
  - `fetchLinkPreview` = `createServerFn({ method: "GET" })` + zod URL 검증(max 500). 결과 `{ image, title, siteName } | null` 반환.
- 외부 요청 비용을 줄이기 위해 동일 캐시 정책 유지(짧은 타임아웃, head까지만 읽기).

### 2) 조회용 query options 추가 (`src/lib/platform.queries.ts`)
- `linkPreviewQueryOptions(url)`: `fetchLinkPreview` 호출, `staleTime`을 길게(예: 1시간) 두고 url을 queryKey에 포함. 빈 url이면 `enabled: false`.

### 3) 본문 링크 프리뷰 카드 컴포넌트 (`src/routes/_main.board.$slug.$postNo.tsx`)
- `LinkPreviewCard({ href })` 추가: `useQuery(linkPreviewQueryOptions(href))`로 OG 메타를 가져와
  - 썸네일(있으면 이미지, 없으면 외부링크 아이콘) + 제목(없으면 도메인) + 도메인/사이트명 + 새 탭 링크로 카드 렌더.
  - 로딩 중에는 스켈레톤/기본 카드 표시, 실패 시 기존처럼 단순 링크로 폴백.
- 마크다운 `p` 렌더러 수정:
  - 문단이 단독 링크일 때(`soleLinkEmbed`와 같은 단독 판별 로직 재사용/분리), `getEmbedUrl(href)`가 있으면 기존 `EmbeddedFrame`, 없으면 `LinkPreviewCard`로 렌더.
  - 단독 링크가 아니면(문장 중간 링크 등) 기존 인라인 텍스트 링크 유지.

### 4) 사용자 가이드 반영 (`src/routes/_main.guide.tsx`)
- 프로젝트 규칙(메모리)에 따라, 본문 링크 미리보기 동작 설명을 가이드의 글쓰기/링크 관련 섹션에 추가: "본문에 링크만 단독으로 한 줄에 넣으면 자동으로 미리보기 카드가 표시되며, 유튜브·비메오·캔바는 바로 재생/임베드된다."

## 기술 메모

- 모든 외부 fetch는 서버 함수에서만 수행(클라이언트 노출 없음). 기존 `resolveOgImage`의 타임아웃·부분 읽기 패턴을 그대로 따른다.
- 본문 링크는 게시 시점에 DB 캐시하지 않고 렌더 시 조회+React Query 캐시로 처리한다(본문 안에 링크가 여러 개일 수 있고 수시로 바뀌므로). 필요하면 추후 DB 캐시로 확장 가능.
- 추가 패키지 없음. 기존 `extractMetaContent`, `fetchOgImage` 패턴 재사용.

## 검증

- 본문에 일반 사이트 링크(예: 블로그/뉴스), 유튜브 링크, 캔바 링크, 깨진 링크를 각각 단독 줄로 넣은 글을 미리보기에서 확인:
  - 일반 사이트 → 썸네일+제목 카드
  - 유튜브/캔바 → 임베드 유지
  - 메타 없는/실패 링크 → 단순 링크 폴백
