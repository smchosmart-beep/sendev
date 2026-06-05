## 문제

전체화면 버튼을 눌러도 이미지가 화면을 꽉 채우지 않습니다. `LightboxImage`의 이미지가 `max-h-[85vh]`로 고정돼 있고, 전체화면 컨테이너에 꽉 차도록 하는 스타일이 없어 모달 크기 그대로 보입니다.

## 해결

`LightboxImage`에서 `isFullscreen` 상태에 따라 스타일을 분기합니다.

- **전체화면일 때**: 컨테이너를 화면 전체(`h-screen w-screen`)로 채우고 flex 중앙 정렬, 검정 배경. 이미지는 `max-h-full max-w-full h-full w-full object-contain`으로 화면을 최대한 채웁니다.
- **일반 모달일 때**: 기존처럼 `max-h-[85vh]`, `w-fit` 유지.
- 전체화면/일반에 따라 클래스만 조건부로 바꾸며 버튼 위치(좌측 상단)는 그대로 둡니다.

`src/routes/_main.board.$slug.$postNo.tsx` 한 곳만 수정합니다.
