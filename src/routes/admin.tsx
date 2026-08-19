import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, SlidersHorizontal, ShieldCheck, Lock, AlertCircle, CalendarDays, Home, UserCog, Eye, EyeOff, PackageOpen, ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

// 한글 자모/완성형 음절 제거 (영문 비밀번호 강제)
const stripKorean = (s: string) => s.replace(/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3]/g, "");

import { cn } from "@/lib/utils";
import { verifyAdmin } from "@/lib/platform.functions";
import { setAdminPassword, getAdminPassword } from "@/lib/admin-auth";

const ADMIN_SESSION_KEY = "admin-access-granted";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "관리자 대시보드 — 교사 개발자 플랫폼" },
      {
        name: "description",
        content: "카테고리 관리와 공용 비밀번호 설정을 위한 관리자 전용 대시보드.",
      },
    ],
  }),
  component: AdminGate,
});

function AdminGate() {
  const verify = useServerFn(verifyAdmin);
  const [mounted, setMounted] = useState(false);
  const [granted, setGranted] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    // Only treat the session as granted if the password is also still stored;
    // otherwise admin server calls would send an empty password and be rejected.
    setGranted(
      sessionStorage.getItem(ADMIN_SESSION_KEY) === "1" &&
        getAdminPassword().length > 0,
    );
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (granted) {
    return <AdminLayout />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checking) return;
    setChecking(true);
    setError(false);
    try {
      const res = await verify({ data: { password: value } });
      if (res.ok) {
        setAdminPassword(value);
        sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
        setGranted(true);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setChecking(false);
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
        <div className="relative mt-6">
          <input
            type={showPw ? "text" : "password"}
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
              "w-full rounded-xl border bg-background px-4 py-3 pr-12 text-sm text-foreground outline-none transition-colors",
              error ? "border-destructive focus:border-destructive" : "border-border focus:border-primary",
            )}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
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
  { to: "/admin/categories", label: "카테고리 관리", icon: LayoutGrid },
  { to: "/admin/home", label: "홈 화면 구성", icon: Home },
  { to: "/admin/calendar", label: "캘린더 관리", icon: CalendarDays },
  { to: "/admin/criteria", label: "평가 관리", icon: SlidersHorizontal },
  { to: "/admin/problem-options", label: "문제ZIP 선택지", icon: PackageOpen },
  { to: "/admin/profiles", label: "사용자 프로필 🔒", icon: UserCog },
] as const;


function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md sm:h-11 sm:w-11">
            <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground sm:text-xl">관리자 대시보드</h1>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">장학사님 및 관리자 전용 화면입니다.</p>
          </div>
          <Link
            to="/calendar"
            className="ml-auto shrink-0 whitespace-nowrap rounded-xl bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-95 sm:px-4"
          >
            메인으로
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <nav className="mb-6 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mb-8 sm:px-0 sm:pb-0">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200 active:scale-95 sm:px-5 sm:py-2.5",
                  active
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card text-muted-foreground hover:-translate-y-0.5 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
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
