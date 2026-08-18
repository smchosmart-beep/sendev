# 상단 헤더 메뉴 접기/펼기 버튼 추가

## 목표
- 메인 레이아웃의 상단 헤더에 메뉴를 접거나 펼 수 있는 토글 버튼을 추가한다.
- 설정(관리자) 버튼 오른쪽, 데스크탑 화면에서 보이도록 배치한다.
- 접힘/펼침 상태는 localStorage에 저장하여 기기별로 기억하고, 기본은 펼침 상태다.

## 구현 내용

### 1. 헤더 토글 버튼 및 상태
- 파일: `src/routes/_main.tsx`
- `headerNavCollapsed` 상태를 추가하고, `localStorage` 키 `sen-header-nav-collapsed`로 불러오기/저장하기.
- SSR 안전을 위해 기본값은 펼침(`false`)으로 두고, `useEffect`에서 저장된 값을 반영한다.
- 버튼은 설정 버튼 바로 다음에 배치하고, `sm:flex`로 모바일에선 숨긴다.
- 아이콘은 펼침 상태에서 `ChevronUp`, 접힘 상태에서 `ChevronDown`으로 표시한다.

### 2. 메뉴 노출 제어
- `MainLayout`의 데스크탑 수평 메뉴 `<nav>`에 `navCollapsed` 상태를 반영한다.
- 접힌 경우 수평 메뉴를 완전히 숨기고, 로고·검색·내 페이지·관리자·토글 버튼은 그대로 유지한다.
- 모바일 전용 햄버거 메뉴는 영향받지 않는다.

### 3. 사용자 가이드 업데이트
- 파일: `src/routes/_main.guide.tsx`
- "사이트 둘러보기" 또는 "화면 구성" 안내에 헤더 메뉴 접기/펼기 버튼 설명을 한 줄 추가한다.

## 영향 범위
- 변경 파일: `src/routes/_main.tsx`, `src/routes/_main.guide.tsx`
- 의존성: 추가 없음 (기존 lucide-react 아이콘 사용)
- 데이터/서버/DB: 변경 없음
