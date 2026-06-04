## 목표

링크 게시판(`type === "link"`) 글은 **README와 평가(채점) 섹션을 제거**하고, 등록한 주소(유튜브, 캔바 등)를 **카드/상세에서 바로 임베드(iframe)로 재생·미리보기**되도록 합니다.

## 현재 문제

- 글 상세(`_main.board.$slug.$postNo.tsx`)에서 링크 글은 `isBoardPost`가 false라서 일반 산출물처럼 **README 섹션 + 평가 섹션이 잘못 표시**됩니다.
- 링크 상세에는 임베드가 없고, 단순히 "배포 사이트" 외부 링크만 보입니다.

## 작업 내용

### 1. 임베드 변환 유틸 (신규 `src/lib/embed.ts`)
주소를 받아 임베드 가능한 iframe URL을 돌려주는 순수 함수 `getEmbedUrl(url)` 추가:
- **유튜브**: `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/` → `https://www.youtube.com/embed/{id}`
- **캔바**: 디자인/프레젠테이션 공유 링크 → 뒤에 `?embed` 또는 `/view?embed` 형태의 임베드 URL
- **비메오** 등 일반적 케이스 가벼운 처리, 그 외에는 `null` 반환(임베드 불가 → 외부 링크 버튼으로 대체)

### 2. 글 상세 화면 (`_main.board.$slug.$postNo.tsx`)
- `isLink = post.type === "link"` 분기 추가.
- 링크 글일 때:
  - **README 섹션, 평가 섹션 렌더링 안 함** (현재 `!isBoardPost` 블록에서 제외).
  - `getEmbedUrl(post.deployUrl)`이 있으면 **16:9 반응형 iframe**으로 임베드 표시(`aspect-video`, `rounded-2xl`, `allowfullscreen`).
  - 임베드 불가 시 미리보기 썸네일 + "바로가기" 외부 링크 버튼으로 대체.
  - 작성자/등록일 메타와 수정·삭제(`ManagePost`)는 그대로 유지.

### 3. 게시판 목록 카드 (`_main.board.$slug.index.tsx`)
- `LinkCard`에서 유튜브 등 임베드 가능한 주소면 썸네일 대신(또는 호버 시) 재생 느낌을 주도록, 카드 썸네일 위에 **재생 아이콘 오버레이**를 표시(임베드는 상세에서, 목록은 가벼운 썸네일 유지).
- 썸네일 영역은 기존 `aspect-video` 유지.

## 기술 메모

- iframe은 기존 디자인 토큰(`rounded-2xl`, `bg-card`, `shadow-sm`)에 맞춰 래핑.
- 캔바 임베드는 공개(공유) 링크에서만 동작하므로, 임베드 실패 대비 외부 링크 버튼 fallback을 항상 제공.
- DB/서버 로직 변경 없음 — 주소는 기존 `deploy_url`을 그대로 사용.

## 기대 결과

링크 게시판 글에는 README·평가가 사라지고, 유튜브·캔바 주소를 올리면 상세 화면에서 영상·디자인이 바로 임베드되어 재생/미리보기됩니다.