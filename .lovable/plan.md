## 목표
공지사항·일반게시판·질문게시판의 댓글(및 답글)에 이미지를 여러 장 첨부할 수 있게 합니다. 입력칸 아래 "이미지 첨부" 버튼으로 이미지를 고르면 자동 압축 후 스토리지에 저장되고, 댓글 본문 텍스트 아래에 이미지 미리보기로 표시됩니다.

## 동작 방식
- 댓글/답글 작성 폼에 "이미지 첨부" 버튼 추가. 여러 장 선택 가능.
- 선택한 이미지는 기존 게시글 본문과 동일한 방식으로 브라우저에서 약 1MB 이하 JPEG로 자동 압축 → `post-images` 스토리지에 업로드 → 장기 서명 URL 생성.
- 등록 시 이미지 URL 목록이 댓글과 함께 저장됨.
- 댓글 표시 시 텍스트 아래에 첨부 이미지들을 작은 썸네일 그리드로 보여주고, 클릭하면 원본을 새 탭에서 열람.
- 텍스트 없이 이미지만으로도 댓글 등록 허용(이미지 또는 텍스트 중 하나는 필수).

## 기술 상세

### 1. 데이터베이스 (마이그레이션)
- `comments` 테이블에 `image_urls jsonb NOT NULL DEFAULT '[]'::jsonb` 컬럼 추가.
- 기존 댓글은 빈 배열로 처리되어 영향 없음.

### 2. 서버 함수 (`src/lib/platform.functions.ts`)
- `CommentDTO`에 `imageUrls: string[]` 추가, `mapComment`에서 `c.image_urls ?? []` 매핑.
- `listComments`의 select에 `image_urls` 포함.
- `createComment` 입력 검증에 `imageUrls: z.array(z.string().url()).max(10).default([])` 추가, `content`는 `min(1)`에서 빈 문자열 허용으로 완화하되 "content 또는 imageUrls 중 하나는 필수" 검증 추가. insert에 `image_urls` 포함.

### 3. 댓글 UI (`src/routes/_main.board.$slug.$postNo.tsx`)
- PostEditor에서 쓰던 이미지 압축 로직을 재사용할 수 있게 작은 공용 유틸로 분리(또는 댓글 컴포넌트 내 동일 헬퍼 추가).
- 새 댓글 폼과 `CommentForm`(답글) 양쪽에:
  - 숨겨진 `<input type="file" accept="image/*" multiple>` + "이미지 첨부" 버튼.
  - 선택·업로드 중 로딩 표시, 첨부된 이미지 미리보기(삭제 버튼 포함).
  - 제출 시 `imageUrls` 배열을 함께 전달.
- `createMutation`/`onSubmit` 시그니처에 `imageUrls` 추가.
- `CommentItem`에서 `comment.imageUrls`가 있으면 텍스트 아래 썸네일 그리드 렌더링(클릭 시 새 탭).

## 검토 사항
- 비용: 기존 본문 이미지와 동일한 압축(1MB 이하)·동일 버킷 사용으로 추가 비용 부담 미미.
- 기존 기능 영향 없음: 새 컬럼은 기본값이 있어 기존 댓글/코드와 호환.
- 산출물 게시판 등 다른 탭의 댓글에도 동일하게 적용됨(댓글 컴포넌트가 공용).