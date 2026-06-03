import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Calendar, LayoutGrid, Code2, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_main")({
  component: MainLayout,
});

const tabs = [
  { to: "/calendar", label: "캘린더", icon: Calendar, match: "/calendar" },
  { to: "/board", label: "게시판", icon: LayoutGrid, match: "/board" },
] as const;

function MainLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isCalendar = pathname.startsWith("/calendar");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-card/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <Link to="/calendar" className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Code2 className="h-5 w-5" />
            </span>
            <span className="hidden text-base font-bold text-foreground sm:block">
              교사 개발자 플랫폼
            </span>
          </Link>

          <nav className="mx-auto flex gap-2">
            {tabs.map(({ to, label, icon: Icon, match }) => {
              const active = pathname.startsWith(match);
              return (
                <Link
                  key={to}
                  to={to}
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

          <Link
            to="/admin/categories"
            aria-label="관리자"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <main
        className={cn(
          "mx-auto px-6",
          isCalendar ? "max-w-[1800px] py-4" : "max-w-5xl py-8",
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}
