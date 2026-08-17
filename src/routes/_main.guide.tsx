import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  HelpCircle,
  KeyRound,
  KeySquare,
  ShieldCheck,
  Star,
  Award,
  LayoutGrid,
  Search,
  UserRound,
  Settings,
  RotateCcw,
  ListChecks,
  LinkIcon,
  Bell,
  Eye,
  ChevronUp,
  ChevronDown,
  StickyNote,
  X,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/_main/guide")({
  head: () => ({
    meta: [
      { title: "사용자 가이드 — SEN DEV CONNECT" },
      {
        name: "description",
        content:
          "SEN DEV CONNECT 사용법 안내: 닉네임·비밀번호, 레벨/배지 제도, 메뉴 설명, 검색, 내 페이지, 관리자 접근까지 한눈에 확인하세요.",
      },
      { property: "og:title", content: "사용자 가이드 — SEN DEV CONNECT" },
      {
        property: "og:description",
        content:
          "닉네임·비밀번호, 레벨/배지 제도, 메뉴 설명, 검색, 내 페이지, 관리자 접근 등 사이트 사용법 전체 안내.",
      },
    ],
  }),
  component: GuidePage,
});

const sections = [
  { id: "why-nickname", label: "닉네임·비밀번호를 쓰는 이유" },
  { id: "find-password", label: "닉네임 비밀번호 찾기" },
  { id: "password-diff", label: "닉네임 비밀번호 안내" },
  { id: "level", label: "레벨(LV) 제도" },
  { id: "badge", label: "배지 제도" },
  { id: "security", label: "보안 안전성" },
  { id: "menus", label: "메뉴 안내" },
  { id: "hackathon-reviews", label: "해커톤 후기카드" },
  { id: "readme", label: "README 작성" },
  { id: "posting", label: "글쓰기와 공지" },
  { id: "copyright", label: "저작권 및 게시물 이용 안내" },
  { id: "unread", label: "읽지 않은 글 표시" },
  { id: "views", label: "조회수" },
  { id: "links", label: "본문 링크 미리보기" },
  { id: "search", label: "검색 기능" },
  { id: "mypage", label: "내 페이지" },
  { id: "admin", label: "관리자 대시보드" },
] as const;

function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: typeof HelpCircle;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

const HIGHLIGHT_SUPPORTED =
  typeof CSS !== "undefined" &&
  typeof Highlight !== "undefined" &&
  !!(CSS as unknown as { highlights?: unknown }).highlights;

// In-page search for the guide. Uses the CSS Custom Highlight API so the DOM
// structure React owns is never mutated (no removeChild / hydration conflicts).
function useGuideSearch(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [query, setQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const rangesRef = useRef<Range[]>([]);

  const clearHighlights = useCallback(() => {
    if (!HIGHLIGHT_SUPPORTED) return;
    const highlights = (CSS as unknown as { highlights: Map<string, unknown> }).highlights;
    highlights.delete("guide-search");
    highlights.delete("guide-search-active");
  }, []);

  // Build ranges for the current query.
  useEffect(() => {
    if (!HIGHLIGHT_SUPPORTED) return;
    const container = containerRef.current;
    const term = query.trim().toLowerCase();
    rangesRef.current = [];

    if (!container || term.length === 0) {
      clearHighlights();
      setMatchCount(0);
      setActiveIndex(0);
      return;
    }

    const ranges: Range[] = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const text = node.textContent ?? "";
      const lower = text.toLowerCase();
      let from = 0;
      let idx = lower.indexOf(term, from);
      while (idx !== -1) {
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + term.length);
        ranges.push(range);
        from = idx + term.length;
        idx = lower.indexOf(term, from);
      }
      node = walker.nextNode();
    }

    rangesRef.current = ranges;
    setMatchCount(ranges.length);
    setActiveIndex(ranges.length > 0 ? 0 : 0);

    const highlights = (CSS as unknown as { highlights: Map<string, unknown> }).highlights;
    if (ranges.length > 0) {
      highlights.set("guide-search", new Highlight(...ranges));
    } else {
      highlights.delete("guide-search");
      highlights.delete("guide-search-active");
    }
  }, [query, containerRef, clearHighlights]);

  // Apply the active highlight + scroll into view whenever active index changes.
  useEffect(() => {
    if (!HIGHLIGHT_SUPPORTED) return;
    const ranges = rangesRef.current;
    const highlights = (CSS as unknown as { highlights: Map<string, unknown> }).highlights;
    if (ranges.length === 0) {
      highlights.delete("guide-search-active");
      return;
    }
    const active = ranges[activeIndex];
    if (!active) return;
    highlights.set("guide-search-active", new Highlight(active));
    const el =
      active.startContainer.parentElement ?? (active.startContainer as HTMLElement);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex, matchCount]);

  // Clean up on unmount.
  useEffect(() => clearHighlights, [clearHighlights]);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (matchCount === 0 ? 0 : (i + 1) % matchCount));
  }, [matchCount]);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (matchCount === 0 ? 0 : (i - 1 + matchCount) % matchCount));
  }, [matchCount]);

  return {
    query,
    setQuery,
    matchCount,
    activeIndex,
    goNext,
    goPrev,
    supported: HIGHLIGHT_SUPPORTED,
  };
}

