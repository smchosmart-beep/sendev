# 도전형 활동 기록 이식 (1차) — 보완 반영본

검토에서 나온 6개 위험을 계획에 반영했습니다. 구조(글 1개 = 팀 1개)는 그대로입니다.

## 구조

전달본의 "행사 + 팀 + 회원" 3층 구조 대신, **게시글 1개 = 팀 활동기록 1개**로 매핑합니다.

```text
categories (해커톤 탭, enable_record = true)
  └ posts (type = 'record')        ← 팀 = 이 글 1개
       ├ record_members            ← 팀원 닉네임
       ├ record_process_logs       ← 문제 정의 과정
       ├ record_final              ← 최종 결과물 (1건)
       ├ record_rows               ← 핵심기능/사용흐름/한계/계획/제작자 (kind + sort_order)
       ├ record_dev_logs           ← 자유 개발 기록
       ├ record_checks             ← 교육적 점검 8항목
       └ record_reflections        ← 개인 후기 (post_id + username_key 유니크)
```

- `event_id` → `posts.category_id`, `team_id` → `posts.id`, `member_id` → `username_key`
- 수정 권한: 글 작성자 비밀번호 또는 관리자. 개인 후기는 본인 닉네임 비밀번호.

## 보완 1 — `posts.type` 제약 확장 (필수)

현재 제약은 `['post','project','link','problem','vote']`뿐이라 `'record'` 저장이 즉시 실패합니다. 마이그레이션 첫 문장에서 제약을 다시 만들어 `'record'`를 추가합니다.

## 보완 2 — 기존 보안 패턴 유지 (필수)

새 테이블에 anon/authenticated 직접 쓰기 권한을 주지 않습니다. 기존 `posts`·`votes`와 동일하게:

- RLS 활성화, 공개 읽기 정책만 필요한 테이블에 한정 부여
- 쓰기·수정·삭제는 전부 `createServerFn` + service_role 경유, 그 안에서 기존 비밀번호/관리자 검증 헬퍼로 권한 확인
- `record_reflections`는 본인 닉네임 비밀번호 확인 후에만 쓰기

## 보완 3 — 목록·상세 화면 타입 분기 (필수)

지금 목록/상세는 허용 타입을 명시적으로 걸러내므로 `'record'` 글이 화면에 아예 안 나옵니다. 아래 파일에 `'record'` 분기를 추가합니다.

- `src/routes/_main.board.$slug.index.tsx` — 활동기록 섹션 + 카드(미열람 점, 좋아요 포함)
- `src/routes/_main.board.$slug.$postNo.tsx` — 활동기록 탭 상세 화면
- 글쓰기 진입 경로 및 카테고리 탭 구성(`enable_record` 반영)

## 보완 4 — README 저장 데이터 호환

기존 `/readme`는 `localStorage["readme-generator-data"]`에 옛 구조를 저장 중입니다. 9블록으로 바꾸면 기존 사용자 데이터가 깨지므로:

- 새 키 `readme-generator-data-v2` 사용, 옛 키는 읽어서 가능한 필드만 이관 후 유지
- 로드 시 항상 기본값과 병합(누락 필드 방어)

## 보완 5 — ZIP 라이브러리 추가

클라이언트 ZIP 생성을 위해 `jszip` 설치(현재 미설치). 생성은 브라우저에서만 수행하므로 서버 비용 0.

## 보완 6 — 동시 수정 충돌 방지

팀원 여러 명이 같은 기록을 동시에 편집할 수 있으므로:

- 전체 문서 통째 덮어쓰기 금지 — 변경된 행 단위로만 upsert
- 각 행에 `updated_at` 비교를 두고, 서버 값이 더 최신이면 저장 대신 "다른 팀원이 먼저 수정했어요" 안내 후 최신본 다시 불러오기
- 자동 임시저장은 1000ms 디바운스, 변경분이 없으면 요청 생략

## 1차 구현 범위

1. 카테고리 `enable_record` / `record_name` 토글 + 관리자 화면
2. 마이그레이션: 타입 제약 확장 → 테이블 생성 → GRANT → RLS → 정책
3. 활동기록 작성 진입 및 상세 탭 UI (보완 3 반영)
4. 2단계 최종 결과물 전체 입력 폼 (반복행 추가·삭제·순서, 대표 이미지 업로드, 환경변수는 이름만)
5. 자동 임시저장 (보완 6 반영, 저장중/완료/충돌 표시)
6. README 9블록 생성기 + ZIP(`README.md` + `assets/대표이미지`) 다운로드 (보완 4·5 반영)
7. 사용자 가이드에 활동기록 사용법 섹션 추가

## 2차·3차 (이번엔 미구현)

- 2차: 문제 정의 과정 기록, 개발 과정 자유기록, 교육적 점검 8항목, 개인 후기·약속
- 3차: 관리자 팀별 작성 현황·원자료 내려받기

## 기술 메모

- 이미지 `post-images`, 첨부 `post-files` 버킷 재사용
- 서버 로직은 `src/lib/record.functions.ts` 한 곳에 모음
- README 렌더는 `src/lib/readme-template.ts`를 9블록 규격으로 재작성, 빈 절 자동 생략, 비밀값 출력 금지
