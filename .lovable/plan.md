# 스토리지 업로드 제한 적용

## 목표
익명 사용자가 `post-images` 버킷에 형식·용량 제한 없이 파일을 무제한 올릴 수 있는 보안 취약점을 막는다. 세 버킷 모두에 용량·형식 제한을 적용한다.

## 현재 상태
- `post-images`: 익명/로그인 누구나 직접 업로드 가능(RLS INSERT 정책 `anon` 포함), **용량·형식 제한 전혀 없음** → 취약점.
- `hero-images`, `event-files`: 익명 INSERT 정책 없음 → 관리자 비밀번호로 보호된 서버 함수(service_role)로만 업로드됨. 이미 안전하지만 용량·형식 제한은 미설정.

## 적용할 제한 (사용자 결정)
| 버킷 | 용량 한도 | 허용 형식 |
|------|-----------|-----------|
| post-images | 2MB | 이미지 전용 (jpeg, png, webp, gif) |
| hero-images | 2MB | 이미지 전용 (jpeg, png, webp, gif) |
| event-files | 3MB | 일반 파일 (이미지 + pdf, office 문서, zip 등) |

이미지는 클라이언트에서 이미 리사이즈·압축(약 1MB)되어 2MB 한도 안에 들어온다.

## 작업 내용

### 1. 버킷 설정 변경 (DB 마이그레이션)
`storage.buckets`의 `file_size_limit`, `allowed_mime_types` 컬럼을 위 표대로 UPDATE.
(공개/비공개 전환이 아니므로 일반 마이그레이션으로 처리. 만약 해당 경로가 막히면 동일 설정을 다른 허용된 방식으로 적용.)

### 2. post-images INSERT 정책 정비
기존 "Anyone can upload post images" 정책은 유지하되, 버킷 용량·형식 제한이 1차 방어선이 된다. (RLS 단계에서는 파일 크기를 직접 검사할 수 없어 버킷 설정이 핵심 방어책.)

### 3. 클라이언트 업로드 가드 보강
- 이미지 압축 목표치를 2MB 한도에 맞게 유지/점검 (`src/lib/image-upload.ts`, `src/components/ThumbnailUploadButton.tsx`, `src/components/PostEditor.tsx`).
- 일반 파일 첨부(`event-files`) 경로는 3MB 초과 시 업로드 전에 막고 안내 메시지 표시.
- 한도 초과 시 사용자에게 친절한 토스트 안내.

### 4. 사용자 가이드 갱신
`/guide` (`src/routes/_main.guide.tsx`)에 이미지/파일 업로드 용량·형식 제한(이미지 2MB·일반 파일 3MB) 안내 문구를 반영.

### 5. 보안 finding 처리
- 용량·형식 제한 적용 후 finding을 처리하고, 이 앱은 닉네임 기반(로그인 없음)이라 "인증 사용자만 업로드/소유자 검증"은 적용 불가하다는 맥락을 보안 메모에 기록.

## 기술 참고
- rate-limiting은 백엔드 표준 기능이 없어 이번 범위에서 제외(별도 과제).
- 형식 제한은 MIME 타입 화이트리스트로 처리하며, 서버 함수 업로드(`uploadEventFile`, `uploadHeroImage`)의 입력 검증 한도도 버킷 한도에 맞춰 낮춘다.
