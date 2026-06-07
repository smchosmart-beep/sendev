# 평가자 닉네임 일괄 추가 기능

기존 "+ 추가" 버튼은 그대로 두고, 그 오른쪽에 **"+ 일괄 추가"** 버튼을 추가합니다. 누르면 구글 시트/엑셀에서 복사한 닉네임을 한 번에 붙여넣어 등록하는 모달이 뜹니다.

## 동작
- 모달 안 큰 텍스트영역(textarea)에 닉네임을 붙여넣기(Ctrl+V).
- 줄바꿈, 탭, 쉼표로 구분된 값을 모두 분리 → 공백 제거 → 빈 값/중복 제거.
- 미리보기로 "추가될 닉네임 N개" 표시.
- "등록" 누르면 일괄 등록, 이미 명단에 있는 닉네임은 자동 무시(중복 방지).
- 완료 후 토스트("N명을 명단에 추가했어요."), 명단 갱신, 모달 닫힘.

## 기술 변경

**1. 서버 함수 (`src/lib/platform.functions.ts`)**
- `addReviewAllowlistNames` 신규 추가: `{ categoryId, reviewerNames: string[], adminPassword }` 입력 검증(이름 최대 200개, 각 1~100자). 각 이름을 정규화 후 `review_allowlist`에 기존과 동일한 upsert(`onConflict: category_id,reviewer_key`, `ignoreDuplicates: true`)로 한 번에 insert. 추가된 건수 반환.

**2. 화면 (`src/routes/admin.criteria.tsx` – `ReviewAllowlistCard`)**
- shadcn `Dialog`, `Textarea` import.
- `bulkOpen`, `bulkText` 상태와 `addBulkMutation` 추가(`useServerFn(addReviewAllowlistNames)`).
- 기존 form의 "+ 추가" 버튼 오른쪽에 `<Button variant="outline">+ 일괄 추가</Button>` 배치(form submit과 분리되도록 `type="button"`).
- 모달 내용: 안내문("구글 시트/엑셀에서 닉네임을 복사해 붙여넣으세요"), textarea, 파싱된 미리보기 개수, 취소/등록 버튼.

**3. 사용자 가이드 (`src/routes/_main.guide.tsx`)**
- 평가자 명단 관련 설명에 "+ 일괄 추가"로 스프레드시트 닉네임을 한 번에 등록할 수 있다는 문구 추가.

서버 스키마/DB 변경은 없습니다(기존 `review_allowlist` 테이블 사용).
