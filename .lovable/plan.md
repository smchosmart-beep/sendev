## 목표
모바일 게시글 상세 화면에서 좌우 터치 스와이프로 이전글/다음글을 넘긴다.

## 동작
- **왼쪽으로 스와이프(손가락 ←)** → **다음글**(`newer`, 더 최신)
- **오른쪽으로 스와이프(손가락 →)** → **이전글**(`older`, 더 오래된 글)
- 터치 전용(데스크톱/마우스 영향 없음). 양 끝(대상 글 없음)에서는 동작 없음.
- 가로 이동이 세로 이동보다 우세하고 임계값(약 60px) 이상일 때만 이동 → 세로 스크롤과 충돌 방지.
- 이동 대상은 기존 `PostNavSection`(이전글/다음글 버튼)과 동일하게 계산한다.

## 변경 사항

### 1) `src/hooks/useSwipeNavigation.ts` (신규)
- `onSwipeLeft`, `onSwipeRight` 콜백을 받아 `onTouchStart/onTouchMove/onTouchEnd` 핸들러를 반환하는 훅.
- 가로 우세 판정 + 임계값 로직 포함. 콜백이 없으면 해당 방향 무시.

### 2) `src/routes/_main.board.$slug.$postNo.tsx`
- `PostNavSection`의 newer/older 계산을 작은 헬퍼 `usePostNav(post, slug)`로 추출해 `{ newer, older }`를 반환(중복 제거). `PostNavSection`도 이 헬퍼를 사용.
- `ProjectDetailPage`에서 `usePostNav`로 대상 글을 구하고 `useSwipeNavigation`을 최상위 컨테이너(`<div className="space-y-6">`)에 연결.
- 왼쪽 스와이프 → `useNavigate`로 `newer.postNo`, 오른쪽 스와이프 → `older.postNo`로 이동(`/board/$slug/$postNo`).
- 입력/textarea/이미지 줌(`react-zoom-pan-pinch`) 영역에서 시작된 터치는 무시해 오작동 방지.

### 3) `src/routes/_main.guide.tsx`
- 게시글 보기 안내에 "모바일에서는 좌우 스와이프로 다음글(←)/이전글(→) 이동" 한 줄 추가.

## 검증
- 모바일 뷰포트에서 게시글 상세 좌/우 스와이프 이동 확인, 세로 스크롤 정상, 양 끝에서 멈춤 확인.
- 데스크톱 동작 변화 없음 확인.
