# 사례집 표지 팀원 표시 형식 개선

사례집 PDF 표지에서 팀원 정보를 더 읽기 쉽게 표시하고, 여백에 맞춰 전체 폰트 크기를 키웁니다.

## 변경 내용

1. **표지 전체 폰트 크기 확대**
   - 표지(`casebook-cover`)의 제목, 한 줄 소개, 메타 정보, 배지 등 주요 텍스트 폰트 크기를 현재보다 크게 조정
   - 여백이 많이 남는 문제를 해소

2. **표지 팀원 정보**
   - 현재: `이름 · 소속 · 역할, 이름 · 소속 · 역할, ...` 형태로 한 줄 연결
   - 변경: 각 팀원을 별도 줄(블록)로 분리
   - 팀원 이름은 더 큰 글씨로 강조
   - 소속·역할은 이름 아래 작은 글씨로 표시

3. **07 제작자와 라이선스**
   - 팀원 목록은 현재 형식 그대로 유지

4. **스타일**
   - `src/styles.css`의 사례집 표지 관련 스타일 영역에서 폰트 크기 조정
   - 표지 팀원용 `.casebook-cover-member`, `.casebook-cover-member-name`, `.casebook-cover-member-meta` 클래스 추가
   - 인쇄(`@media print`) 스타일에서도 동일하게 적용

## 수정 파일

- `src/components/record/CasebookDocument.tsx`
- `src/styles.css`

## 부작용

- 사례집 출력 외 다른 기능에는 영향 없음
- README 마크다운 출력(`src/lib/record-readme.ts`)은 현재 형식 유지
- 기존 데이터 구조(`team.members`) 변경 없음
