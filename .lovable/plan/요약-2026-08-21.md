해커톤 메뉴의 README 작성 버튼 제거

## 요약
활동기록의 "07 README 출력" 기능이 README 생성을 대체하게 되어, 해커톤 탭 상단에 있는 "README 작성" 버튼을 삭제하고 사용자 가이드도 함께 갱신합니다. 기존 `/readme` 페이지는 직접 접근을 위해 유지합니다.

## 변경 내용
1. `src/routes/_main.board.index.tsx`
   - 해커톤 탭 상단의 "README 작성" 버튼(`Link to="/readme"`)을 제거합니다.
   - 더 이상 사용하지 않는 `FileText` import가 남는다면 함께 정리합니다.
   - `HackathonReviewButton`과 "전체 읽음 처리" 버튼은 그대로 유지합니다.

2. `src/routes/_main.guide.tsx`
   - "README 작성" 섹션 내용을 수정하여, 메뉴 버튼이 사라지고 활동기록의 "07 README 출력"에서 README를 생성/다운로드할 수 있음을 설명합니다.
   - 메뉴 안내 섹션에서 "README 작성" 버튼 문구를 제거하거나 갱신합니다.

## 유지 범위
- `src/routes/_main.readme.tsx` 및 관련 `readme-template.ts`는 그대로 유지합니다. URL을 아는 사용자는 `/readme`에 직접 접근할 수 있습니다.
- 활동기록의 "07 README 출력" 기능과 사례집 출력 기능은 변경하지 않습니다.

## 부작용 검토
- 기능 손상: 없음. 버튼 제거만 수행합니다.
- 서버 부하/비용: 없음. 클라이언트 UI 변경입니다.
- 가이드 불일치: 방지하기 위해 가이드를 동일 작업으로 갱신합니다.
