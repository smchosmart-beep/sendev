# 사례집 PDF 잔여 여백 제거 (2차)

받으신 PDF(31쪽)를 쪽별 이미지로 확인한 결과, 여백이 남는 지점이 특정됩니다.

## 확인된 문제 지점

- 7쪽: "03 문제 정의 과정" 제목 + 작은 카드 1개만 있고 아래 3분의 2가 백지
- 8쪽: 손그림 이미지 카드 1개만 있고 아래가 백지
- 11쪽: 인터뷰 카드 1개(위 3분의 1)만 있고 아래가 백지
- 14쪽: 인터뷰 개요 카드만 찍히고 아래가 백지
- 16쪽: 관찰 메모 한 줄만 있고 나머지가 백지
- 5·23·31쪽도 아래쪽 3분의 1 이상이 비어 있음

## 원인

1. 인쇄 규칙에서 `.casebook-card`와 `.casebook-field`에 `break-inside: avoid`가 남아 있습니다. 인터뷰 기록처럼 카드 하나가 반 페이지 넘게 길면, 카드가 통째로 다음 장으로 밀리면서 앞 장 아래가 전부 백지가 됩니다. 앞 단계에서 푼 것은 `.casebook-block`뿐이고, 실제 큰 덩어리는 카드 단위입니다.
2. `.casebook-figure`의 `max-height: 120mm`가 커서, 이미지 카드가 남은 지면에 못 들어가고 통째로 다음 장으로 넘어갑니다.
3. 라벨 열 폭 `34mm`, 카드 패딩 `3mm 4mm`, 묶음 간격 `6mm`가 인쇄 기준으로 넉넉해 한 쪽에 담기는 양이 줄어듭니다.

## 수정 계획 (모두 `src/styles.css`의 `@media print` 블록 안)

1. 카드·항목 쪼개기 허용
   - `.casebook-card { break-inside: auto; }`
   - `.casebook-field { break-inside: auto; }`
   - 대신 잘림이 흉하지 않도록 `orphans: 2; widows: 2;`를 본문에 적용하고, `.casebook-card-head`에 `break-after: avoid`(카드 머리만 남고 내용이 넘어가는 것 방지)를 둡니다.
   - 표는 `.casebook-table tr { break-inside: avoid; }`, `thead { display: table-header-group; }`로 행 단위 보호만 유지합니다.
2. 이미지 높이 축소
   - 인쇄 시 `.casebook-figure { max-height: 85mm; }` — 손그림·사진이 남은 지면에 들어갈 확률을 높입니다. 화면 미리보기는 기존 120mm 유지.
3. 조판 밀도 소폭 상향(인쇄 전용)
   - `.casebook-field { grid-template-columns: 27mm 1fr; gap: 3mm; padding: 1mm 0; }`
   - `.casebook-card { padding: 2.4mm 3mm; }`, `.casebook-cards { gap: 2mm; }`
   - `.casebook-block { margin-top: 4mm; }`, `.casebook-page { padding-bottom: 0; }`
4. 화면 미리보기, README 인쇄, 관리자 일괄 출력 규칙은 손대지 않습니다.

## 예상 효과

31쪽 → 대략 24~26쪽 수준으로 줄고, 제목/카드 하나만 찍히고 아래가 비는 쪽이 사라집니다.

## 검증

- 단건 사례집 인쇄 미리보기에서 각 쪽 하단 여백이 사라졌는지 확인
- 카드가 페이지 경계에서 쪼개져도 읽기에 문제 없는지 확인
- 표지는 여전히 단독 페이지인지, 관리자 일괄 출력이 백지 없이 나오는지 회귀 확인
- README 인쇄는 변경 없음(같은 블록을 건드리지 않음)

## 참고

데이터·서버 로직 변경 없음. 순수 인쇄 CSS 변경입니다. 가이드(`/guide`)는 인쇄 안내 문구가 이미 최신이라 이번엔 갱신 대상이 없습니다.
