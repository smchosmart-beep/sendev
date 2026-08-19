import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Code2, Settings, Trophy, BookOpen, Rocket, Terminal, Menu, Home, Search, UserRound, HelpCircle, ChevronUp, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  categoriesQueryOptions,
  postStubsQueryOptions,
  readPostIdsQueryOptions,
} from "@/lib/platform.queries";
import { useStoredIdentity } from "@/hooks/useNicknameIdentity";
import type { TabGroup } from "@/lib/platform.functions";



type SearchMode = "title" | "title_content" | "author";

const SEARCH_MODES: { value: SearchMode; label: string }[] = [
  { value: "title", label: "제목" },
  { value: "title_content", label: "제목+내용" },
  { value: "author", label: "작성자" },
];

function MenuSearchBox({ onSubmitted }: { onSubmitted?: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<SearchMode>("title");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = q.trim();
    if (!value) return;
    navigate({ to: "/search", search: { q: value, mode } });
    onSubmitted?.();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-2xl border border-border p-3">
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as SearchMode)}
        aria-label="검색 유형"
        className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
      >
        {SEARCH_MODES.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="게시글 검색"
          aria-label="검색어"
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          aria-label="검색"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm active:scale-95"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

export const Route = createFileRoute("/_main")({
  component: MainLayout,
});


const guideTab = { to: "/guide", label: "사용자 가이드", icon: HelpCircle } as const;
const homeTab = { to: "/home", label: "홈", icon: Home } as const;
const calendarTab = { to: "/calendar", label: "캘린더", icon: Calendar } as const;


const boardTabs: { group: TabGroup; label: string; icon: typeof Trophy }[] = [
  { group: "hackathon", label: "해커톤", icon: Trophy },
  { group: "resources", label: "자료집", icon: BookOpen },
  { group: "devground", label: "Dev Ground", icon: Rocket },
  { group: "helloworld", label: "Hello, World", icon: Terminal },
];

function TabUnreadBadge({ count, active }: { count: number; active?: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-bold leading-none",
        active ? "bg-white/25 text-primary-foreground" : "bg-pink-500 text-white",
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function MainLayout() {
  const location = useRouterState({ select: (s) => s.location });
  const pathname = location.pathname;
  const isGuide = pathname.startsWith("/guide");
  const isHome = pathname.startsWith("/home");
  const isCalendar = pathname.startsWith("/calendar");
  const isReadme = pathname.startsWith("/readme");

  const onBoardList = pathname === "/board";
  const activeGroup = (location.search as { tab?: TabGroup })?.tab ?? "hackathon";
  const [menuOpen, setMenuOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("sen-header-nav-collapsed");
    if (raw === "true") setNavCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("sen-header-nav-collapsed", String(navCollapsed));
  }, [navCollapsed]);

  // 탭별 미열람 글 수 합산: 닉네임이 등록된 경우에만 계산/표시.
  const { identity } = useStoredIdentity();
  const author = identity?.author ?? "";
  const { data: categories = [] } = useQuery(categoriesQueryOptions());
  const { data: stubs = [] } = useQuery({
    ...postStubsQueryOptions(),
    enabled: author.trim().length > 0,
  });
  const { data: readIds = [] } = useQuery(readPostIdsQueryOptions(author));

  const unreadByTab = useMemo(() => {
    const map: Record<TabGroup, number> = {
      hackathon: 0,
      resources: 0,
      devground: 0,
      helloworld: 0,
    };
    if (author.trim().length === 0) return map;
    const catTab = new Map<string, TabGroup>(
      categories.map((c) => [c.id, (c.tabGroup ?? "hackathon") as TabGroup]),
    );
    const readSet = new Set(readIds);
    for (const s of stubs) {
      if (s.type !== "post") continue;
      if (readSet.has(s.id)) continue;
      const tab = catTab.get(s.categoryId);
      if (tab && tab in map) map[tab] += 1;
    }
    return map;
  }, [author, categories, stubs, readIds]);


  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-card/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex w-full items-center justify-between px-6 py-4 lg:px-10 2xl:px-28">
          <Link to="/home" className="flex shrink-0 items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Code2 className="h-5 w-5" />
            </span>
            <span className="whitespace-nowrap text-sm font-bold text-foreground lg:text-base xl:text-xl">
              SEN DEV CONNECT
            </span>
          </Link>

          <nav
            className={cn(
              "min-w-0 flex-1 flex-nowrap items-center justify-center gap-2 overflow-hidden sm:gap-3 2xl:gap-4",
              navCollapsed ? "hidden" : "hidden sm:flex",
            )}
          >
            <Link
              to={guideTab.to}
              className={cn(
                "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-2xl px-2 py-2.5 text-sm font-medium transition-all duration-200 active:scale-95 sm:px-3 2xl:px-4",
                isGuide
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:-translate-y-0.5 hover:text-foreground",
              )}
            >
              <guideTab.icon className="h-4 w-4 shrink-0" />
              <span className={cn(isGuide ? "inline" : "hidden xl:inline")}>
                {guideTab.label}
              </span>
            </Link>

            <Link
              to={homeTab.to}
              className={cn(
                "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-2xl px-2 py-2.5 text-sm font-medium transition-all duration-200 active:scale-95 sm:px-3 2xl:px-4",
                isHome
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:-translate-y-0.5 hover:text-foreground",
              )}
            >
              <homeTab.icon className="h-4 w-4 shrink-0" />
              <span className={cn(isHome ? "inline" : "hidden xl:inline")}>
                {homeTab.label}
              </span>
            </Link>

            <Link
              to={calendarTab.to}
              className={cn(
                "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-2xl px-2 py-2.5 text-sm font-medium transition-all duration-200 active:scale-95 sm:px-3 2xl:px-4",
                isCalendar
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:-translate-y-0.5 hover:text-foreground",
              )}
            >
              <calendarTab.icon className="h-4 w-4 shrink-0" />
              <span className={cn(isCalendar ? "inline" : "hidden xl:inline")}>
                {calendarTab.label}
              </span>
            </Link>

            {boardTabs.map(({ group, label, icon: Icon }) => {
              const active = onBoardList && activeGroup === group;
              return (
                <Link
                  key={group}
                  to="/board"
                  search={{ tab: group }}
                  title={label}
                  className={cn(
                    "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-2xl px-2 py-2.5 text-sm font-medium transition-all duration-200 active:scale-95 sm:px-3 2xl:px-4",
                    active
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:-translate-y-0.5 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className={cn(active ? "inline" : "hidden xl:inline")}>
                    {label}
                  </span>
                  <TabUnreadBadge count={unreadByTab[group]} active={active} />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/search"
              search={{ q: "", mode: "title" }}
              aria-label="검색"
              className="hidden h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-95 sm:flex"
            >
              <Search className="h-5 w-5" />
            </Link>

            <Link
              to="/mypage"
              aria-label="내 페이지"
              className="hidden h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-95 sm:flex"
            >
              <span className="relative inline-flex">
                <UserRound className="h-5 w-5" />
                <span className="pointer-events-none absolute -bottom-1 -right-1.5 rounded-full bg-primary px-1 text-[8px] font-bold leading-[1.4] text-primary-foreground">my</span>
              </span>
            </Link>

            <Link
              to="/admin/categories"
              aria-label="관리자"
              className="hidden h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-95 sm:flex"
            >
              <Settings className="h-5 w-5" />
            </Link>

            <button
              type="button"
              aria-label={navCollapsed ? "메뉴 펼치기" : "메뉴 접기"}
              title={navCollapsed ? "메뉴 펼치기" : "메뉴 접기"}
              aria-pressed={navCollapsed}
              onClick={() => setNavCollapsed((v) => !v)}
              className="hidden h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-95 sm:flex"
            >
              {navCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
            </button>

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger
                aria-label="메뉴 열기"
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-sm active:scale-95 sm:hidden"
              >
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle>메뉴</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-2">
                  <Link
                    to={guideTab.to}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                      isGuide
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <guideTab.icon className="h-5 w-5" />
                    {guideTab.label}
                  </Link>

                  <Link
                    to={homeTab.to}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                      isHome
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <homeTab.icon className="h-5 w-5" />
                    {homeTab.label}
                  </Link>

                  <Link
                    to={calendarTab.to}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                      isCalendar
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <calendarTab.icon className="h-5 w-5" />
                    {calendarTab.label}
                  </Link>

                  {boardTabs.map(({ group, label, icon: Icon }) => {
                    const active = onBoardList && activeGroup === group;
                    return (
                      <Link
                        key={group}
                        to="/board"
                        search={{ tab: group }}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {label}
                        <TabUnreadBadge count={unreadByTab[group]} active={active} />
                      </Link>
                    );
                  })}

                  <div className="mt-2">
                    <MenuSearchBox onSubmitted={() => setMenuOpen(false)} />
                  </div>

                  <Link
                    to="/mypage"
                    onClick={() => setMenuOpen(false)}
                    className="mt-2 flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <span className="relative inline-flex">
                      <UserRound className="h-5 w-5" />
                      <span className="pointer-events-none absolute -bottom-1 -right-1.5 rounded-full bg-primary px-1 text-[8px] font-bold leading-[1.4] text-primary-foreground">my</span>
                    </span>
                    내 페이지
                  </Link>

                  <Link
                    to="/admin/categories"
                    onClick={() => setMenuOpen(false)}
                    className="mt-2 flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Settings className="h-5 w-5" />
                    관리자
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>



      <main
        className={cn(
          "mx-auto px-6 sm:px-12",
          isCalendar ? "max-w-[1800px] py-4" : isReadme ? "max-w-[1400px] py-8" : "max-w-5xl py-8",
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}
