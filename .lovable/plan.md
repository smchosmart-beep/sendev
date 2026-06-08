# 게시글 본문에 일반 파일 첨부 기능 추가

## 목표
글 작성 편집기(`PostEditor`)에 이미지와 별개로 **HWP·PDF·ZIP 등 일반 파일을 첨부하는 버튼**을 추가하고, 본문에 **파일 카드(아이콘 + 파일명 + 용량 + 다운로드)** 형태로 표시한다.

## 저장소 (DB 마이그레이션)
일반 파일 전용 비공개 버킷 `post-files`를 새로 만든다. (`post-images`는 보안상 이미지 전용으로 묶여 있어 사용 불가)
- `file_size_limit`: 3MB
- `allowed_mime_types`: PDF, HWP(haansofthwp/x-hwp), MS Office(doc/docx/xls/xlsx/ppt/pptx), txt, zip, 이미지 등 화이트리스트
- `storage.objects` RLS: `post-files` 버킷에 대해 익명·로그인 사용자 INSERT/SELECT 허용 (게시글 작성이 닉네임 기반·비로그인이므로 `post-images`와 동일한 정책 구조). 용량·형식 제한이 버킷 차원의 방어선 역할.

## 편집기 변경 (`src/components/PostEditor.tsx`)
- 툴바에 **파일 첨부 버튼**(Paperclip 아이콘) 추가. 기존 이미지 버튼과 별도의 숨겨진 `<input type="file">`(문서 형식 accept) 사용.
- 선택 시:
  - 3MB 초과면 토스트로 차단.
  - `post-files` 버킷에 원본 그대로 업로드(파일명은 ASCII-safe 키로 변환, 원래 이름은 보존), 다운로드용 장기 서명 URL 생성(`createSignedUrl({ download: 파일명 })`).
  - 본문에 **단독 줄 표준 링크** `[파일명](서명URL)` 형태로 삽입. (마크다운에 남으므로 카드 로직과 무관하게 항상 클릭 가능 — graceful degradation)
- 업로드 중 로딩 표시.

## 본문 렌더링 (`src/routes/_main.board.$slug.$postNo.tsx`)
- 단독 링크 렌더링(`p` 컴포넌트)에서 href가 `post-files` 버킷 URL이면 기존 `LinkPreviewCard` 대신 새 **`FileCard`** 컴포넌트로 표시.
- `FileCard`: 파일 아이콘 + 파일명(링크 텍스트에서 추출) + 확장자 배지 + "다운로드" 버튼. 클릭 시 서명 URL로 다운로드.
- 링크 텍스트(파일명)도 함께 추출하도록 헬퍼 보강(`soleLinkHref` 옆에 파일명까지 반환하는 로직 추가).

## 가이드 갱신 (`src/routes/_main.guide.tsx`)
- 글 작성 안내에 "이미지 외에 HWP·PDF·ZIP 등 일반 파일을 첨부 버튼으로 올릴 수 있으며, 파일당 3MB까지 가능하고 본문에 다운로드 카드로 표시된다"는 설명 추가.

## 기술 참고
- 새 버킷 생성은 `supabase--storage_create_bucket`(private)로, 용량·형식 제한과 RLS는 마이그레이션으로 설정.
- 파일 카드 판별은 URL 경로에 `/post-files/`가 포함되는지로 구분.
- rate-limiting은 백엔드 표준 기능 부재로 이번 범위 제외(버킷 용량·형식 제한으로 1차 방어).
