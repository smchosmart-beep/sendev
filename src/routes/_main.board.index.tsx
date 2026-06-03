import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LayoutGrid, ArrowRight } from "lucide-react";

import { useAdminStore } from "@/lib/admin-store";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_main/board/")({
  head: () => ({
    meta: [
      { title: "게시판 — 교사 개발자 플랫폼" },
      { name: "description", content: "관리자가 만든 게시판별로 공지사항과 산출물을 확인하세요." },
    ],
  }),
  component: BoardListPage,
});

function BoardListPage() {
  const { categories, posts } = useAdminStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">게시판</h1>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="아직 등록된 게시판이 없어요."
          description="관리자 페이지에서 첫 번째 게시판을 만들어보세요!"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {categories.map((c) => {
            const count = posts.filter((p) => p.categoryId === c.id).length;
            return (
              <Link
                key={c.id}
                to="/board/$categoryId"
                params={{ categoryId: c.id }}
                className="group flex flex-col justify-between rounded-2xl bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-95"
              >
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{c.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {c.description || "설명이 없습니다."}
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between text-sm font-medium text-primary">
                  <span>게시글 {count}개</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
