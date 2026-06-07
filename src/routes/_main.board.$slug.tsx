import { useEffect, useState } from "react";
import {
  createFileRoute,
  Link,
  Navigate,
  Outlet,
  useParams,
} from "@tanstack/react-router";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, FolderGit2, Lock } from "lucide-react";
import { toast } from "sonner";

import { categoriesQueryOptions } from "@/lib/platform.queries";
import { verifyBoardPassword } from "@/lib/platform.functions";
import type { TabGroup } from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/_main/board/$slug")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(categoriesQueryOptions()),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      카테고리을 불러오지 못했어요: {error.message}
    </div>
  ),
  component: BoardLayout,
});

function unlockKey(slug: string) {
  return `board-pw-${slug}`;
}


function BoardLayout() {
  const { slug } = useParams({ from: "/_main/board/$slug" });
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const category = categories.find((c) => c.slug === slug);

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


      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">{category.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {category.description || "설명이 없습니다."}
        </p>
      </div>

      {!mounted ? null : needsGate ? (
        <PasswordGate
          categoryId={category.id}
          onUnlock={() => {
            sessionStorage.setItem(unlockKey(category.id), "1");
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
  onUnlock: () => void;
}) {
  const verify = useServerFn(verifyBoardPassword);
  const [password, setPassword] = useState("");
  const mutation = useMutation({
    mutationFn: () => verify({ data: { categoryId, password } }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("입장했어요!");
        onUnlock();
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
          이 카테고리은 비밀번호가 필요해요.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <Input
          type="password"
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
