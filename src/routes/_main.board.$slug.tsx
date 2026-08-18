import { useEffect, useState } from "react";
import {
  createFileRoute,
  Link,
  Navigate,
  Outlet,
  useParams,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, FolderGit2, Lock, Search, X } from "lucide-react";
import { toast } from "sonner";

import { categoriesQueryOptions } from "@/lib/platform.queries";
import { verifyBoardPassword } from "@/lib/platform.functions";
import type { TabGroup } from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/PasswordInput";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const boardSearchSchema = z.object({
  qpage: fallback(z.number(), 1).default(1),
  gpage: fallback(z.number(), 1).default(1),
  ppage: fallback(z.number(), 1).default(1),
  psort: fallback(z.string(), "recent").default("recent"),
  parea: fallback(z.string(), "").default(""),
  vpage: fallback(z.number(), 1).default(1),
  q: fallback(z.string(), "").default(""),
});

export type BoardSearch = z.infer<typeof boardSearchSchema>;

export const Route = createFileRoute("/_main/board/$slug")({
  validateSearch: zodValidator(boardSearchSchema),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(categoriesQueryOptions()),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      카테고리을 불러오지 못했어요: {error.message}
    </div>
  ),
  component: BoardLayout,
});

function BoardSearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [input, setInput] = useState(value);

  useEffect(() => {
    setInput(value);
  }, [value]);

  useEffect(() => {
    if (input === value) return;
    const t = setTimeout(() => onChange(input), 250);
    return () => clearTimeout(t);
  }, [input]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="이 게시판에서 검색 (제목·작성자)"
        aria-label="게시판 내 검색"
        className="w-full min-w-0 rounded-xl border border-border bg-background py-2.5 pl-9 pr-9 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
      />
      {input.length > 0 && (
        <button
          type="button"
          onClick={() => setInput("")}
          aria-label="검색어 지우기"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function unlockKey(slug: string) {
  return `board-pw-${slug}`;
}

function BoardLayout() {
  const { slug } = useParams({ from: "/_main/board/$slug" });
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const category = categories.find((c) => c.slug === slug);
  const navigate = useNavigate({ from: "/board/$slug" });
  const { q } = Route.useSearch();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isIndex = pathname === `/board/${slug}/` || pathname === `/board/${slug}`;

  const [mounted, setMounted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (category) {
      const stored = sessionStorage.getItem(unlockKey(category.slug));
      setUnlocked(!!stored && stored.length > 0);
    }
    setMounted(true);
  }, [category]);

  // Legacy support: old URLs used the category UUID. Redirect to the slug.
  if (!category && UUID_RE.test(slug)) {
    const byId = categories.find((c) => c.id === slug);
    if (byId) {
      return (
        <Navigate to="/board/$slug" params={{ slug: byId.slug }} replace />
      );
    }
  }

  if (!category) {
    return (
      <div className="space-y-6">
        <BackLink />
        <EmptyState
          icon={FolderGit2}
          title="카테고리을 찾을 수 없어요."
          description="삭제되었거나 잘못된 주소일 수 있어요."
        />
      </div>
    );
  }

  const needsGate = category.hasPassword && !unlocked;

  return (
    <div className="space-y-6">
      <BackLink tab={category.tabGroup} />

      <div className="rounded-2xl bg-card p-4 shadow-sm">
        <h1 className="text-xl font-bold text-foreground">{category.name}</h1>
        {category.description && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {category.description}
          </p>
        )}
        {isIndex && (
          <div className="mt-3 border-t border-border pt-3">
            <div className="rounded-xl bg-muted/50 p-2">
              <BoardSearchBox
                value={q}
                onChange={(next) =>
                  navigate({
                    search: (prev: BoardSearch) => ({
                      ...prev,
                      q: next,
                      gpage: 1,
                      ppage: 1,
                    }),
                    replace: true,
                  })
                }
              />
            </div>
          </div>
        )}
      </div>

      {!mounted ? null : needsGate ? (
        <PasswordGate
          categoryId={category.id}
          onUnlock={(pw) => {
            // Store the verified password so board queries can pass it to the
            // server, which re-checks it before returning protected content.
            sessionStorage.setItem(unlockKey(category.slug), pw);
            setUnlocked(true);
          }}
        />
      ) : (
        <Outlet />
      )}
    </div>
  );
}

function PasswordGate({
  categoryId,
  onUnlock,
}: {
  categoryId: string;
  onUnlock: (password: string) => void;
}) {
  const verify = useServerFn(verifyBoardPassword);
  const [password, setPassword] = useState("");
  const mutation = useMutation({
    mutationFn: () => verify({ data: { categoryId, password } }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("입장했어요!");
        onUnlock(password);
      } else {
        toast.error("비밀번호가 올바르지 않아요.");
      }
    },
    onError: () => toast.error("확인 중 문제가 발생했어요."),
  });

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-card p-8 shadow-sm">
      <div className="mb-4 flex flex-col items-center text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">
          <Lock className="h-6 w-6" />
        </span>
        <h2 className="text-lg font-semibold text-foreground">비밀번호로 입장</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          이 카테고리는 비밀번호가 필요해요.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호 입력"
          className="rounded-xl"
          autoFocus
        />
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-xl active:scale-95"
        >
          {mutation.isPending ? "확인 중..." : "입장하기"}
        </Button>
      </form>
    </div>
  );
}

function BackLink({ tab }: { tab?: TabGroup }) {
  return (
    <Link
      to="/board"
      search={{ tab: tab ?? "hackathon" }}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:-translate-x-0.5 hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      카테고리 목록
    </Link>
  );
}
