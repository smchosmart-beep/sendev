import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, SlidersHorizontal, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "관리자 대시보드 — 교사 개발자 플랫폼" },
      {
        name: "description",
        content: "게시판(카테고리) 관리와 공용 비밀번호 설정을 위한 관리자 전용 대시보드.",
      },
    ],
  }),
  component: AdminLayout,
});

const tabs = [
  { to: "/admin/categories", label: "게시판 관리", icon: LayoutGrid },
  { to: "/admin/criteria", label: "평가 기준 관리", icon: SlidersHorizontal },
] as const;

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">관리자 대시보드</h1>
            <p className="text-sm text-muted-foreground">장학사님 및 관리자 전용 화면입니다.</p>
          </div>
          <Link
            to="/calendar"
            className="ml-auto rounded-xl bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
          >
            메인으로
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <nav className="mb-8 flex gap-2">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 active:scale-95",
                  active
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card text-muted-foreground hover:-translate-y-0.5 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <Outlet />
      </div>
    </div>
  );
}
