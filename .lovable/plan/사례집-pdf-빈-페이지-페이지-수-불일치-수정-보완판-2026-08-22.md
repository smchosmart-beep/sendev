# 사례집 PDF 빈 페이지·페이지 수 불일치 수정 (보완판)

## 증상
사례집을 인쇄(PDF 저장)하면 화면 미리보기보다 페이지 수가 많고, 뒤쪽에 빈 공간/빈 페이지가 붙는다.

## 원인 (코드 확인 결과)
1. `src/styles.css` 641~654행의 인쇄 규칙이 사례집 밖 요소를 `visibility: hidden`으로만 감춘다. 이 속성은 요소가 **자리를 그대로 차지**하므로 헤더·사이드바·8단계 편집기 등이 계속 지면을 먹어 뒤쪽에 빈 페이지가 생긴다.
2. `.casebook-page`의 `min-height: calc(297mm - 32mm)`가 `@page { margin: 16mm }`의 인쇄 가능 높이와 **정확히 같다**. 반올림 오차만으로 페이지마다 백지 1장이 추가된다.
3. 인쇄 시에도 `.casebook-page`의 세로 패딩이 남아 실제 사용 높이가 줄어드는데 `min-height`는 그대로라 넘침이 커진다.

## 수정 계획 (모두 `src/styles.css` 인쇄 규칙)

### 1. 숨김 방식 교체 + 조상 체인 정규화 (정확한 셀렉터)
- `visibility: hidden` → `display: none`으로 교체하되, `.casebook-root`는 레이아웃 깊숙이 중첩되어 있어 **형제만 숨기는 방식은 안 된다.** 조상 체인만 남기는 셀렉터를 쓴다:
  `body:has(.casebook-root) *:not(:has(.casebook-root)):not(.casebook-root):not(.casebook-root *) { display: none !important; }`
  - 주의: 이 복합 `:not(:has())` 셀렉터가 Tailwind v4(Lightning CSS) 변환에서 누락될 수 있으므로, 빌드 후 실제 CSS에 규칙이 남았는지 확인한다. 누락되면 인쇄 직전 `document.body.classList.add("printing-casebook")`를 붙이는 단순 클래스 방식으로 대체한다.
- 조상 체인은 `position: static; overflow: visible; height: auto; max-height: none; transform: none; margin: 0; padding: 0; background: transparent;`로 정규화. (`_main.tsx`의 sticky 헤더·overflow-hidden 탭바·모바일 고정 마퀴가 남아 첫 페이지를 덮는 것을 방지)
- `.casebook-root` **자신과 내부 래퍼**도 함께 정규화한다. 화면용 `p-5 bg-card shadow-sm rounded-2xl`, 내부 `overflow-x-auto bg-muted/30 p-3`가 남으면 지면 폭이 줄고 가로 스크롤 컨테이너가 뒷내용을 잘라 페이지 수가 다시 어긋난다.
  → 인쇄 시 `padding: 0; background: transparent; overflow: visible; box-shadow: none; border-radius: 0;`
- `.casebook-root`의 `position: absolute` 겹치기 제거 → 정상 문서 흐름 출력.
- `.casebook-ui`(버튼 영역)는 계속 `display: none`.

### 2. 관리자 일괄 출력(`casebook-offscreen`) 동시 정리
- 관리자 일괄 PDF는 `casebook-root`와 `casebook-offscreen`이 **같은 엘리먼트**다(`admin.records.tsx:685`). `position: absolute; left: -10000px`를 인쇄 시 되돌리지 않으면 **일괄 PDF가 백지**로 나온다.
- 인쇄 시 `.casebook-offscreen { position: static; left: auto; width: 100%; }`를 유지하고, 단건(`section.casebook-root`)과 셀렉터 우선순위가 충돌하지 않게 작성한다. 두 경로 모두 실제 인쇄 미리보기로 확인.


### 3. `@page` 설정 분리 + 높이 여유 확보
- 현재 `@page { size: A4; margin: 16mm }`는 README 출력(`.record-output`)과 **공유**된다. 이 값을 건드리면 README 출력이 함께 틀어지므로 `@page` 여백은 그대로 두고, 페이지 높이는 `.casebook-page` 쪽에서만 조정한다.
- 인쇄 시 `.casebook-page { min-height: auto; margin: 0; box-shadow: none; padding: 0 0 6mm; }`를 우선 적용하고, 페이지 구분이 흐려지면 `min-height: calc(297mm - 32mm - 2mm)`처럼 안전 여유값을 준다.
- README 인쇄 규칙(375~394행)은 이번 작업에서 **변경하지 않는다.** README(06단계)와 사례집(08단계)은 스텝이 상호배타라 동시 적용 충돌은 없음을 확인했다. 사례집이 안정된 뒤 별도로 같은 방식 정리 여부를 판단한다.

### 4. 검증
- 단건 사례집 인쇄 미리보기 페이지 수 = 화면 미리보기 페이지 수인지 확인.
- 관리자 일괄 출력이 백지 없이 나오는지 확인.
- README 출력 페이지 수가 이전과 동일한지 회귀 확인.

## 참고
- 데이터·서버 로직 변경 없음(순수 인쇄 CSS). 화면 미리보기 레이아웃은 그대로 유지.
- 변경 후 사용자 가이드(`/guide`)의 사례집 인쇄 안내 문구에 보완이 필요하면 함께 갱신한다.
