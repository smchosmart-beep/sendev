# 투표 규칙 강화: 본인 글 제외 + 정원 채워야 저장

## 바뀌는 점

1. **자기 글에는 투표 불가**
   - 등록된 닉네임과 후보 글의 작성자가 같으면 그 카드의 투표 버튼은 비활성(“내 글”)으로 표시됩니다.
   - 화면뿐 아니라 서버에서도 막아, 우회 요청이 들어와도 저장되지 않습니다.

2. **클릭 즉시 투표 → 선택 후 저장 방식으로 변경**
   - 카드 버튼은 이제 “선택/선택 해제”만 합니다.
   - 상단에 `선택 2 / 3` 카운터와 **투표 저장** 버튼이 생기고, 정해진 표 수를 정확히 채워야만 저장 버튼이 활성화됩니다.
   - 저장 후에도 종료 전이라면 선택을 바꿔 다시 저장할 수 있습니다(항상 정원을 채운 상태로만 저장).
   - 본인 글을 뺀 선택 가능 후보가 정원보다 적으면, 그 개수만큼만 채우면 저장할 수 있습니다.

3. **가이드 반영**
   - `/guide` 투표 게시판 설명에 “자기 글 투표 불가”, “정원을 모두 채워야 저장됨”, “종료 전에는 재저장으로 변경 가능”을 추가합니다.

## 기술 사항

- `src/lib/platform.functions.ts`
  - 새 서버 함수 `submitVotes`: `{ categoryId, postIds[], nickname, nicknamePassword, boardPassword, adminPassword }`.
    - 게시판 접근 확인 → `vote_status === "open"` 확인 → 닉네임 소유권 확인(`ensureNicknameOwnership`).
    - 해당 카테고리의 `type = 'vote'` 글을 조회해 `postIds` 유효성 검증, `normalizeName(author) === voterKey` 인 글이 포함되면 거부.
    - 필요 표 수 `required = min(vote_max_choices, 본인 글 제외 후보 수)`; `postIds.length !== required` 또는 중복 id면 거부.
    - 기존 표 전체 삭제 후 새 목록 일괄 insert(원자적 재저장).
  - 기존 `castVote`는 남겨두되 UI에서는 사용하지 않습니다(단건 토글 경로에서도 본인 글 차단 조건 추가).
- `src/lib/platform.queries.ts`: 변경 없음(저장 후 `my-votes` 무효화만 재사용).
- `src/components/VoteSection.tsx`
  - `selected: Set<string>` 로컬 상태를 `myVotes`로 초기화/동기화.
  - 카드 버튼: 선택 토글, 본인 글이면 `disabled` + “내 글” 표시, 정원 초과 선택 시 토스트 안내.
  - 헤더 영역에 `선택 n / N` 카운터와 저장 버튼(`useServerFn(submitVotes)` + `useMutation`), 저장 성공 시 `my-votes` 무효화.
  - 본인 글 판별은 저장된 닉네임과 `post.author`를 정규화 비교(자기 글 여부만 노출되므로 익명성 유지).
- `src/routes/_main.guide.tsx`: 투표 게시판 문단 문구 보강.

## 영향 범위

표시/저장 흐름만 바뀌며 결과 집계, 관리자 제어(시작·종료·초기화), 익명 처리 로직은 그대로입니다. 폴링·쿼리 횟수는 오히려 클릭당 요청이 사라져 서버 호출이 줄어듭니다.
