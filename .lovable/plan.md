## 라이트박스 전체화면 보기 버튼 추가

라이트박스(`BodyImage`, `src/routes/_main.board.$slug.$postNo.tsx`)에 이미지 전체화면 보기 버튼을 추가한다. 가로가 더 긴(가로형) 이미지는 모바일에서 가로 모드로 회전시켜 화면에 꽉 차게 보여준다.

### 동작
- 우측 상단 버튼 그룹에 **전체화면 보기 버튼**(`Maximize` 아이콘) 추가 — 배치 순서: 전체화면 · 다운로드 · 닫기
- 클릭 시 이미지를 감싼 컨테이너에 브라우저 **Fullscreen API**(`requestFullscreen`) 적용
- 전체화면 상태에서는 버튼이 **나가기**(`Minimize` 아이콘)로 토글
- 전체화면 진입 시 이미지의 자연 크기 비율을 확인해 **가로 > 세로(가로형)** 이고 모바일이면 **Screen Orientation API**(`screen.orientation.lock("landscape")`)로 가로 모드 고정 시도
  - 미지원 브라우저(특히 iOS Safari)는 `try/catch`로 무시 → 그래도 전체화면 자체는 동작
- 전체화면에서는 이미지를 `object-contain` + 화면 전체(`100vw/100vh`)로 채워 가로 모드일 때 꽉 차게 표시
- 전체화면 종료(ESC/버튼) 시 orientation lock 해제(`screen.orientation.unlock()`)

### 구현 (`BodyImage`)
- `useRef`로 전체화면 대상 컨테이너(이미지 래퍼) 참조
- `isFullscreen` 상태 + `fullscreenchange` 이벤트 리스너로 동기화
- `enterFullscreen`/`exitFullscreen` 핸들러
  - 진입: `ref.requestFullscreen()` → 성공 후 이미지 `naturalWidth > naturalHeight` && 모바일이면 orientation lock 시도
  - 종료: `document.exitFullscreen()` + orientation unlock
- 전체화면일 때 이미지 클래스 전환(여백 제한 해제, 화면 꽉 차게)

### 기술 참고
- 외부 라이브러리 없음 (기존 `Maximize`/`Minimize` 아이콘 재사용)
- Fullscreen/Orientation API 미지원 환경에서도 오류 없이 동작(graceful degradation)
- 모바일 판별은 기존 `use-mobile` 훅 또는 `screen.orientation` 존재 여부 활용

### 가이드 업데이트 (`src/routes/_main.guide.tsx`)
- 라이트박스 안내에 "전체화면 보기 버튼(가로형 이미지는 모바일에서 가로 모드로 꽉 차게 표시)" 문구 추가