// 본문(HTML/마크다운 혼합)에서 평문과 자동 제목을 뽑는 헬퍼.
// 투표 게시판은 제목 입력 없이 본문만 받으므로, 서버의 제목 필수 제약을 만족시키기 위해
// 본문 앞부분을 잘라 제목으로 사용한다.

export function htmlToPlainText(input: string): string {
  if (!input) return "";
  return input
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[*_`>#-]{1,}\s/g, " ")
    // 템플릿/마크다운에서 입력된 리터럴 이스케이프 문자를 평문으로 정리한다.
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]")
    .replace(/\\n/g, " ")
    .replace(/\\\n/g, " ")
    .replace(/\\\r/g, " ")
    .replace(/\\\t/g, " ")
    .replace(/\\\\/g, "\\")
    .replace(/\s+/g, " ")
    .trim();
}

export const NO_TITLE_FALLBACK = "(제목 없음)";

export function deriveTitleFromContent(content: string, max = 60): string {
  const plain = htmlToPlainText(content);
  if (!plain) return NO_TITLE_FALLBACK;
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}

// 카드/상세에서 보여줄 본문 요약. 본문이 비어 있으면 기존 제목으로 폴백한다.
export function voteCardText(content: string, title: string): string {
  const plain = htmlToPlainText(content);
  if (plain) return plain;
  return title === NO_TITLE_FALLBACK ? "" : title;
}
