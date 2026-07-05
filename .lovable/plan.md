# 문제ZIP 제보 저장 오류 수정

## 문제
문제ZIP에서 "제보하기"를 누르면 다음 오류가 발생하며 저장이 되지 않습니다:

```
new row for relation "posts" violates check constraint "posts_type_check"
```

## 원인
- 앱 코드(폼 + 서버 함수)는 문제ZIP 글을 `type = "problem"` 으로 저장합니다.
- 그런데 데이터베이스의 `posts_type_check` 제약조건은 `'post', 'project', 'link'` 세 가지만 허용하고, `'problem'` 은 빠져 있습니다.
- 그래서 문제ZIP 제보가 DB 저장 단계에서 거부됩니다.

## 해결 방법
데이터베이스 마이그레이션으로 `posts_type_check` 제약조건을 갱신해 `'problem'` 유형을 허용합니다.

```sql
ALTER TABLE public.posts DROP CONSTRAINT posts_type_check;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_type_check
  CHECK (type = ANY (ARRAY['post','project','link','problem']));
```

코드 변경은 필요 없습니다(이미 `problem` 유형을 올바르게 사용 중).

## 참고 사항
- 화면에 보이는 글자수 표시가 `46/50` 으로 나오는 것은 게시된(sendev.kr) 사이트가 아직 이전 버전이라 그렇습니다. 100자 변경은 다음 게시(Publish) 시 반영됩니다. 원하시면 이번 수정과 함께 게시하시면 됩니다.

## 검증
- 마이그레이션 후 문제ZIP에서 실제 제보를 작성해 정상 저장·이동되는지 확인합니다.