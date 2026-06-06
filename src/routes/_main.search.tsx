import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Search, User, MessageCircle, FolderOpen } from "lucide-react";

import { searchPostsQueryOptions } from "@/lib/platform.queries";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SearchMode = "title" | "title_content" | "author";

const VALID_MODES: SearchMode[] = ["title", "title_content", "author"];

const MODE_LABELS: Record<SearchMode, string> = {
  title: "제목",
  title_content: "제목+내용",
  author: "작성자",
};

function normalizeMode(value: unknown): SearchMode {
  return VALID_MODES.includes(value as SearchMode)
    ? (value as SearchMode)
    : "title";
}

export const Route = createFileRoute("/_main/search")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { q: string; mode: SearchMode } => ({
    q: typeof search.q === "string" ? search.q : "",
    mode: normalizeMode(search.mode),
  }),
  head: () => ({
    meta: [
      { title: "검색 — SEN DEV CONNECT" },
      { name: "description", content: "전체 게시글을 제목, 내용, 작성자로 검색하세요." },
    ],
  }),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      검색에 실패했어요: {error.message}
    </div>
  ),
  component: SearchPage,
});

function SearchPage() {
  const { q, mode } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });

  const [input, setInput] = useState(q);
  const [modeInput, setModeInput] = useState<SearchMode>(mode);

  useEffect(() => {
    setInput(q);
  }, [q]);
  useEffect(() => {
    setModeInput(mode);
  }, [mode]);

  const { data: results = [], isFetching } = useQuery(
    searchPostsQueryOptions(q, mode),
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = input.trim();
    if (!value) return;
    navigate({ search: { q: value, mode: modeInput } });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">게시글 검색</h1>

      <form onSubmit={submit} className="space-y-3 rounded-2xl bg-card p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {VALID_MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModeInput(m)}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-medium transition-colors active:scale-95",
                modeInput === m
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="검색어를 입력하세요"
            aria-label="검색어"
            className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" className="rounded-xl active:scale-95">
            <Search className="h-4 w-4" />
            검색
          </Button>
        </div>
      </form>

      {q.trim().length === 0 ? (
        <EmptyState
          icon={Search}
          title="검색어를 입력해주세요."
          description="제목, 제목+내용, 작성자 기준으로 전체 게시글을 찾을 수 있어요."
        />
      ) : isFetching ? (
        <p className="text-sm text-muted-foreground">검색 중…</p>
      ) : results.length === 0 ? (
        <EmptyState
          icon={Search}
          title={`'${q}'에 대한 검색 결과가 없어요.`}
          description="다른 검색어나 검색 유형으로 다시 시도해보세요."
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            검색 결과 {results.length}건
          </p>
          {results.map((post) => (
            <Link
              key={post.id}
              to="/board/$slug/$postNo"
              params={{ slug: post.categorySlug, postNo: String(post.postNo) }}
              className="block rounded-2xl bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
            >
              <span className="line-clamp-2 text-sm font-medium text-foreground">
                {post.title}
              </span>
              <span className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FolderOpen className="h-3.5 w-3.5" />
                  {post.categoryName}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {post.author}
                </span>
                {post.commentCount > 0 && (
                  <span className="flex items-center gap-1 text-primary">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {post.commentCount}
                  </span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
