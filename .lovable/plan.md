# 결선 투표 시 "선택 가능 표 수"가 새로고침해야 반영되는 문제 수정

## 문제
결선 투표를 시작해 1인당 선택 수가 3 → 2로 줄어도, 화면은 계속 3개까지 선택하게 두고 저장 시 서버가 거부합니다. 새로고침해야 2개로 바뀝니다.

원인(확인됨):
- 선택 개수 기준값 `required`는 `vote-requirement` 쿼리에서 옵니다(`src/components/VoteSection.tsx:88-92`).
- 이 쿼리는 `staleTime: 30초`이고 자동 갱신 주기가 없습니다(`src/lib/platform.queries.ts:339-347`).
- 관리자가 결선을 시작한 뒤 실행되는 무효화 목록에 `vote-requirement`가 빠져 있습니다(`src/components/VoteSection.tsx:327-332`).
- 서버는 실제 정원으로 검증하므로(`src/lib/platform.functions.ts:4390-4392`) 화면과 서버가 어긋나 저장이 실패합니다.

## 수정 내용
1. 관리자 컨트롤 완료(`onDone`) 시 `vote-requirement` 쿼리도 함께 무효화합니다. (투표 시작/종료/결선 시작/초기화 모두 해당)
2. 다른 참가자 화면에서도 자동 반영되도록, 투표 상태(라운드·1인당 선택 수)가 바뀌면 `vote-requirement`를 다시 불러옵니다.
   - `vote-state`는 이미 60초마다 갱신되므로, 그 값(round, maxChoices)이 바뀌는 순간 requirement를 무효화합니다.
   - `vote-requirement`에도 60초 자동 갱신을 부여해 보조 안전장치를 둡니다.
3. 저장 실패 시 사용자가 원인을 알 수 있도록, 서버가 개수 불일치 오류를 반환하면 상태·정원 정보를 즉시 다시 불러옵니다(현재 오류 토스트는 유지).

## 기술 세부
- `src/lib/platform.queries.ts`: `voteRequirementQueryOptions`에 `refetchInterval: 60 * 1000` 추가.
- `src/components/VoteSection.tsx`
  - `AdminVoteControls`의 `onDone`에 `queryClient.invalidateQueries({ queryKey: ["vote-requirement", category.id] })` 추가.
  - `round`/`maxChoices` 값 변화를 감지하는 `useEffect`에서 동일 무효화 실행.
  - `saveMutation.onError`에서 `vote-state`, `vote-requirement` 무효화 추가.
- 서버/DB 변경 없음. 추가 요청은 상태 변화 시점의 1회 재조회와 60초 주기 갱신뿐이라 서버 부담 변화는 미미합니다.
