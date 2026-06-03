## 문제

캘린더 일정에 한글 파일(예: `(상명초등학교-5577 ...) 붙임. 교사지원단 오리엔테이션 프로그램.hwp`)을 첨부하면 `Invalid key` 오류로 업로드가 실패합니다.

원인: `uploadEventFile`(`src/lib/platform.functions.ts`)에서 스토리지 저장 경로를 만들 때 한글을 그대로 남깁니다. Supabase Storage의 객체 키는 비ASCII 문자(한글 등)를 허용하지 않아 거부됩니다.

```
const safeName = data.name.replace(/[^\w.\-가-힣]/g, "_"); // 한글이 키에 남아 실패
const path = `${crypto.randomUUID()}-${safeName}`;
```

## 수정 방안

1. 저장 **경로(키)** 는 ASCII 안전한 값만 사용:
   - 확장자만 원본에서 추출(`.hwp`, `.pdf` 등, 소문자/숫자만 허용).
   - 본문은 `crypto.randomUUID()` 만 사용하고, 한글 등은 키에 넣지 않음.
   - 예: `path = ${uuid}.${ext}` (확장자 없으면 uuid만).
2. 사용자에게 보이는 **원본 파일명**(`name`)은 지금처럼 그대로 보존하여 반환 → 다운로드/표시 시 원래 이름 유지.

### 변경 파일
- `src/lib/platform.functions.ts` — `uploadEventFile` 핸들러의 키 생성 로직만 교체. 반환값(`name: data.name`)과 서명 URL 로직은 그대로 유지.

다른 동작/UI 변경은 없습니다.