# 활동기록(성장형) 데이터 전체 삭제

성장형 게시판(현재 1개)에 쌓인 기록과 나눔 자료를 모두 지웁니다. 게시판 자체와 설정은 그대로 두고, 안에 들어 있는 내용만 비웁니다. 도전형 활동기록과 다른 게시판 데이터는 건드리지 않습니다.

## 지워지는 것

- 성장형 게시판에 올라온 활동기록 글 전체 (목록에서 사라집니다)
- 각 기록의 7단계 작성 내용, 대표 이미지 주소, 04 검토·점검 기록
- 동료 점검으로 주고받은 피드백
- 나눔(갤러리) 자료 전부: 모둠 편성과 모둠원, 점수 평가, 인용 선택, 발표 지면, 지면 댓글, 하트
- 지워진 글에 달려 있던 댓글·좋아요·읽음 표시

## 남는 것

- 성장형 게시판 자체와 게시판 설정(나눔 열기/닫기 상태 포함)
- 닉네임 계정과 비밀번호
- 도전형 활동기록, 투표, 다른 모든 게시판의 글

## 기술 메모

성장형 카테고리(`categories.record_kind = 'growth'`)의 `posts` 중 `type = 'record'` 목록을 기준으로 삭제합니다.

삭제 순서(참조 관계 역순):

```text
record_growth_heart → record_growth_stage_comment → record_growth_stage
record_growth_quote_pick → record_growth_evaluation
record_growth_group_member → record_growth_group
record_growth_peer_feedback → record_growth
posts 관련 부속(댓글/좋아요/읽음) → posts
```

- 실행은 `supabase--run_sql` 한 번으로, 삭제 전 대상 글 수를 먼저 조회해 보고합니다.
- 스키마 변경·마이그레이션 없음. 테이블과 정책은 그대로 유지되므로 이후 새 기록을 바로 작성할 수 있습니다.
- 복구 불가능한 작업입니다. 승인하시면 바로 삭제합니다.