function GuideSearch({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { query, setQuery, matchCount, activeIndex, goNext, goPrev, supported } =
    useGuideSearch(containerRef);

  if (!supported) return null;

  return (
    <div className="sticky top-2 z-20 rounded-2xl border border-border bg-card/95 p-2 shadow-sm backdrop-blur">
      <div className="flex w-full min-w-0 items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (e.shiftKey) goPrev();
                else goNext();
              }
            }}
            placeholder="가이드 내용 검색 (Enter: 다음)"
            className="h-10 w-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="가이드 내용 검색"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="검색어 지우기"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {query.trim().length > 0 && (
          <span className="min-w-[3.5rem] shrink-0 text-center text-xs font-medium text-muted-foreground">
            {matchCount > 0 ? `${activeIndex + 1} / ${matchCount}` : "0 / 0"}
          </span>
        )}
        <button
          type="button"
          onClick={goPrev}
          disabled={matchCount === 0}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
          aria-label="이전 일치"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={matchCount === 0}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
          aria-label="다음 일치"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function GuidePage() {
  const contentRef = useRef<HTMLDivElement>(null);
  return (
    <div className="space-y-8">
      <header className="rounded-3xl bg-gradient-to-br from-primary/15 to-secondary/40 p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <HelpCircle className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">사용자 가이드</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
          SEN DEV CONNECT를 처음 사용하시나요? 닉네임과 비밀번호 운영 방식부터 레벨·배지 제도, 각 메뉴의
          용도, 내 페이지와 관리자 접근까지 이 문서 하나로 안내합니다.
        </p>
      </header>

      <GuideSearch containerRef={contentRef} />

      <div ref={contentRef} className="space-y-8">
      {/* 목차 */}
      <nav className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-foreground">목차</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {sections.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <span className="truncate">{s.label}</span>
            </a>
          ))}
        </div>
      </nav>

      <Section id="why-nickname" icon={KeyRound} title="닉네임과 비밀번호를 설정하는 이유">
        <p>
          이 사이트는 별도의 회원가입(이메일·계정) 없이 <strong>닉네임</strong>을 중심으로 활동합니다. 닉네임은
          내가 쓴 글·댓글, 받은 좋아요, 레벨, 배지 등 모든 활동 기록이 연결되는 기준입니다.
        </p>
        <p>
          누구나 같은 닉네임을 입력할 수 있으면 <strong>사칭</strong>이 가능하기 때문에, 닉네임을 처음 사용할 때
          <strong> 닉네임 비밀번호</strong>를 설정합니다. 이 비밀번호로 "이 닉네임은 내 것"임을 증명하고, 다른
          사람이 같은 닉네임으로 내 활동에 손대는 것을 막습니다.
        </p>
      </Section>

      <Section id="find-password" icon={RotateCcw} title="닉네임 비밀번호 찾기">
        <p>
          닉네임 비밀번호를 잊었다면 <strong>복구 질문</strong>으로 직접 재설정할 수 있습니다.
        </p>
        <ol className="ml-5 list-decimal space-y-1">
          <li>먼저 <strong>내 페이지</strong>에서 로그인한 상태로 "복구 질문/답변"을 미리 설정해 둡니다.</li>
          <li>
            비밀번호를 잊으면 로그인 화면의 <strong>"비밀번호를 잊으셨나요?"</strong>를 눌러 닉네임을 입력합니다.
          </li>
          <li>등록해 둔 복구 질문의 답을 맞히면 새 비밀번호로 재설정됩니다.</li>
        </ol>
        <p>
          복구 질문을 설정하지 않았거나 답을 잊은 경우에는 시스템 관리자에게 닉네임 비밀번호 초기화를 요청해야
          합니다. (사칭 방지를 위해 복구 질문 설정을 미리 해두시길 권장합니다.)
        </p>
      </Section>

      <Section id="password-diff" icon={KeySquare} title="닉네임 비밀번호 사용 안내">
        <p>
          이 사이트에서는 <strong>닉네임 비밀번호 하나</strong>로 모든 활동을 보호합니다. 별도의 회원가입 없이 닉네임과
          비밀번호만으로 글·댓글 작성, 수정·삭제, 산출물 평가 등을 할 수 있습니다.
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>글·댓글 작성</strong>: 닉네임과 닉네임 비밀번호를 입력하면 작성됩니다. 처음 사용하는 닉네임은
            비밀번호를 <strong>두 번 입력</strong>해 등록하고, 이후에는 한 번만 입력해 본인 확인을 합니다.
          </li>
          <li>
            <strong>글·댓글 수정·삭제</strong>: 수정이나 삭제를 할 때도 <strong>같은 닉네임 비밀번호</strong>로
            본인 확인을 합니다. 다른 사람이 내 닉네임으로 글이나 댓글을 지우는 것을 막습니다.
          </li>
          <li>
            <strong>산출물 평가</strong>: 별점 평가를 남길 때도 닉네임 비밀번호로 본인 확인을 합니다. 같은 닉네임으로
            여러 번 평가하거나, 다른 사람이 내 닉네임을 도용해 평가하는 것을 방지합니다.
          </li>
        </ul>
        <p>
          일부 평가는 운영자가 미리 정한 <strong>평가자 명단</strong>의 닉네임만 참여할 수 있습니다. 이런 경우
          명단에 없는 닉네임으로는 평가가 제출되지 않으니, 평가가 되지 않으면 운영자에게 명단 등록을 문의해 주세요.
        </p>
        <p>
          비밀번호 입력칸 오른쪽의 <strong>눈 버튼</strong>을 누르면 입력한 비밀번호를 잠깐 평문으로 확인할 수
          있어 오타를 막을 수 있습니다.
        </p>
      </Section>

      <Section id="level" icon={Star} title="레벨(LV) 제도">
        <p>활동량에 따라 레벨이 자동으로 계산되어 닉네임 옆에 표시됩니다.</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>글 작성: <strong>1편당 5점</strong></li>
          <li>댓글 작성: <strong>1개당 1점</strong></li>
        </ul>
        <p>
          누적 점수가 높을수록 레벨이 올라가며, 최대 <strong>LV 99</strong>까지 도달할 수 있습니다. 레벨은 별도
          신청 없이 활동만으로 자동 반영됩니다.
        </p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-foreground">레벨 구간</th>
                <th className="px-4 py-2.5 text-left font-semibold text-foreground">필요 누적 점수</th>
                <th className="px-4 py-2.5 text-left font-semibold text-foreground">예상 활동량</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { range: "LV 1", pts: "0 ~ 15점", act: "—" },
                { range: "LV 2 ~ 9", pts: "16 ~ 95점", act: "글 3~19편 또는 댓글 16~95개" },
                { range: "LV 10 ~ 19", pts: "96 ~ 196점", act: "글 19~39편 또는 댓글 96~196개" },
                { range: "LV 20 ~ 29", pts: "197 ~ 297점", act: "글 39~59편 또는 댓글 197~297개" },
                { range: "LV 30 ~ 39", pts: "298 ~ 398점", act: "글 59~79편 또는 댓글 298~398개" },
                { range: "LV 40 ~ 49", pts: "399 ~ 499점", act: "글 79~99편 또는 댓글 399~499개" },
                { range: "LV 50 ~ 59", pts: "500 ~ 601점", act: "글 100~120편 또는 댓글 500~601개" },
                { range: "LV 60 ~ 69", pts: "602 ~ 702점", act: "글 120~140편 또는 댓글 602~702개" },
                { range: "LV 70 ~ 79", pts: "703 ~ 803점", act: "글 140~160편 또는 댓글 703~803개" },
                { range: "LV 80 ~ 89", pts: "804 ~ 904점", act: "글 160~180편 또는 댓글 804~904개" },
                { range: "LV 90 ~ 99", pts: "905 ~ 1,000점", act: "글 181~200편 또는 댓글 905~1,000개" },
              ].map((row, i) => (
                <tr key={i} className="odd:bg-muted/30">
                  <td className="px-4 py-2 font-medium text-foreground">{row.range}</td>
                  <td className="px-4 py-2 text-muted-foreground">{row.pts}</td>
                  <td className="px-4 py-2 text-muted-foreground">{row.act}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          * 레벨 계산 공식: 레벨 = round(누적점수 × 99 ÷ 1,000), 최소 LV 1 / 최대 LV 99. 글과 댓글 점수가 합산됩니다.
        </p>
        <div className="mt-2 space-y-1">
          <p className="font-medium text-foreground">레벨은 어디에 표시되나요?</p>
          <ul className="ml-5 list-disc space-y-1">
            <li><strong>내 페이지</strong> 상단의 활동 카드에 <code>Lv.N</code> 형태로 크게 표시됩니다.</li>
            <li>게시글·댓글 목록에서 <strong>작성자 닉네임 옆</strong>에도 <code>Lv.N</code> 뱃지가 함께 표시됩니다.</li>
          </ul>
        </div>
      </Section>

      <Section id="badge" icon={Award} title="배지 제도">
        <p>
          배지는 운영진(관리자)이 특정 닉네임에게 부여하는 표식입니다. 우수 활동, 행사 참여 등에 대한 인정으로
          수여되며, 부여된 배지는 <strong>내 페이지</strong>와 글·댓글의 작성자 이름 옆에 표시됩니다.
        </p>
        <div className="space-y-1">
          <p className="font-medium text-foreground">배지는 어디에 어떻게 표시되나요?</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>내 페이지</strong>에서는 보유한 <strong>모든 배지</strong>가 각각 아이콘과 배지 이름으로 나열되어
              표시됩니다.
            </li>
            <li>
              게시글·댓글의 <strong>작성자 이름 옆</strong>에서는 공간 절약을 위해 <strong>대표 배지(첫 번째) 아이콘
              하나</strong>만 표시됩니다.
            </li>
            <li>
              배지가 여러 개인 경우, 나머지 배지는 <code>+N</code> 칩으로 축약되어 표시됩니다. (예: 배지 3개 →
              아이콘 1개 + <code>+2</code>)
            </li>
            <li>
              <code>+N</code> 칩을 누르면(클릭·탭) 팝오버가 열리며 <strong>보유한 배지 전체 목록</strong>을 확인할 수
              있습니다.
            </li>
          </ul>
        </div>
        <p>닉네임을 변경하더라도 보유한 배지는 그대로 유지됩니다.</p>
      </Section>

      <Section id="security" icon={ShieldCheck} title="보안 안전성">
        <ul className="ml-5 list-disc space-y-2">
          <li>모든 비밀번호와 복구 답변은 <strong>암호화(해시)되어 저장</strong>되며, 원문 그대로 저장되지 않습니다.</li>
          <li>비밀번호 검증은 <strong>서버에서만</strong> 처리되어 외부에 노출되지 않습니다.</li>
          <li>공지 작성, 카테고리·일정·평가 기준·홈 화면 관리, 사용자 프로필/배지 관리 등 <strong>모든 관리자 작업은 서버에서 관리자 비밀번호를 다시 확인</strong>합니다. 따라서 시크릿 창이나 개발자 콘솔에서 권한 없이 관리자 기능을 실행할 수 없습니다.</li>
          <li>닉네임을 변경해도 레벨·배지·작성 글·댓글·좋아요 기록은 모두 보존됩니다.</li>
          <li>복구 질문 방식으로 본인 확인을 거쳐 무단 비밀번호 초기화를 막습니다.</li>
        </ul>
      </Section>

      <Section id="menus" icon={LayoutGrid} title="메뉴 안내">
        <ul className="ml-5 list-disc space-y-2">
          <li><strong>캘린더</strong>: 행사·일정·마감 등을 날짜별로 확인하는 일정 보기 메뉴입니다.</li>
          <li><strong>해커톤</strong>: 해커톤 관련 공지, 모집, 후기 등을 모아 보는 게시판입니다.</li>
          <li><strong>자료집</strong>: 학습·개발에 도움이 되는 자료와 문서를 공유하는 게시판입니다.</li>
          <li><strong>Dev Ground</strong>: 프로젝트·아이디어 등 개발 활동을 자유롭게 공유하는 공간입니다.</li>
          <li><strong>Hello, World</strong>: 자기소개, 인사, 가벼운 이야기 등을 나누는 게시판입니다.</li>
        </ul>
        <p className="mt-3">
          각 탭 안의 게시판은 <strong>폴더(그룹) 구조로 정리</strong>됩니다. 폴더를 펼치면 그 안에 속한
          하위 게시판들이 보이고, 게시판을 누르면 글 목록으로 들어갑니다. 폴더 안에 또 다른 폴더를 넣어
          여러 단계로 분류할 수도 있습니다. 폴더의 <strong>펼침/접힘 상태는 기기별로 기억</strong>되어,
          다시 방문해도 직전에 보던 상태가 그대로 유지됩니다.
        </p>
        <p className="mt-3">
          관리자가 <strong>목록에서 숨기기</strong>를 켠 폴더·게시판은 목록에서 사라지지 않고
          <strong>회색 비활성 상태로 표시</strong>되며, 클릭해서 들어갈 수 없습니다 (직접 링크로는 접근 가능).
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li><strong>폴더(그룹)</strong>: 게시판들을 묶어두는 상자입니다. 폴더에는 글을 쓰지 않습니다.</li>
          <li><strong>게시판</strong>: 실제로 글을 쓰고 읽는 공간입니다.</li>
        </ul>
      </Section>

      <Section id="hackathon-reviews" icon={StickyNote} title="해커톤 후기카드">
        <p>
          <strong>해커톤</strong> 탭에서는 참가자들이 남긴 <strong>후기카드</strong>를
          알록달록한 포스트잇 형태로 볼 수 있습니다. 넓은 화면(PC)에서는 가운데 목록
          좌우의 빈 여백에 담벼락처럼 카드가 떠 있는데, 카드가 많아지면 <strong>위아래로
          천천히 자동으로 흐르며</strong> 모든 후기를 차례로 보여줍니다. 읽거나 수정하고
          싶을 때 <strong>카드 위에 마우스를 올리면 잠시 멈춥니다</strong>. 좁은 화면(모바일)
          에서는 화면 맨 아래에 포스트잇 카드가 붙어 가로로 흐르는 띠 형태로 표시되며,
          띠 위쪽의 <strong>“후기” 손잡이를 탭하면 접거나 펼칠 수 있어</strong> 필요할 때만 볼 수 있습니다.
        </p>
        <p className="mt-3">
          후기를 쓰려면 <strong>“해커톤” 글자 오른쪽의 포스트잇 “후기 작성” 버튼</strong>을
          누르세요. 닉네임과 비밀번호로 본인 확인을 한 뒤, 참가 유형(입문형·성장형·도전형)을
          고르고 소감을 적으면 됩니다.
        </p>
        <ul className="ml-5 mt-3 list-disc space-y-2">
          <li>
            <strong>작성 권한</strong>: 해커톤(입문형·성장형·도전형) 게시판에 글을
            <strong> 1개 이상 작성한 닉네임</strong>만 후기를 남길 수 있습니다.
          </li>
          <li>
            <strong>수정·삭제</strong>: 내 후기 카드를 누르면 닉네임 비밀번호 확인 후
            언제든 수정하거나 삭제할 수 있습니다.
          </li>
          <li>
            <strong>참가 유형</strong>은 작성자가 직접 선택하며, 카드에 배지로 함께
            표시됩니다.
          </li>
        </ul>
      </Section>



      <Section id="posting" icon={LayoutGrid} title="글쓰기와 공지">
        <p>
          공지·질문·일반글은 하나의 <strong>글</strong> 형태로 통합되었습니다. 게시판에서 <strong>글 등록</strong> 버튼으로
          누구나 글을 쓸 수 있고, 글 작성 폼에서 <strong>상단 고정(공지)</strong> 체크박스를 켜면 그 글이 목록 최상단에 고정되어 공지처럼 표시됩니다. 이미 작성한 글도 <strong>글 수정</strong> 화면에서 같은 체크박스로 상단 고정을 켜거나 끌 수 있습니다.
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>일반 사용자도 공지(상단 고정 글)를 작성할 수 있습니다.</li>
          <li>고정되지 않은 글은 최신순으로 목록에 표시되며 페이지로 넘겨 볼 수 있습니다.</li>
          <li>산출물·링크 게시판은 기존과 동일하게 별도로 운영됩니다.</li>
          <li><strong>게시판 내 검색창</strong>: 각 게시판 목록 맨 위의 검색창에 단어를 입력하면 그 게시판의 모든 영역(고정 게시글, 일반게시판, 산출물, 링크, 문제ZIP)에서 <strong>제목과 작성자</strong>에 그 단어가 들어간 글만 남습니다. 대소문자는 구분하지 않고, 결과가 없는 영역은 화면에서 감춰집니다. 문제ZIP의 한 줄 제보는 제목으로 저장되므로 함께 검색됩니다. 검색어는 주소(URL)에 남아 <strong>새로고침·공유·뒤로가기</strong>에서도 유지되며, 입력창 오른쪽 <strong>X</strong> 버튼으로 지울 수 있습니다.</li>
          <li><strong>문제ZIP 게시판</strong>: 현장의 문제를 세 단계 폼으로 간단히 제보하는 게시판입니다. ① <strong>고통 영역</strong> 선택(예: 보건/건강, 행정/공문, 수업/평가, 학부모소통, 학교행사) — 목록에 없으면 <strong>직접 입력</strong>도 가능합니다, ② <strong>발생 빈도</strong> 선택(매일 / 주 1~2회 / 시즌 한정), ③ <strong>한 줄로 알려주세요</strong>(최대 100자)만 입력하면 됩니다. 제보된 문제는 영역·빈도 배지와 함께 카드 목록으로 공개되며, <strong>공감(하트)</strong>과 <strong>댓글</strong>로 함께 이야기할 수 있습니다. 목록 위쪽의 <strong>영역 필터 버튼</strong>(전체 + 각 영역, 직접 입력으로 작성된 글이 있으면 <strong>직접 입력</strong> 버튼도 표시)으로 원하는 영역의 글만 골라 볼 수 있고, 버튼 옆 숫자는 해당 영역의 글 수입니다. 목록은 <strong>최신순 / 좋아요순</strong>으로 정렬해 볼 수 있고, 페이지로 넘겨 볼 수 있습니다. 영역·빈도 선택지는 관리자가 <strong>관리자 &gt; 문제ZIP 선택지</strong>에서 편집합니다.</li>

          <li>본문 편집기 상단 도구 모음에서 <strong>제목·굵게·기울임·밑줄</strong>, <strong>글자 색상·글자 크기</strong>, 인용·목록·링크·이미지 서식을 적용할 수 있습니다. 글자 크기는 <strong>작게·보통·크게·매우 크게</strong> 4단계로 조절할 수 있습니다.</li>
          <li>본문에 넣는 이미지는 <strong>JPG·PNG·WEBP·GIF</strong> 형식만 지원하며, 올릴 때 자동으로 압축되어 <strong>2MB 이내</strong>로 저장됩니다. 행사·공지 첨부파일은 <strong>1개당 3MB</strong>까지 올릴 수 있습니다.</li>
          <li><strong>글 수정·삭제</strong>: 글 상세 페이지의 <strong>수정 / 삭제</strong> 버튼으로 할 수 있으며, 누르면 비밀번호 확인창이 뜹니다. <strong>작성자 본인의 닉네임 비밀번호</strong> 또는 <strong>관리자 비밀번호</strong>를 입력해야 진행되며, 비밀번호가 일치하지 않으면 수정·삭제되지 않습니다. 따라서 자기가 쓴 글은 본인이, 그 외에는 관리자가 정리할 수 있습니다. (글을 다른 게시판으로 옮기는 <strong>이동</strong>은 관리자만 가능합니다.)</li>
          <li>게시글을 볼 때 <strong>본문 이미지를 누르면</strong> 전체화면 확대 보기(라이트박스)가 열립니다. 우측 상단의 버튼으로 <strong>전체화면 보기</strong>, <strong>이미지 다운로드</strong>, <strong>닫기</strong>를 할 수 있고, 배경을 누르거나 <strong>ESC</strong> 키로도 닫을 수 있습니다. 모바일에서는 <strong>두 손가락 핀치로 확대/축소</strong>하고 <strong>확대 후 한 손가락으로 끌어 이미지를 이동</strong>할 수 있으며, 더블탭으로도 확대됩니다. 전체화면 보기에서 가로형 이미지는 모바일에서 가로 모드로 회전해 화면에 꽉 차게 표시됩니다.</li>
          <li>도구 모음의 <strong>클립(파일 첨부)</strong> 버튼으로 <strong>HWP·PDF·ZIP·오피스 문서</strong> 등 일반 파일을 올릴 수 있습니다. 파일당 <strong>3MB</strong>까지 가능하며, 본문에는 클릭하면 내려받는 <strong>다운로드 카드</strong>로 표시됩니다. 파일 종류에 따라 아이콘이 달라집니다 — <strong>HWP·PDF·문서</strong>는 문서 아이콘, <strong>XLS·XLSX</strong>는 표(시트) 아이콘, <strong>ZIP</strong>은 압축파일 아이콘으로 표시됩니다.</li>
        </ul>

        <p className="mt-4">
          <strong>연재(이어쓰기)</strong>: 일반 글은 <strong>답글 형태로 다음 편을 이어 붙여</strong> 하나의 연재 시리즈로 묶을 수 있습니다.
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>글 상세 페이지 하단 <strong>연재</strong> 영역의 <strong>다음 편 작성</strong> 버튼을 누르면 그 글에 이어지는 새 글을 쓸 수 있습니다. <strong>누구나</strong> 이어서 작성할 수 있습니다.</li>
          <li>같은 연재의 모든 편이 <strong>작성순 목록</strong>으로 표시되며, 현재 보고 있는 편이 강조됩니다. <strong>이전 편 / 다음 편</strong> 버튼으로 바로 이동할 수 있습니다.</li>
          <li>연재는 <strong>같은 게시판 안에서만</strong> 묶입니다. 관리자가 글을 다른 게시판으로 옮기면 <strong>연결된 연재 전체가 함께 이동</strong>해 순서가 유지됩니다.</li>
        </ul>

        <p className="mt-4">
          <strong>이전글 / 다음글</strong>: 글 상세 페이지 하단에 <strong>이전글·다음글</strong> 버튼이 있어, 목록으로 돌아가지 않고도 글을 바로 넘겨볼 수 있습니다.
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li><strong>같은 게시판의 같은 종류 글</strong>끼리만 이동합니다(게시글은 게시글끼리, 공지는 공지끼리). 순서는 게시판 목록과 동일합니다.</li>
          <li>버튼에 이동할 글의 <strong>제목</strong>이 함께 표시되며, 맨 앞·맨 뒤 글에서는 해당 방향 버튼이 표시되지 않습니다.</li>
          <li><strong>모바일에서는 좌우 스와이프</strong>로도 넘길 수 있습니다. <strong>왼쪽으로 밀면 이전글</strong>, <strong>오른쪽으로 밀면 다음글</strong>로 이동합니다.</li>
          <li><strong>PC에서는 좌우 방향키</strong>로도 넘길 수 있습니다. <strong>→ 키는 다음글</strong>, <strong>← 키는 이전글</strong>로 이동합니다.</li>
        </ul>


      </Section>

      <Section id="copyright" icon={ShieldCheck} title="저작권 및 게시물 이용 안내">
        <p>
          게시글을 작성하는 화면에 들어가면 <strong>저작권 및 게시물 이용 안내</strong> 팝업이 먼저 표시됩니다.
          팝업 하단의 <strong>다시 보지 않기</strong>를 체크하고 확인하면 이 브라우저에서는 다음부터 표시되지 않습니다(체크하지 않고 닫으면 다음 글쓰기 때 다시 표시됩니다).
        </p>
        <ol className="ml-5 list-decimal space-y-2">
          <li>
            <strong>저작권의 귀속</strong> — 선생님께서 sendev.kr에 직접 기획·집필·개발하여 게시한 강의 원고, PPT, 소스 코드 등의 모든 저작권(저작인격권 및 저작재산권)은 본래의 개발자(집필 교사) 본인에게 있습니다.
          </li>
          <li>
            <strong>플랫폼 내 이용 허락</strong> — 원활한 서비스 제공을 위해, 등록된 게시물은 sendev.kr 플랫폼 내에서 노출·보관·커뮤니티 활성화를 위한 홍보 목적으로 무상 활용될 수 있습니다.
          </li>
          <li>
            <strong>코드의 공유와 면책</strong> — 본 커뮤니티는 선생님들의 자발적인 지식 공유를 지향합니다. 단, 공유된 소스 코드나 자료를 활용하여 발생하는 결과에 대한 책임은 전적으로 활용자 본인에게 있으며, 플랫폼 및 원작자는 법적 책임을 지지 않습니다. 올바른 공유 문화를 위해 오픈소스 라이선스(예: MIT, CC-BY 등) 표기를 권장합니다.
          </li>
        </ol>
      </Section>




      <Section id="unread" icon={Bell} title="읽지 않은 글 표시">
        <p>
          <strong>닉네임을 등록한 경우</strong>, 아직 읽지 않은 글을 한눈에 알 수 있도록 표시해 드립니다.
          닉네임을 설정하지 않았다면 이 표시는 나타나지 않습니다.
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>탭 메뉴</strong>: 상단 메뉴(또는 모바일 메뉴)의 <strong>해커톤·자료집·Dev Ground·Hello, World</strong> 옆에
            해당 탭에 속한 모든 게시판의 <strong>읽지 않은 일반 글 개수를 합산</strong>한 분홍색 숫자 배지가 표시됩니다.
          </li>
          <li>
            <strong>카테고리 카드</strong>: 각 게시판 카드 제목 옆에 <strong>읽지 않은 일반 글 개수</strong>가 분홍색 숫자
            배지로 표시됩니다. (산출물·링크는 세지 않고 일반 글만 셉니다.)
          </li>

          <li>
            <strong>글 목록</strong>: 아직 읽지 않은 글 제목 앞에 <strong>분홍색 점</strong>이 붙습니다. 상단 고정(공지) 글도
            포함됩니다. 글을 열어 보면 점이 사라집니다.
          </li>
          <li>
            <strong>기기 간 연동</strong>: 읽음 상태는 <strong>닉네임 기준으로 저장</strong>되므로, 같은 닉네임이라면 휴대폰에서
            읽은 글이 PC에서도 읽음으로 반영됩니다.
          </li>
          <li>비밀번호로 들어가는 게시판도 카드의 읽지 않은 글 개수는 표시됩니다.</li>
        </ul>
      </Section>

      <Section id="views" icon={Eye} title="조회수">
        <p>
          모든 게시판 유형(일반·비밀번호·산출물·링크)의 게시글에 <strong>조회수</strong>가 표시됩니다.
          닉네임 등록 여부와 무관하게 누구에게나 보입니다.
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>집계 방식</strong>: 게시글 상세 페이지에 들어갈 때마다 조회수가 1씩 올라갑니다.
            <strong>새로고침을 해도 다시 집계</strong>되며, 따로 중복을 제거하지 않습니다.
          </li>
          <li>
            <strong>표시 위치</strong>: 상세 페이지의 작성자·날짜 옆, 그리고 산출물·링크 카드에 표시됩니다.
            일반·고정(공지) 글 목록에서는 <strong>PC 화면에서만</strong> 조회수가 보이고, 모바일에서는 공간 절약을 위해 숨겨집니다.
          </li>
          <li>
            조회수는 <strong>읽음 표시·좋아요·댓글·평가와는 별개</strong>의 지표입니다.
            (예: 이미 읽은 글을 다시 열어도 조회수는 계속 올라갑니다.)
          </li>
        </ul>
      </Section>





      <Section id="links" icon={LinkIcon} title="본문 링크 미리보기">
        <p>
          게시글 본문에 링크를 <strong>한 줄에 단독으로</strong> 붙이면, 그 링크가 자동으로 미리보기 형태로 표시됩니다.
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li><strong>유튜브·비메오·캔바</strong> 링크: 본문에서 바로 재생·임베드되는 화면으로 표시됩니다.</li>
          <li><strong>캔바 링크</strong>는 종류에 따라 자동 구분됩니다. <strong>보기 전용 링크</strong>는 본문에 바로 임베드되어 미리 볼 수 있고, <strong>프로젝트(편집) 공유 링크</strong>는 임베드가 불가능하므로 <strong>캔바 아이콘</strong> 미리보기 카드로 표시됩니다.</li>
          <li><strong>구글 드라이브</strong> 링크: 구글 드라이브 아이콘이 있는 미리보기 카드로 표시됩니다.</li>
          <li><strong>그 외 모든 웹사이트</strong>(블로그, 뉴스, 깃허브 등): 썸네일 이미지 + 제목 + 사이트 주소가 담긴 미리보기 카드로 표시됩니다.</li>
          <li>대상 사이트가 미리보기 정보를 제공하지 않으면 썸네일 없이 제목·주소만, 그래도 안 되면 일반 링크로 표시됩니다.</li>

        </ul>
        <p className="text-sm text-muted-foreground">
          ※ 문장 중간에 들어간 링크는 미리보기 카드 없이 일반 텍스트 링크로 표시됩니다. 미리보기 카드를 원하면 링크만 한 줄에 따로 적어주세요.
        </p>
        <p className="text-sm text-muted-foreground">
          ※ 게시글의 <strong>공유</strong> 버튼으로 링크를 카카오톡·SNS 등에 공유하면, 미리보기에 <strong>게시글 제목</strong>이 표시됩니다. (카카오톡 등은 미리보기를 잠시 저장해 두므로, 새 글은 갱신에 약간 시간이 걸릴 수 있습니다.)
        </p>

      </Section>



      <Section id="search" icon={Search} title="검색 기능">
        <p>상단의 검색 아이콘으로 게시글을 찾을 수 있으며, 세 가지 검색 방식을 지원합니다.</p>
        <ul className="ml-5 list-disc space-y-1">
          <li><strong>제목</strong>: 글 제목에서 검색</li>
          <li><strong>제목+내용</strong>: 제목과 본문 내용을 함께 검색</li>
          <li><strong>작성자</strong>: 닉네임(작성자)으로 검색</li>
        </ul>
        <p className="mt-3">
          <strong>가이드 페이지 내 검색</strong>: 이 가이드 페이지 상단의 검색창에 단어를 입력하면 문서에서 일치하는 부분이 모두 강조됩니다. 같은 단어가 여러 곳에 있으면 <strong>다음(▼)·이전(▲) 버튼</strong>이나 <strong>Enter(다음)·Shift+Enter(이전)</strong>로 순차 이동할 수 있고, 마지막 위치에서는 처음으로 돌아갑니다.
        </p>
      </Section>

      <Section id="mypage" icon={UserRound} title="내 페이지에서 할 수 있는 것">
        <p>우측 상단 사람 아이콘으로 들어가는 <strong>내 페이지</strong>에서는 다음을 할 수 있습니다.</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>닉네임 비밀번호로 로그인</li>
          <li>내 레벨, 활동 점수, 보유 배지 확인</li>
          <li>내가 쓴 글·댓글, 받은 좋아요와 누른 좋아요 보기</li>
          <li>닉네임 변경 (레벨·배지·글·댓글·좋아요 모두 유지)</li>
          <li>복구 질문/답변 설정 (비밀번호 분실 대비)</li>
        </ul>
      </Section>

      <Section id="admin" icon={Settings} title="관리자 대시보드 접근">
        <p>
          관리자 기능은 우측 상단의 <strong>톱니바퀴(설정) 아이콘</strong>을 통해 접근합니다. 관리자 대시보드는
          권한이 있는 운영진만 사용할 수 있으며, <strong>관리자 비밀번호</strong>가 필요합니다. 사용자 프로필 관리는 시스템 관리자 비밀번호를 추가로 입력하여야 합니다.
        </p>
        <p>
          관리자는 카테고리·공지·일정 관리, 사용자 프로필/배지 관리, 평가 기준 설정 등 사이트 운영 전반을 담당합니다.
          모든 관리자 작업은 실행 시점에 서버에서 관리자 비밀번호를 다시 검증하므로, 비밀번호를 모르면 어떤 우회 방법으로도 관리자 기능을 사용할 수 없습니다.
        </p>
        <p>
          관리자 <strong>카테고리 목록</strong>은 폴더 구조로 정리됩니다. 폴더 행의 화살표를 눌러 펼치면
          그 폴더에 속한 하위 카테고리들이 들여쓰기되어 나타나고, 접으면 다시 숨겨집니다. 위/아래 순서 변경은
          <strong>같은 폴더 안(또는 최상위끼리)</strong>에서만 가능해, 폴더 경계를 넘어 이동하지 않습니다.
        </p>
        <p>
          각 폴더·게시판에는 <strong>목록에서 숨기기</strong> 설정이 있습니다. 켜면 해당 게시판이
          공개 목록에서 사라지지 않고 <strong>회색 비활성 상태로 표시</strong>되어 클릭해서 들어갈 수 없습니다
          (직접 링크로는 접근 가능). <strong>폴더를 숨기면 그 안의 하위 게시판도 함께 비활성</strong>으로
          표시됩니다. 운영 기간에 따라 특정 게시판(예: 입문형·도전형)을 잠시 막았다가 다시 열 때 사용하세요.
          숨겨진 게시판은 관리자 목록에서 <strong>눈 가림 아이콘</strong>과 "목록에서 숨김" 표시로 구분됩니다.
        </p>
        <p>
          평가자 명단은 닉네임을 하나씩 추가하는 <strong>추가</strong> 버튼과, 구글 시트·엑셀에서 복사한 닉네임을
          한 번에 붙여넣어 등록하는 <strong>일괄 추가</strong> 버튼을 제공합니다. 일괄 추가 창에서는 줄바꿈·쉼표·탭으로
          구분된 닉네임을 모두 인식하며, 이미 명단에 있는 닉네임은 자동으로 제외됩니다.
        </p>
        <p>
          각 게시판 카드의 <strong>작성자</strong> 버튼을 누르면 해당 게시판에 글을 쓴
          작성자 목록을 <strong>엑셀(.xlsx) 파일</strong>로 내려받을 수 있습니다. 파일에는
          작성자명, 작성 글 수, 최초/최근 작성일이 담기며, 글 수가 많은 작성자 순으로 정렬됩니다.
        </p>



      </Section>
      </div>

      <p className="flex items-center justify-center gap-2 pt-2 text-center text-xs text-muted-foreground">
        <ListChecks className="h-4 w-4" />
        이 가이드는 기능이 추가·변경될 때마다 함께 업데이트됩니다.
      </p>
    </div>
  );
}
