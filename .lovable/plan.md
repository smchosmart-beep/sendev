# 이동 후 종류가 안 바뀐 글 수정

## 문제
코드 수정 전에 질문→일반게시판으로 이동된 글들이 `type=question`으로 남아, 일반게시판만 켜진 QA 게시판에서 표시되지 않는다.

## 대상
플랫폼 QA 게시판(slug: qa, 일반게시판만 활성)에 있는 `type=question` 글 2개:
- "테스트 질문" (post_no 8)
- "산출물 제출은 수강생이 직접 하나요?" (post_no 7)

## 변경 사항
데이터 업데이트로 위 두 글의 `type`을 `general`로 변경한다. (스키마 변경 없음)

```sql
UPDATE posts SET type='general'
WHERE id IN (
  'e9bcbaf2-9fb9-4404-8831-8617f1bd6d34',
  '6cf7e7bc-a012-4ac8-9e1f-69e109b62de5'
);
```

변경 후 해당 글들이 QA 일반게시판 목록에 정상 표시된다.
