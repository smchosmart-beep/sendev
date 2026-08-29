# 사례집 PDF 여백 줄이기 (연속 흐름 조판)

## 현재 문제 (실제 PDF 37쪽 확인)
- 3쪽, 9쪽처럼 **제목만 있고 본문이 통째로 다음 장으로 밀린 빈 페이지**가 여러 장 생김.
- 섹션마다 강제로 새 페이지가 시작돼, 반쯤 찬 페이지 아래가 전부 빈 공간으로 남음.

## 원인
`src/styles.css`
- `.casebook-block { break-inside: avoid }` — 표/카드 묶음 **전체**를 한 페이지에 넣으려다 못 넣으면 묶음이 통째로 다음 장으로 이동 → 제목만 남은 빈 페이지 발생.
- `.casebook-page { break-after: page }` 가 인쇄에서도 유지 → 섹션마다 새 장 시작.
- `.casebook-page { display:flex } + .casebook-body { flex:1 }` — 바닥글을 페이지 끝으로 밀어 내려 중간 여백을 키움.

## 수정 내용 (인쇄용 `@media print` 블록만 수정)
1. **섹션을 이어서 흐르게**: `.casebook-page { break-after: auto }`. 단, 표지(`.casebook-cover`)만 `break-after: page`로 남겨 본문이 표지 다음 장부터 시작.
2. **묶음 단위 페이지 넘김 해제**: `.casebook-block { break-inside: auto }`. 개별 카드(`.casebook-card`)·항목(`.casebook-field`)의 `break-inside: avoid`는 유지해 한 항목이 두 장에 걸쳐 잘리는 일은 방지.
3. **제목 고아 방지**: `.casebook-h2`, `.casebook-h3`에 `break-after: avoid`를 주어 제목이 페이지 끝에 혼자 남지 않게 함.
4. **쪽 바닥글 숨김**: 인쇄 시 `.casebook-foot { display: none }`.
5. **세로 늘림 제거**: 인쇄 시 `.casebook-page { display: block }`, `.casebook-body { padding: 0 }`로 정리하고 섹션 사이 간격은 상단 여백(예: 6mm)으로 대체.

## 영향 범위
- 화면 미리보기(A4 카드 형태)는 그대로 유지 — 인쇄 규칙만 변경.
- README 인쇄 규칙(`.record-output`)과 `@page` 여백은 건드리지 않아 회귀 없음.
- 관리자 일괄 출력(`.casebook-offscreen`) 경로도 같은 규칙을 그대로 따르므로 동일하게 개선됨.
- 데이터·서버 로직 변경 없음.

## 참고
- PDF 상단/하단의 날짜·URL 줄은 브라우저 인쇄 대화상자의 "머리글 및 바닥글" 옵션이라 앱에서 제어 불가 — 가이드에 끄는 방법을 한 줄 안내로 추가.

## 검증
- 같은 팀 사례집을 인쇄 미리보기로 열어 제목만 있는 빈 페이지가 사라지고 총 페이지 수가 줄었는지 확인.
- 관리자 일괄 출력이 정상(백지 없음)인지 확인.
- README 출력 페이지 수 회귀 확인.
