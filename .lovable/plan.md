## 원인
`post-files` 버킷은 생성됐지만 **RLS 정책이 하나도 없어서** 업로드(INSERT)가 전부 차단됩니다 (`new row violates row-level security policy`). 또한 용량 제한·MIME 화이트리스트도 설정돼 있지 않습니다. (이전 마이그레이션이 적용되지 않은 상태)

## 변경 (DB 마이그레이션)
`post-images` 버킷과 동일한 패턴으로 `post-files`에 정책을 추가합니다.

1. **INSERT 정책** — `anon`, `authenticated` 가 `post-files` 버킷에 업로드 허용
2. **SELECT 정책** — `anon`, `authenticated` 가 `post-files` 파일 읽기(서명 URL 생성) 허용
3. **버킷 설정** — `file_size_limit = 3145728`(3MB), `allowed_mime_types`에 xlsx·hwp·pdf·오피스 문서·zip·텍스트·이미지 등 일반 첨부 형식 화이트리스트 지정

이렇게 하면 xlsx를 포함한 일반 파일 첨부가 정상 동작합니다.