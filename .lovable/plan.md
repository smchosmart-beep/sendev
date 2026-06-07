# 미리보기 깨짐 / 평가자 기능 오류 복구

## 진단
세 가지 증상(토글 안 됨, 추가 버튼 안 됨, 평가 현황 안 보임)은 개별 버그가 아니라 **앱 전체가 로드되지 않는 단일 원인**에서 비롯됐습니다.

- 미리보기 런타임 오류: `Failed to fetch dynamically imported module ... tanstack-start-client-entry` → 클라이언트 번들 자체가 로드 실패.
- 개발 서버 로그(11:52): `SyntaxError: Expected corresponding JSX closing tag for <div> (236:8)` in `src/routes/_main.board.$slug.new-general.tsx` → 이전 작업(비밀번호 확인 입력 추가) 중간 상태에서 JSX 깨짐이 발생해 **개발 서버가 그 시점에 크래시**.
- 그 이후 로그가 없음 = 개발 서버가 죽은 채로 깨진/오래된 번들을 계속 서빙. 그래서 관리자 페이지의 모든 상호작용(토글·추가)과 데이터 조회(평가 현황)가 동작하지 않음.

현재 `new-general.tsx`를 비롯한 소스 파일의 JSX 태그는 균형이 맞아 **이미 정상 상태**입니다(이후 편집으로 복구됨). 즉 코드 수정이 아니라 죽은 개발 서버를 살리는 것이 핵심.

## 조치
1. 네 개 새 글 작성 파일(`new-general`/`new-question`/`new-project`/`new-link`)의 JSX 태그 균형을 최종 확인(이상 시 즉시 수정).
2. 개발 서버 재시작(`restart_dev_server`)으로 최신 소스 기준 번들 재생성.
3. 미리보기 `/admin/categories`에서 실제 검증:
   - "명단에 있는 닉네임만 평가 허용" 토글 on/off 동작
   - "+ 추가" 및 "+ 일괄 추가" 동작
   - "평가 현황 점검"에 제출된 평가가 표시되는지 확인

데이터/스키마 변경은 없습니다.
