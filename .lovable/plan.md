## 모바일 이전글/다음글 버튼 오버플로우 방지

### 문제
`PostNavSection`의 이전글/다음글 버튼은 내부 제목 `<span>`에 `truncate`/`min-w-0`가 있지만, 버튼(`flex-1`) 자체에 `min-w-0`가 없어 컨텐츠 크기 미만으로 줄어들지 못한다. 그래서 긴 제목("우리반 발표망 발표자 랜덤뽑기 시스템")이 truncate되지 않고 카드 폭을 넘친다.

### 변경 파일
**`src/routes/_main.board.$slug.$postNo.tsx`** — `PostNavSection`만 수정

- 이전글 `<Button>`(line 497) className에 `min-w-0` 추가.
- 다음글 `<Button>`(line 514) className에 `min-w-0` 추가.

이렇게 하면 flex 아이템이 내용보다 작게 줄어들 수 있어 내부 `truncate`가 정상 동작한다.

### 기술 상세
- 레이아웃/색상 토큰 변경 없이 오버플로우 관련 유틸 클래스만 추가하는 프레젠테이션 수정.
- 가이드 변화 없음.