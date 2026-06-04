## 목표

링크(유튜브) 카드에서 지금은 OG 이미지가 없으면 단색 배경 위에 재생 버튼만 보입니다. 첨부 화면처럼 비어 보이지 않도록, 유튜브 영상의 실제 썸네일이 카드에 채워지게 합니다.

## 원인

현재 `LinkCard`는 `post.ogImageUrl` 또는 백필된 OG 이미지가 있을 때만 이미지를 보여줍니다. 유튜브 링크는 OG 이미지가 비어 있는 경우가 많아 단색 배경 + 재생 버튼만 표시됩니다.

## 변경 내용

### 1. `src/lib/embed.ts`
- `getThumbnailUrl(url)` 함수 추가:
  - 유튜브(`youtu.be`, `/watch?v=`, `/shorts/`, `/embed/`)에서 video ID를 추출해 `https://img.youtube.com/vi/{id}/hqdefault.jpg` 썸네일 URL 반환
  - 비메오/캔바 등 썸네일을 만들 수 없는 경우 `null` 반환
  - 기존 `getEmbedUrl`의 ID 추출 로직을 재사용

### 2. `src/routes/_main.board.$slug.index.tsx` (`LinkCard`)
- 이미지 소스 우선순위를 `post.ogImageUrl → 백필 OG 이미지 → getThumbnailUrl(deployUrl)` 순으로 변경
- 썸네일이 있으면 단색 배경 대신 실제 썸네일을 카드에 채워서 표시
- 재생 버튼 오버레이는 유지하되, 썸네일 위에 작게 얹혀 보이도록 함(영상임을 알 수 있게)

## 확인
- 빌드 후 유튜브 링크 카드에 실제 영상 썸네일이 표시되는지 미리보기로 확인합니다.