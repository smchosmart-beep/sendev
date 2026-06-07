import { useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { Calendar, Code2, Settings, Trophy, BookOpen, Rocket, Terminal, Menu, Home, Search, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { TabGroup } from "@/lib/platform.functions";
import { NicknameSetup } from "@/components/NicknameSetup";

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


const homeTab = { to: "/home", label: "홈", icon: Home } as const;
const calendarTab = { to: "/calendar", label: "캘린더", icon: Calendar } as const;


const boardTabs: { group: TabGroup; label: string; icon: typeof Trophy }[] = [
  { group: "hackathon", label: "해커톤", icon: Trophy },
  { group: "resources", label: "자료집", icon: BookOpen },
  { group: "devground", label: "Dev Ground", icon: Rocket },
  { group: "helloworld", label: "Hello, World", icon: Terminal },
];

function MainLayout() {
  const location = useRouterState({ select: (s) => s.location });
  const pathname = location.pathname;
  const isHome = pathname.startsWith("/home");
  const isCalendar = pathname.startsWith("/calendar");

  const onBoardList = pathname === "/board";
  const activeGroup = (location.search as { tab?: TabGroup })?.tab ?? "hackathon";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-card/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex w-full items-center gap-3 px-6 py-4 sm:gap-10 sm:px-28">
          <Link to="/home" className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Code2 className="h-5 w-5" />
            </span>
            <span className="text-xl font-bold text-foreground sm:text-xl">
              SEN DEV CONNECT
            </span>
          </Link>

          <nav className="mx-auto hidden flex-wrap justify-center gap-2 sm:flex sm:gap-7">
            <Link
              to={homeTab.to}
              className={cn(
                "flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium transition-all duration-200 active:scale-95",
                isHome
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:-translate-y-0.5 hover:text-foreground",
              )}
            >
              <homeTab.icon className="h-4 w-4" />
              {homeTab.label}
            </Link>

            <Link
              to={calendarTab.to}

              className={cn(
                "flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium transition-all duration-200 active:scale-95",
                isCalendar
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:-translate-y-0.5 hover:text-foreground",
              )}
            >
              <calendarTab.icon className="h-4 w-4" />
              {calendarTab.label}
            </Link>

            {boardTabs.map(({ group, label, icon: Icon }) => {
              const active = onBoardList && activeGroup === group;
              return (
                <Link
                  key={group}
                  to="/board"
                  search={{ tab: group }}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium transition-all duration-200 active:scale-95",
                    active
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:-translate-y-0.5 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <NicknameSetup variant="icon" />

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
            <UserRound className="h-5 w-5" />
          </Link>


          <Link
            to="/admin/categories"
            aria-label="관리자"
            className="hidden h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-95 sm:flex"
          >
            <Settings className="h-5 w-5" />
          </Link>


          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              aria-label="메뉴 열기"
              className="ml-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-sm active:scale-95 sm:hidden"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>메뉴</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-2">
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
                    </Link>
                  );
                })}

                <div className="mt-2">
                  <MenuSearchBox onSubmitted={() => setMenuOpen(false)} />
                </div>

                <div className="mt-2">
                  <NicknameSetup variant="menu" onOpened={() => setMenuOpen(false)} />
                </div>

                <Link
                  to="/mypage"
                  onClick={() => setMenuOpen(false)}
                  className="mt-2 flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <UserRound className="h-5 w-5" />
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
      </header>



      <main
        className={cn(
          "mx-auto px-6 sm:px-12",
          isCalendar ? "max-w-[1800px] py-4" : "max-w-5xl py-8",
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}
