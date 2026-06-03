# 배포 URL OG 이미지 캐싱

## 현재 상태

지금은 산출물 카드가 렌더링될 때마다 `fetchOgImage` 서버 함수를 호출해 배포 사이트의 HTML을 다시 가져와 og:image를 파싱합니다. TanStack Query에 30분 staleTime 캐시가 있지만, 캐시가 만료되거나 새 세션/새로고침이 발생하면 다시 외부 사이트로 요청이 나갑니다. 산출물이 많으면 매번 여러 외부 요청이 발생합니다.

## 목표

OG 이미지 URL을 **한 번 가져온 뒤 DB(posts)에 저장**하여, 이후 로딩에서는 외부 재요청 없이 저장된 값을 그대로 사용합니다.

## 변경 내용

### 1. 데이터베이스
- `posts` 테이블에 `og_image_url text not null default ''` 컬럼 추가 (마이그레이션).

### 2. 서버 함수 (`src/lib/platform.functions.ts`)
- `PostDTO`에 `ogImageUrl: string` 추가, `mapPost`에서 매핑.
- 기존 `fetchOgImage`의 파싱 로직을 내부 헬퍼(`resolveOgImage(url)`)로 재사용 가능하게 분리.
- `createPost`: deployUrl이 있으면 등록 시점에 OG 이미지를 한 번 가져와 `og_image_url`에 함께 저장.
- `updatePost`: deployUrl이 변경된 경우에만 OG 이미지를 다시 가져와 저장하고, 동일하면 기존 값 유지(불필요한 재요청 방지).
- (선택) 저장된 값이 비어 있는 기존 산출물을 위해 `fetchOgImage`는 fallback으로 유지하되, 결과를 DB에 backfill하는 `refreshOgImage` 서버 함수 추가.

### 3. 프론트엔드 (`src/routes/_main.board.$categoryId.index.tsx`)
- `ProjectCard`에서 `useQuery(ogImageQueryOptions(...))` 대신 저장된 `post.ogImageUrl`을 우선 사용.
- `ogImageUrl`이 비어 있고 `deployUrl`이 있는 경우에만(기존 데이터 보정용) `ogImageQueryOptions`로 한 번 조회 → backfill. 신규 산출물은 외부 요청이 전혀 발생하지 않음.

### 4. 상세 페이지 (`src/routes/_main.board.$categoryId.$postId.tsx`)
- `updatePost` 호출 시 동일하게 deployUrl 변경에 따라 OG 이미지가 갱신되도록 처리(서버 함수 변경으로 자동 반영).

## 동작 검증
- 신규 산출물 등록 → 카드 첫 로딩부터 저장된 OG 이미지 표시, 외부 사이트 요청 없음(네트워크 탭 확인).
- 새로고침/재방문 시 외부 재요청 없이 즉시 이미지 표시.
- 배포 URL 수정 시에만 OG 이미지 재조회.
- 기존(저장값 없는) 산출물은 1회 조회 후 저장되어 다음부터는 재요청 없음.

## 기술 메모
- OG 이미지 가져오기는 서버 함수 내부에서만 수행(타임아웃·다운로드 크기 제한 기존 로직 유지).
- DB 저장은 service-role 어드민 클라이언트로 기존 패턴과 동일하게 처리.
