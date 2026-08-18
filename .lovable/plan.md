# 도전형 활동 기록 이식 (1차)

## 팀 테이블 없이 가는 이유

전달본은 "행사(event) + 팀(team) + 회원(member)" 3층 구조를 전제로 하지만, sendev에는 행사·팀 엔터티가 없고 닉네임 소유권(`user_profiles.nickname_password`) + 카테고리 게시판 권한만 있습니다. 여기에 팀 테이블을 새로 만들면 팀 생성·초대·탈퇴 관리 화면까지 따라 붙어 사이트 전체 개념이 이중화됩니다.

대신 **하나의 게시글이 하나의 팀 활동기록**이 되는 구조로 갑니다.

```text
categories (해커톤 탭, enable_record = true)
  └ posts (type = 'record')        ← 팀 = 이 글 1개. 권한·읽음·좋아요·검색 그대로 재사용
       ├ record_members            ← 팀원 목록(닉네임). member_id 대체
       ├ record_process_logs       ← 문제 정의 과정 (여러 건)
       ├ record_final              ← 최종 결과물 (1건)
       ├ record_rows               ← 핵심기능/사용흐름/한계/계획/제작자 (kind + sort_order)
       ├ record_dev_logs           ← 자유 개발 기록 (여러 건)
       ├ record_checks             ← 교육적 점검 8항목 (key + 값)
       └ record_reflections        ← 개인 후기 (post_id + username_key 유니크)
```

- `event_id` → `posts.category_id`
- `team_id` → `posts.id`
- `member_id` → `username_key` (기존 닉네임 키)
- 수정 권한: 기존 규칙 그대로 — 글 작성자 비밀번호 또는 관리자. 개인 후기만 본인 닉네임 비밀번호로 각자 작성/수정.

이렇게 하면 읽지 않은 글 표시, 검색, 좋아요, 관리자 이동/삭제가 추가 작업 없이 전부 붙습니다.

## 1차 범위

1. 카테고리에 `enable_record` / `record_name` 토글 추가 (관리자 화면 포함)
2. 위 테이블 생성 + GRANT + RLS
3. `/board/:slug/new-record` 작성 진입 → 활동기록 상세 화면 `/board/:slug/:postNo`에 탭 UI
4. **2단계 최종 결과물** 전체 입력 폼 (반복행 추가·삭제·순서, 대표 이미지 업로드, 환경변수 이름만 입력 안내)
5. 자동 임시저장 (1000ms 디바운스, 저장중/완료/실패 표시, 새로고침 복원)
6. **README 9블록 생성기** — 기존 `/readme`를 전달본 `교사개발자-README-최종출력안.md` 양식으로 교체하고, ZIP(`README.md` + `assets/대표이미지`) 다운로드 추가
7. 사용자 가이드에 활동기록 사용법 섹션 추가

## 2차·3차 (이번엔 미구현)

- 2차: 문제 정의 과정 게시판형 기록, 개발 과정 자유기록, 교육적 점검 8항목, 개인 후기·약속 2개 제한
- 3차: 관리자 팀별 작성 현황·원자료 내려받기

## 기술 메모

- 대표 이미지는 기존 `post-images` 버킷 재사용, 첨부는 `post-files` 재사용
- 저장은 전부 `createServerFn` (`src/lib/record.functions.ts`) + 기존 비밀번호 검증 헬퍼 재사용. 새 서버 비용 요인 없음(디바운스 upsert 1건/1초)
- ZIP 생성은 클라이언트에서 수행(서버 부하 0), UTF-8 고정
- README 렌더는 `src/lib/readme-template.ts`를 9블록 규격으로 재작성, 빈 선택 절 자동 생략, 비밀값 출력 금지
- 반복행은 `sort_order` 보존, 생성·수정 시각은 DB `now()`
