## 목표

1. 새 게시글(산출물·질문) 작성을 모달 대신 별도 페이지로 띄우기
2. 첨부 이미지를 업로드 전에 리사이징·압축해 항상 1MB 이하로 저장
3. 게시글 URL을 `게시판 별칭 + 게시판별 짧은 번호` 형태로 단축

---

## 1. 작성 모달 → 작성 페이지

현재 `_main.board.$categoryId.index.tsx` 안의 `RegisterDialog`(산출물), `QuestionDialog`(질문)를 제거하고 폼 내용을 새 라우트 페이지로 옮깁니다.

- 새 라우트 파일 2개
  - `_main.board.$categoryId.new-project.tsx` → 산출물 등록 페이지
  - `_main.board.$categoryId.new-question.tsx` → 질문 등록 페이지
- 목록 화면의 "산출물 등록"·"질문 등록" 버튼을 `Link`로 변경해 해당 페이지로 이동
- 등록 성공 시 토스트 후 해당 게시판 목록으로 자동 이동(`navigate`)
- 폼 검증·서버 호출 로직(`createPost`)은 그대로 재사용, 레이아웃만 카드형 페이지로 정리
- "게시판으로" 형태의 뒤로가기 링크 추가

## 2. 첨부 이미지 1MB 이하 리사이징

`src/components/PostEditor.tsx`의 `handleFileChange`에서 업로드 직전에 브라우저 Canvas로 이미지를 다시 인코딩합니다(추가 패키지 불필요).

- 긴 변 기준 최대 1600px로 축소(원본이 더 작으면 그대로)
- JPEG로 인코딩하며 품질을 0.92부터 단계적으로 낮춰(0.5까지) 결과 용량이 **1MB 이하**가 될 때까지 재시도
- 그래도 1MB를 초과하면 해상도를 한 단계 더 줄여 재시도
- 투명도가 필요한 PNG는 흰 배경 합성 후 JPEG 변환(용량 절감), 변환 결과를 `post-images` 버킷에 업로드
- 업로드 파일명 확장자는 `.jpg`로 통일, `contentType: "image/jpeg"`
- 변환 실패 시 안내 토스트

## 3. 게시글 URL 단축 (게시판별 짧은 번호)

목표 형태: `/board/lv1/3` (게시판 별칭 `lv1` + 그 게시판의 3번째 글)

### DB 변경 (마이그레이션)
- `categories`에 `slug text`(게시판 별칭) 추가 — 고유, 소문자/숫자/하이픈
  - 기존 게시판들에는 자동 생성된 slug 채워넣기(예: `cat-1`, 이후 관리자 페이지에서 수정 가능)
- `posts`에 `post_no integer` 추가 — 같은 게시판 안에서 1부터 증가
  - 기존 글들은 생성일 순서로 게시판별 번호 부여
  - 신규 글 작성 시 해당 게시판의 `max(post_no)+1`을 서버에서 계산해 저장(동시성은 트랜잭션/재시도로 처리)

### 서버 함수
- `resolvePost(slug, postNo)` 추가: slug→category, (category, post_no)→post 조회
- `createPost`가 새 글의 `post_no`를 부여하고, 응답에 `slug`/`post_no` 포함
- 카테고리 조회에 slug 포함, 관리자 카테고리 편집에서 slug 수정 가능

### 라우팅/링크
- 라우트 param 의미 변경: `$categoryId`→게시판 slug, `$postId`→게시글 번호로 사용
- 게시판 목록·상세·작성 페이지의 모든 `Link`/`navigate`가 slug·번호를 전달하도록 수정
- 내부 로직(비밀번호 잠금 sessionStorage 키, 쿼리키 등)은 실제 UUID 기준 유지 — slug/번호는 화면 진입 시 UUID로 해석
- 기존 UUID 형식 주소(`/board/{uuid}/{uuid}`)로 들어오면 새 짧은 주소로 리다이렉트해 기존 공유 링크·QR 호환 유지

### 관리자
- 게시판 관리 화면에 slug 입력란 추가(중복·형식 검증)

---

## 기술 메모
- 이미지 변환은 클라이언트 Canvas + `toBlob`만 사용(서버 의존성 없음, Worker 런타임 제약 회피)
- `post_no` 부여는 `createPost` 서버 함수 내 `select max` 후 insert, 충돌 시 1회 재시도
- 라우트 파일명 dot 규칙 유지, `createFileRoute` 경로 문자열과 정확히 일치시킴
- 현재 미리보기의 동적 import 오류는 빌드 재생성으로 함께 해소되는지 확인
