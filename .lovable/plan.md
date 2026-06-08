## 문제
파일 첨부 시 `new row violates row-level security policy` (400) 오류가 발생합니다.

실제 DB를 확인한 결과, `post-files` 버킷에는 **RLS 정책이 하나도 없습니다.** (`post-images` 버킷에만 INSERT/SELECT 정책이 존재) 이전에 "적용 완료"라고 안내된 마이그레이션이 실제로는 반영되지 않은 상태입니다. 정책이 없으면 모든 업로드(INSERT)가 차단됩니다.

## 해결 (DB 마이그레이션)
`post-images`와 동일한 패턴으로 `post-files` 버킷에 정책을 추가합니다.

1. **INSERT 정책** — `anon`, `authenticated` 가 `post-files` 버킷에 업로드 허용 (`WITH CHECK (bucket_id = 'post-files')`)
2. **SELECT 정책** — `anon`, `authenticated` 가 `post-files` 파일 읽기(서명 URL 생성) 허용 (`USING (bucket_id = 'post-files')`)

```text
storage.objects
 ├─ INSERT  post-files  → anon, authenticated  (WITH CHECK bucket_id='post-files')
 └─ SELECT  post-files  → anon, authenticated  (USING bucket_id='post-files')
```

이 정책만 추가하면 hwp·xlsx·pdf 등 일반 파일 첨부가 정상 동작합니다.

## 검증
- 마이그레이션 적용 후 `pg_policies`에서 post-files 정책 2개 생성 확인
- 글 에디터에서 hwp 파일 첨부 재시도

(버킷 용량 제한·MIME 화이트리스트는 현재 미설정이며 업로드 차단 원인이 아니므로 이번 변경에는 포함하지 않습니다. 필요하시면 별도로 추가하겠습니다.)
