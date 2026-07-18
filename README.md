# SenDev (센데브)

초등 교사·에듀테크 커뮤니티를 위한 게시판/자료 공유 플랫폼입니다. 글 게시판, 산출물(프로젝트) 게시판, 링크 게시판, 그리고 현장의 문제를 한 줄로 모으는 **문제ZIP** 게시판을 제공합니다.

- 배포: https://sendev.kr
- 미리보기: https://sendev.lovable.app

## 주요 기능

- **다양한 게시판 유형**: 글 / 산출물 / 링크 / 문제ZIP(영역·빈도·한 줄 제보 폼)
- **닉네임 기반 활동**: 회원가입 없이 글·댓글을 처음 작성할 때 닉네임과 비밀번호가 자동 등록되고, `/mypage`에서 로그인해 내 활동을 확인
- **좋아요 · 댓글 · 이미지 첨부 · 링크 미리보기 · 시리즈**
- **모바일 UX**: 게시글 좌우 스와이프로 이전/다음 글 이동, PC는 ←/→ 방향키 지원
- **후기 담벼락**: 데스크톱은 좌우 세로 마퀴, 모바일은 하단 접기/펼치기 가로 마퀴
- **관리자 페이지**: 카테고리, 문제ZIP 선택지, 캘린더, 홈, 프로필, 설정 관리
- **사용자 가이드**: `/guide` (사이트 사용법 단일 기준 문서)

## 기술 스택

- **프레임워크**: TanStack Start v1 (React 19, SSR/Edge)
- **번들러**: Vite 7
- **스타일**: Tailwind CSS v4 + shadcn/ui
- **백엔드**: Lovable Cloud (DB · Auth · Storage · Edge)
- **상태/데이터**: TanStack Query, TanStack Router
- **배포**: Cloudflare Workers (Edge)

## 스크립트

```bash
bun install        # 의존성 설치
bun run dev        # 개발 서버 (http://localhost:8080)
bun run build      # 프로덕션 빌드
bun run preview    # 빌드 결과 미리보기
bun run lint       # ESLint
bun run format     # Prettier
```

## 디렉터리 구조

```
src/
  routes/              # 파일 기반 라우팅 (TanStack Router)
    __root.tsx         # 루트 레이아웃
    _main.*.tsx        # 일반 사용자 페이지
    admin.*.tsx        # 관리자 페이지
    api/               # 서버 라우트(웹훅/공개 API)
  components/          # 재사용 UI 컴포넌트
  hooks/               # 커스텀 훅 (스와이프·키보드·닉네임 등)
  lib/                 # 서버 함수, 유틸리티
  integrations/supabase # 자동 생성 클라이언트 (수정 금지)
  styles.css           # Tailwind v4 · 디자인 토큰
supabase/              # 마이그레이션 · 설정
```

## 라이선스

내부 프로젝트. 무단 복제·재배포를 금합니다.
