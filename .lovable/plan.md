## 문제

카테고리 위/아래 이동 버튼이 느리게 반응합니다.

원인: `swapMutation`이 서버 호출 성공 후(`onSuccess`)에야 `invalidate()`로 목록을 다시 불러오기 때문에, **서버 왕복 + 재조회**가 끝날 때까지 화면 순서가 그대로 멈춰 있습니다.

## 해결: 낙관적 업데이트(Optimistic Update)

파일: `src/routes/admin.categories.tsx` (`swapMutation`, 약 237–242줄)

`swapMutation`에 TanStack Query 낙관적 업데이트 패턴 적용:

1. **`onMutate`**: 
   - `queryClient.cancelQueries({ queryKey: ["categories"] })`로 진행 중 재조회 취소.
   - 현재 캐시 스냅샷 저장(`getQueryData`).
   - `setQueryData(["categories"], ...)`로 두 항목(`id`, `otherId`)의 `sortOrder` 값을 즉시 교환 → 화면이 바로 바뀜.
   - 롤백용으로 이전 스냅샷을 context로 반환.
2. **`onError`**: 저장해둔 스냅샷으로 캐시 복원하고 에러 토스트 표시.
3. **`onSettled`**: `invalidate()`로 서버 기준 데이터와 최종 동기화.

이렇게 하면 버튼을 누르는 즉시 순서가 바뀌고, 서버 동기화는 백그라운드에서 처리됩니다.

## 검증

- 이동 버튼 클릭 시 즉시 순서가 바뀌는지 확인.
- 빠르게 연속으로 눌러도 깨지지 않는지 확인.
- (네트워크 오류 시) 원래 순서로 롤백되는지 확인.
