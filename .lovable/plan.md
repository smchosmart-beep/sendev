# 사례집 PDF 빈 페이지·페이지 수 불일치 수정

## 증상
사례집을 인쇄(PDF 저장)하면 화면 미리보기보다 페이지 수가 많고, 뒤쪽에 빈 공간/빈 페이지가 붙는다.

## 원인 (코드 확인 결과)
1. `src/styles.css` 인쇄 규칙이 다른 화면 요소를 `visibility: hidden`으로만 감춘다(641~654행). `visibility: hidden`은 요소가 **자리를 그대로 차지**하므로, 헤더·사이드바·8단계 편집기 등 사례집 밖의 모든 내용이 여전히 지면을 차지해 뒤쪽에 빈 페이지가 계속 생긴다. 사례집 본문은 `position: absolute`로 겹쳐 그려져 첫 페이지들만 보이고 나머지는 백지가 된다.
2. `.casebook-page`의 `min-height: calc(297mm - 32mm)`(412행)가 `@page { margin: 16mm }`(395~398행)의 인쇄 가능 높이와 **정확히 같다**. 반올림 오차만 생겨도 한 줄이 넘쳐 페이지마다 백지 1장이 추가된다.
3. 인쇄 시 `.casebook-page`의 `padding: 4mm 0 10mm`가 남아 있어 실제 사용 높이가 더 줄어드는데 `min-height`는 그대로라 넘침을 키운다.

## 수정 계획 (모두 `src/styles.css`의 인쇄 규칙 범위)
1. 숨김 방식을 자리까지 없애는 방식으로 교체
   - 사례집 인쇄 시 `body > *`를 `display: none`으로 두고, 사례집을 포함한 조상 체인과 `.casebook-root`만 표시하는 방식으로 변경. (`.casebook-root`에 `display: block`, 조상에는 `display: block; position: static;`)
   - `.casebook-root`의 `position: absolute` 겹치기 제거 → 정상 흐름으로 출력.
   - `.casebook-ui`(버튼 영역)와 미리보기용 래퍼 여백/배경은 계속 숨김·제거.
2. 페이지 높이 여유 확보
   - 인쇄 시 `.casebook-page { min-height: auto; padding: 0 0 6mm; box-shadow: none; margin: 0; }`로 두고 마지막 페이지는 `break-after: auto` 유지.
   - 또는 최소 높이를 유지해야 하면 `calc(297mm - 32mm - 2mm)`처럼 안전 여유를 둔다. 실제 출력 결과를 보고 둘 중 하나를 택한다.
3. 미리보기와 페이지 수 일치 확인
   - 화면 미리보기에서 나오는 페이지 수와 인쇄 미리보기 페이지 수가 같은지 확인하고, 남는 백지가 없을 때까지 여유값을 조정.

## 참고
- README 출력(`.record-output`)의 인쇄 규칙도 같은 `visibility: hidden` 방식을 쓰고 있어 동일 증상이 있을 수 있다. 사례집 수정이 잘 되면 같은 방식으로 맞춰 정리한다.
- 데이터·서버 로직 변경 없음(순수 인쇄 CSS). 화면 미리보기 레이아웃은 그대로 유지한다.
- 변경 후 사용자 가이드(`/guide`)의 사례집 인쇄 안내 문구에 필요한 보완이 있으면 함께 갱신한다.
