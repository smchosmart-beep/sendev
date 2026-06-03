# 산출물 배포 URL + 카드 OG 이미지

## 목표
- 산출물 등록 폼에 GitHub 링크 아래 **배포 URL** 입력칸 추가 (선택 입력).
- 배포 URL이 있으면 산출물 카드의 녹색(상단) 영역에 **배포 사이트의 OG 이미지**를 표시. 없거나 실패하면 기존 폴더 아이콘 유지.

## 변경 사항

### 1. DB (migration)
- `posts` 테이블에 `deploy_url text not null default ''` 컬럼 추가.

### 2. 서버 함수 `src/lib/platform.functions.ts`
- `PostDTO`에 `deployUrl: string` 추가, `mapPost`에 `deploy_url` 매핑.
- `createPost` 입력값에 `deployUrl`(선택, 빈값 허용, URL 형식 검증) 추가 → `deploy_url` 저장.
- `updatePost` 입력값/업데이트에 `deployUrl` 추가(상세 편집에서도 수정 가능).
- 신규 `fetchOgImage` 서버 함수: 주어진 URL의 HTML을 fetch하여 `og:image`(없으면 `twitter:image`) 메타 태그를 파싱해 절대 URL로 반환. 실패 시 `{ image: null }`. 타임아웃·예외 안전 처리.

### 3. 쿼리 `src/lib/platform.queries.ts`
- `ogImageQueryOptions(url)` 추가: `fetchOgImage` 호출, `enabled: !!url`, staleTime 길게(예: 30분).

### 4. 등록 폼 `src/routes/_main.board.$categoryId.index.tsx`
- GitHub 링크 입력칸 아래에 "배포 URL (선택)" 입력칸 추가. placeholder 예: `https://my-app.lovable.app`.
- 제출 시 입력했다면 간단한 URL 형식 검증, `deployUrl`을 `createPost`로 전달.
- 카드 컴포넌트: `p.deployUrl`이 있으면 `ogImageQueryOptions`로 OG 이미지를 불러와 녹색 영역에 `<img>`(cover)로 표시. 로딩 중/이미지 없음/오류 시 기존 `FolderGit2` 아이콘 표시.

### 5. 상세 편집 `src/routes/_main.board.$categoryId.$postId.tsx`
- 편집 다이얼로그에 배포 URL 입력칸 추가하여 기존 산출물도 배포 URL을 넣고 수정할 수 있게 함.

## 보안/안정성
- `fetchOgImage`는 서버에서만 외부 fetch 수행, 응답 크기·타임아웃 제한, 파싱 실패 시 안전한 null 반환.

## 검증
- 배포 URL 없이 등록 → 기존처럼 폴더 아이콘 카드.
- 배포 URL 입력해 등록 → 카드 녹색 영역에 해당 사이트 OG 이미지 표시.
- OG 이미지가 없는 사이트 → 폴더 아이콘으로 폴백.
