## 목표

게시글을 SNS에 공유했을 때 링크 미리보기에 **게시글 제목**(과 가능하면 요약/이미지)이 표시되도록 합니다. 현재는 모든 페이지가 루트의 기본 메타("SEN _DEV_CONNECT")만 사용해서, 어떤 글을 공유해도 똑같은 미리보기가 뜹니다.

## 원인

`src/routes/_main.board.$slug.$postNo.tsx` 라우트에 `head()`가 없어서 페이지별 `<title>` / `og:title` / `og:description`이 설정되지 않습니다. 그래서 크롤러(카카오톡·페이스북 등)는 `__root.tsx`의 기본 메타만 읽습니다.

## 변경 내용

### `src/routes/_main.board.$slug.$postNo.tsx`
라우트 정의에 `head()`를 추가하여 loader가 받아온 게시글 데이터로 페이지별 메타를 생성합니다.

- `loaderData`(= 게시글 DTO)에서 값을 꺼내 다음을 설정:
  - `title`: `"{게시글 제목} — SEN _DEV_CONNECT"`
  - `description` / `og:description`: 본문에서 마크다운·HTML 태그를 제거한 앞부분 일부(약 160자)
  - `og:title`: 게시글 제목
  - `og:type`: `"article"`
  - `og:url`: `https://sendev.kr/board/{slug}/{postNo}`
  - 게시글에 `ogImageUrl`이 있으면 `og:image` / `twitter:image`도 추가(없으면 생략 → 루트 기본 이미지 유지)
- `loaderData`가 없을 때(레거시 UUID 링크, 비밀번호 게시판 등)는 메타를 추가하지 않고 기본값을 유지하도록 안전 처리.

### 동작 참고 (기술 세부)

- loader가 이미 `postByNoQueryOptions(...)`로 게시글을 `ensureQueryData`하여 반환하므로, 그 반환값이 `head({ loaderData })`로 전달됩니다. 추가 데이터 요청은 불필요합니다.
- 공개 게시판은 SSR 단계에서 글이 정상적으로 로드되어 크롤러가 제목을 읽습니다.
- 비밀번호 보호 게시판은 서버에서 본문을 내려주지 않으므로(보안상 의도된 동작) 제목이 노출되지 않고 기본 메타가 유지됩니다.
- 캐싱: 카카오톡 등은 링크 미리보기를 캐시하므로, 배포 후 이미 공유했던 링크는 미리보기 갱신에 시간이 걸리거나 디버거로 캐시를 새로고침해야 할 수 있습니다.

### 가이드 업데이트
- `src/routes/_main.guide.tsx`의 공유 관련 안내에 "게시글 링크를 공유하면 제목이 미리보기에 표시된다"는 설명을 반영(프로젝트 규칙: 기능 변경 시 가이드 동기화).

## 범위 밖

- DB/스키마 변경 없음.
- 다른 라우트(목록·홈 등)의 메타는 이번 작업 범위에 포함하지 않음.
