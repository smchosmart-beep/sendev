## 목표

링크/산출물 게시판 카드에서, **마우스 오버 시 나타나는 설정(톱니) 버튼**으로 썸네일 이미지를 직접 업로드해 표시·교체할 수 있게 합니다.

- 유튜브 자동 썸네일은 **현재 그대로 유지** (`getThumbnailUrl`)
- 구글 드라이브 등 자동 썸네일은 추가하지 않음
- 그 외 링크(네이버웍스 드라이브 등)는 직접 업로드로 썸네일 지정

`embed.ts`는 변경하지 않습니다.

---

## 1. 썸네일 직접 업로드 (서버)

`src/lib/platform.functions.ts`에 새 서버 함수 `setPostThumbnail` 추가:

- 입력(zod 검증): `postId`, `password`, `name`, `contentType`, `dataBase64` (크기 제한 적용)
- 글의 `edit_password`와 일치하는지 검증 — 마스터 비밀번호도 허용 (기존 `updatePost`/`isMaster` 패턴 재사용)
- 이미지를 `post-images` 버킷에 업로드 → 10년 서명 URL 생성 (`uploadHeroImage`와 동일 방식)
- 해당 글의 `og_image_url` 컬럼에 저장
- 반환: `{ image: url }`

DB 스키마 변경 없음 (`og_image_url` 재사용), 새 버킷 없음 (`post-images` 재사용).

---

## 2. 카드 설정 버튼 + 업로드 다이얼로그 (UI)

`src/routes/_main.board.$slug.index.tsx`의 `LinkCard`/`ProjectCard` 수정:

- 이미지 영역 우상단에 **마우스 오버 시 나타나는 톱니(Settings) 버튼** 추가 (썸네일 유무와 무관하게 표시 → 교체 가능)
- 버튼 클릭 시 카드 이동 차단: `e.preventDefault(); e.stopPropagation();`
- 클릭하면 작은 `Dialog`를 열고:
  - 이미지 파일 선택 (브라우저에서 JPEG로 리사이즈/압축 — `PostEditor`의 기존 압축 로직 방식 재사용)
  - **권장 픽셀 크기 안내 문구 표시** (다이얼로그 내 작은 도움말 텍스트)
    - 링크 카드(`LinkCard`): 16:9 비율 → **권장 1280×720px** (`aspect-video`)
    - 산출물 카드(`ProjectCard`): 가로형 → **권장 1280×640px** (카드 이미지 높이 `h-32`에 맞춘 와이드 비율)
  - 수정·삭제 비밀번호 입력
  - "썸네일 적용" 버튼
- 성공 시 `["posts", categoryId]` 쿼리 무효화 → 즉시 반영, 토스트 알림

---

## 기술 메모

- `post-images` 버킷은 private이므로 서버에서 `createSignedUrl(10년)` 사용 — 기존 `uploadHeroImage`/`uploadEventFile`와 동일 패턴.
- 설정 버튼/다이얼로그는 기존 shadcn `Dialog`, `Button`, `Input`, `Label` + lucide `Settings` 아이콘, 디자인 토큰 사용.
- 권장 크기는 안내일 뿐 강제하지 않음. 업로드 이미지는 브라우저에서 JPEG로 리사이즈/압축(약 1MB 이하)되며, 카드에서는 `object-cover`로 채워 표시.
- 비밀번호 검증으로 작성자/관리자만 썸네일 변경 가능.
- 카드 표시 우선순위는 기존 그대로(`post.ogImageUrl || backfill?.image || thumb`), 업로드 시 `og_image_url`이 채워져 자동 반영됨.
