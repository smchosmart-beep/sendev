# 산출물 평가 점수, 평가 권한자에게만 공개

지금은 산출물 글을 여는 누구에게나 "평가 요약(평균 점수)"이 그대로 보입니다. 이를 평가 권한이 있는 사람과 관리자에게만 보이도록 바꾸고, 관리자가 원할 때 전체 공개로 전환할 수 있게 합니다.

## 공개 규칙

점수를 볼 수 있는 경우는 다음뿐입니다.

1. 관리자 비밀번호를 입력한 사람
2. 해당 게시판이 **평가자 명단(허용목록) 사용** 중이면 → 명단에 등록된 닉네임으로 닉네임 비밀번호 확인을 마친 사람
3. 허용목록을 쓰지 않는 게시판이면 → 그 글에 이미 평가를 제출한 본인(닉네임 비밀번호 확인)
4. 관리자가 그 게시판의 **평가 결과 전체 공개** 스위치를 켠 경우 → 모두에게 공개

기본값은 비공개이고, 전체 공개는 관리자가 마감 후 직접 켜야 합니다.

## 화면 변화

- 산출물 글의 평가 영역: 권한이 없으면 평균 대신 "평가 결과는 평가 권한이 있는 분에게만 보여요" 안내와 함께, 닉네임 + 닉네임 비밀번호로 확인하는 작은 [점수 보기] 폼을 둡니다(관리자 비밀번호도 같은 칸에서 통합니다).
- 평가를 방금 제출하면 자동으로 권한이 확인되어 요약이 열립니다.
- 확인 상태는 해당 기기 세션에만 유지되어 같은 게시판의 다른 글로 이동해도 다시 입력하지 않아도 됩니다.
- 관리자 → 평가 기준 관리 화면에 게시판별 **평가 결과 전체 공개** 토글을 추가합니다.

## 기술 사항 (검토에서 지적된 4건 반영)

- 마이그레이션: `categories`에 `eval_results_public boolean not null default false` 추가. 더불어 `src/lib/platform.functions.ts:294`의 카테고리 select 컬럼 목록에 이 컬럼을 추가하고 `CategoryDTO`에 `evalResultsPublic`을 넣습니다(빠뜨리면 값이 항상 undefined).
- **검증 전용 닉네임 헬퍼 신설**: 기존 `ensureNicknameOwnership`(`platform.functions.ts:95`)은 미등록 닉네임을 그 자리에서 등록(claim)해 버리므로 열람 확인에 재사용하지 않습니다. 미등록이면 즉시 거부하는 `verifyNicknameOwnership`(claim 금지)을 새로 만들고, 기존 함수 시그니처와 8곳의 호출부(1143·1830·2143·4488·4538·4572·4871 등)는 그대로 둡니다.
- **개별 점수 유출 차단**: `getMyReview`는 현재 `postId` + `reviewerName`만으로 그 평가자의 점수를 반환합니다. 여기에도 닉네임 비밀번호(또는 관리자 비밀번호) 검증을 추가하고, 글 상세 화면의 호출부를 함께 수정합니다. 이걸 막지 않으면 요약만 잠가도 우회됩니다.
- 새 서버 함수 `getReviewSummary`(`postId`, `reviewerName`, `nicknamePassword`, `adminPassword`): 서버에서 위 규칙을 판정하고 허용될 때만 `{ allowed: true, count, averages }`(기준별 평균만)를 반환합니다. 거부 시 `{ allowed: false, reason }`만 반환하고 점수·평가자 명단은 일절 내보내지 않습니다.
- 기존 `listReviews`(평가자 이름 + 원점수 전체 반환)는 관리자 비밀번호 필수로 변경합니다. 사용처는 글 상세 화면 1곳(`_main.board.$slug.$postNo.tsx:1861`)뿐이라 다른 회귀는 없습니다. 관리자 집계·내보내기는 DB를 직접 조회하므로 영향 없음.
- **캐시 키에 비밀번호 금지**: `reviewSummaryQueryOptions`의 queryKey는 `["review-summary", postId, 닉네임, 관리자여부]`까지만 쓰고, 비밀번호는 `queryFn` 클로저로만 전달합니다.
- `setEvalResultsPublic`(관리자 전용) 추가. 평가 제출 성공 시 요약 쿼리를 무효화합니다.
- 평균 계산은 클라이언트에서 하지 않고 서버가 계산한 값만 표시합니다.
- 사용자 가이드(`/guide`)의 평가 설명에 새 공개 규칙과 관리자 토글을 반영합니다.

## 영향 범위

`src/lib/platform.functions.ts`, `src/lib/platform.queries.ts`, `src/routes/_main.board.$slug.$postNo.tsx`, `src/routes/admin.criteria.tsx`, `src/routes/_main.guide.tsx`, 마이그레이션 1건. 서버 호출 횟수는 기존 `listReviews` 1건을 요약 1건으로 대체하는 수준이라 비용 증가가 없고, 평가 제출·관리자 집계 기능은 그대로 유지됩니다.
