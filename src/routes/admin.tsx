import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, SlidersHorizontal, ShieldCheck, Lock, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

// 한글 자모/완성형 음절 제거 (영문 비밀번호 강제)
const stripKorean = (s: string) => s.replace(/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3]/g, "");

import { cn } from "@/lib/utils";

const ADMIN_PASSWORD = "sendev33";
const ADMIN_SESSION_KEY = "admin-access-granted";

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
  component: AdminGate,
});

function AdminGate() {
  const [granted, setGranted] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem(ADMIN_SESSION_KEY) === "1",
  );
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  if (granted) {
    return <AdminLayout />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value === ADMIN_PASSWORD) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      setGranted(true);
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl bg-card p-8 shadow-md"
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-center text-xl font-bold text-foreground">관리자 인증</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          관리자 비밀번호를 입력해 주세요.
        </p>
        <input
          type="password"
          autoFocus
          lang="en"
          inputMode="text"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(e) => {
            setValue(stripKorean(e.target.value));
            setError(false);
          }}
          onCompositionEnd={(e) => {
            setValue(stripKorean((e.target as HTMLInputElement).value));
          }}
          placeholder="영문 비밀번호를 입력해 주세요"
          className={cn(
            "mt-6 w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors",
            error ? "border-destructive focus:border-destructive" : "border-border focus:border-primary",
          )}
        />
        {error && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-destructive">
            <AlertCircle className="h-4 w-4" />
            비밀번호가 올바르지 않습니다. 다시 입력해 주세요.
          </p>
        )}
        <button
          type="submit"
          className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
        >
          입장하기
        </button>
        <Link
          to="/calendar"
          className="mt-3 block text-center text-sm text-muted-foreground hover:text-foreground"
        >
          메인으로 돌아가기
        </Link>
      </form>
    </div>
  );
}

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
