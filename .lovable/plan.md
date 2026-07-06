현상
- 문제ZIP 목록에서 좋아요 버튼을 누르면 숫자가 올라가지만, 크롬 프로필을 바꾸면 0으로 돌아가거나 서버 데이터와 맞지 않음.
- 원인: LikeButton의 controlled 모드(목록)가 최초 mount 시 props(count/liked)로만 local state를 초기화한 뒤, 서버/부모에서 새 값이 내려와도 동기화하지 않음. 따라서 화면에 보이는 숫자가 컴포넌트 내부 local state에만 머무름.

변경 사항
1. src/components/LikeButton.tsx
   - controlled 모드에서 count/liked props가 변경될 때 local state를 다시 동기화하는 useEffect 추가.
     ````
     useEffect(() => {
       if (controlled) {
         setLocal((prev) => ({
           count: count !== undefined ? count : prev.count,
           liked: liked !== undefined ? liked : prev.liked,
         }));
       }
     }, [controlled, count, liked]);
     ````
   - controlled 모드에서 toggle 성공 후, 상위 문제ZIP 목록의 좋아요 캐시를 무효화하여 다른 페이지에 다녀와도 최신 수치 유지.
     ````
     if (controlled) {
       setLocal({ count: res.count, liked: res.liked });
       queryClient.invalidateQueries({ queryKey: ["likeState", targetType] });
     } else {
       queryClient.setQueryData(queryKey, {
         [targetId]: { count: res.count, liked: res.liked },
       });
     }
     ````

안전성 검토
- 기능 오작동: sync useEffect로 props가 변경될 때 화면이 서버 데이터와 일치하므로 정확도가 향상됨. 다만 "좋아요순" 정렬에서 좋아요 수가 바뀌면 항목 순서가 재정렬되어 페이지 간 이동이 발생할 수 있음. 이는 좋아요순 정렬의 자연스러운 동작이며 의도된 결과.
- 서버비: toggle 당 추가 getLikeState 배치 조회 1회 발생. 200개씩 청크 처리되며, 기존 toggleLike 호출과 동일한 수준의 비용. 폴링/실시간/크론 등 지속적 호출은 없음.
- 다른 기능 영향: uncontrolled 모드(글 상세, 댓글)는 기존 동작 유지. invalidate는 같은 prefix의 캐시를 재조회하도록 할 뿐이며, 기존 setQueryData 업데이트와 충돌하지 않음. 좋아요 외 다른 기능에 영향 없음.
- 보안: 서버 함수나 RLS 변경 없음. 비밀 노출 없음.

가이드 업데이트
- 이번 수정은 내부 버그 픽스로 사용자에게 보이는 동작 변화가 없으므로 /guide 업데이트는 불필요.

검증
- 좋아요 토글 후 페이지 이동 후 돌아왔을 때 숫자가 유지.
- 크롬 프로필 변경 후 서버에 저장된 좋아요 수가 표시됨.
- 좋아요순/최신순 토글 시 정상 동작.
- 네트워크 탭에서 toggle 후 getLikeState 재호출 확인.