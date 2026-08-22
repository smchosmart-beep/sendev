# 사례집 PDF 빈 페이지·페이지 수 불일치 수정 (보완판)

## 증상
사례집을 인쇄(PDF 저장)하면 화면 미리보기보다 페이지 수가 많고, 뒤쪽에 빈 공간/빈 페이지가 붙는다.

## 원인 (코드 확인 결과)
1. `src/styles.css` 641~654행의 인쇄 규칙이 사례집 밖 요소를 `visibility: hidden`으로만 감춘다. 이 속성은 요소가 **자리를 그대로 차지**하므로 헤더·사이드바·8단계 편집기 등이 계속 지면을 먹어 뒤쪽에 빈 페이지가 생긴다.
2. `.casebook-page`의 `min-height: calc(297mm - 32mm)`가 `@page { margin: 16mm }`의 인쇄 가능 높이와 **정확히 같다**. 반올림 오차만으로 페이지마다 백지 1장이 추가된다.
3. 인쇄 시에도 `.casebook-page`의 세로 패딩이 남아 실제 사용 높이가 줄어드는데 `min-height`는 그대로라 넘침이 커진다.

## 수정 계획 (모두 `src/styles.css` 인쇄 규칙)

### 1. 숨김 방식 교체 + 조상 체인 정규화
- `visibility: hidden` → `display: none` 방식으로 교체하되, `.casebook-root`는 레이아웃 깊숙이 중첩되어 있으므로 **단순히 형제만 숨기면 안 된다.** `.casebook-root`를 포함하지 않는 요소만 숨기고, 조상 체인은 표시 상태로 남긴다.
- 조상 체인은 `position: static; overflow: visible; height: auto; max-height: none; transform: none; margin: 0; padding: 0; background: transparent;`로 정규화한다. (스크롤 컨테이너/`overflow: hidden` 조상이 남으면 뒷페이지가 잘린다.)
- `.casebook-root`의 `position: absolute` 겹치기를 제거해 정상 문서 흐름으로 출력한다.
- `.casebook-ui`(버튼 영역)는 계속 `display: none`.

### 2. 관리자 일괄 출력(`casebook-offscreen`) 동시 정리
- 관리자 페이지의 일괄 PDF는 화면 밖(`left: -10000px`)에 그린 뒤 인쇄 시 위치를 되돌리는 구조다. 새 `display: none` 규칙에 `casebook-offscreen` 예외를 함께 갱신하지 않으면 **일괄 PDF가 백지로 출력된다.**
- 인쇄 시 `.casebook-offscreen { position: static; left: auto; width: 100%; }`로 두고, 단건/일괄 두 경로 모두 실제로 확인한다.

### 3. `@page` 설정 분리 + 높이 여유 확보
- 현재 `@page { size: A4; margin: 16mm }`는 README 출력(`.record-output`)과 **공유**된다. 이 값을 건드리면 README 출력이 함께 틀어지므로 `@page` 여백은 그대로 두고, 페이지 높이는 `.casebook-page` 쪽에서만 조정한다.
- 인쇄 시 `.casebook-page { min-height: auto; margin: 0; box-shadow: none; padding: 0 0 6mm; }`를 우선 적용하고, 페이지 구분이 흐려지면 `min-height: calc(297mm - 32mm - 2mm)`처럼 안전 여유값을 준다.
- README 인쇄 규칙(375~394행)은 이번 작업에서 **변경하지 않는다.** 사례집이 안정된 뒤 별도로 같은 방식으로 정리할지 판단한다.

### 4. 검증
- 단건 사례집 인쇄 미리보기 페이지 수 = 화면 미리보기 페이지 수인지 확인.
- 관리자 일괄 출력이 백지 없이 나오는지 확인.
- README 출력 페이지 수가 이전과 동일한지 회귀 확인.

## 참고
- 데이터·서버 로직 변경 없음(순수 인쇄 CSS). 화면 미리보기 레이아웃은 그대로 유지.
- 변경 후 사용자 가이드(`/guide`)의 사례집 인쇄 안내 문구에 보완이 필요하면 함께 갱신한다.
