import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { LayoutGrid, ArrowRight, Lock } from "lucide-react";

import { categoriesQueryOptions } from "@/lib/platform.queries";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_main/board/")({
  head: () => ({
    meta: [
      { title: "게시판 — 교사 개발자 플랫폼" },
      { name: "description", content: "관리자가 만든 게시판별로 공지사항과 산출물을 확인하세요." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(categoriesQueryOptions()),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      게시판을 불러오지 못했어요: {error.message}
    </div>
  ),
  component: BoardListPage,
});

function BoardListPage() {
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">게시판</h1>

      {categories.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="아직 등록된 게시판이 없어요."
          description="관리자 페이지에서 첫 번째 게시판을 만들어보세요!"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/board/$categoryId"
              params={{ categoryId: c.id }}
              className="group flex flex-col justify-between rounded-2xl bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-95"
            >
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  {c.name}
                  {c.hasPassword && <Lock className="h-4 w-4 text-muted-foreground" />}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {c.description || "설명이 없습니다."}
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between text-sm font-medium text-primary">
                <span>{c.hasPassword ? "비밀번호 입장" : "바로 입장"}</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
