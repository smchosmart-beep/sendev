import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { Megaphone, FolderGit2, User, Plus, MessageCircleQuestion, MessageCircle } from "lucide-react";

import {
  postsQueryOptions,
  categoriesQueryOptions,
  ogImageBackfillQueryOptions,
} from "@/lib/platform.queries";
import { type PostDTO } from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_main/board/$slug/")({
  loader: async ({ context, params }) => {
    const categories = await context.queryClient.ensureQueryData(
      categoriesQueryOptions(),
    );
    const category = categories.find((c) => c.slug === params.slug);
    if (category) {
      await context.queryClient.ensureQueryData(
        postsQueryOptions(category.id),
      );
    }
  },
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      산출물을 불러오지 못했어요: {error.message}
    </div>
  ),
  component: BoardContent,
});

function BoardContent() {
  const { slug } = useParams({ from: "/_main/board/$slug/" });
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const category = categories.find((c) => c.slug === slug);

  if (!category) return null;
  return <BoardInner slug={slug} category={category} />;
}

function BoardInner({
  slug,
  category,
}: {
  slug: string;
  category: import("@/lib/platform.functions").CategoryDTO;
}) {
  const { data: posts } = useSuspenseQuery(postsQueryOptions(category.id));
  const notices = posts.filter((p) => p.type === "notice");
  const questions = posts.filter((p) => p.type === "question");
  const generals = posts.filter((p) => p.type === "general");
  const projects = posts.filter((p) => p.type === "project");

  return (
    <div className="space-y-6">
      {category.enableNotice && notices.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Megaphone className="h-5 w-5 text-primary" />
            공지사항
          </h2>
          {notices.map((n) => (
            <Link
              key={n.id}
              to="/board/$slug/$postNo"
              params={{ slug, postNo: String(n.postNo) }}
              className="flex items-center justify-between rounded-2xl bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
            >
              <span className="font-medium text-foreground">{n.title}</span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                {n.author}
              </span>
            </Link>
          ))}
        </section>
      )}

      {category.enableQuestion && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <MessageCircleQuestion className="h-5 w-5 text-primary" />
              질문게시판
            </h2>
            <Button asChild variant="secondary" className="rounded-xl active:scale-95">
              <Link to="/board/$slug/new-question" params={{ slug }}>
                <Plus className="h-4 w-4" />
                질문 등록
              </Link>
            </Button>
          </div>

          {questions.length === 0 ? (
            <EmptyState
              icon={MessageCircleQuestion}
              title="아직 등록된 질문이 없어요."
              description="궁금한 점을 자유롭게 질문해보세요."
            />
          ) : (
            questions.map((q) => (
              <Link
                key={q.id}
                to="/board/$slug/$postNo"
                params={{ slug, postNo: String(q.postNo) }}
                className="flex items-center justify-between rounded-2xl bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
              >
                <span className="font-medium text-foreground">{q.title}</span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  {q.author}
                </span>
              </Link>
            ))
          )}
        </section>
      )}

      {category.enableGeneral && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <MessageCircle className="h-5 w-5 text-primary" />
              {category.generalName || "일반게시판"}
            </h2>
            <Button asChild variant="secondary" className="rounded-xl active:scale-95">
              <Link to="/board/$slug/new-general" params={{ slug }}>
                <Plus className="h-4 w-4" />
                글 등록
              </Link>
            </Button>
          </div>

          {generals.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="아직 등록된 글이 없어요."
              description="자유롭게 글을 남겨보세요."
            />
          ) : (
            generals.map((g) => (
              <Link
                key={g.id}
                to="/board/$slug/$postNo"
                params={{ slug, postNo: String(g.postNo) }}
                className="flex items-center justify-between rounded-2xl bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
              >
                <span className="font-medium text-foreground">{g.title}</span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  {g.author}
                </span>
              </Link>
            ))
          )}
        </section>
      )}

      {category.enableProject && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <FolderGit2 className="h-5 w-5 text-primary" />
              {category.projectName || "산출물"}
            </h2>
            <Button asChild className="rounded-xl active:scale-95">
              <Link to="/board/$slug/new-project" params={{ slug }}>
                <Plus className="h-4 w-4" />
                {category.projectName || "산출물"} 등록
              </Link>
            </Button>
          </div>

          {projects.length === 0 ? (
            <EmptyState
              icon={FolderGit2}
              title={`아직 등록된 ${category.projectName || "산출물"}이 없어요. 첫 번째 개발자가 되어주세요!`}
              description="GitHub 링크와 함께 프로젝트를 공유해보세요."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <ProjectCard key={p.id} post={p} slug={slug} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ProjectCard({ post, slug }: { post: PostDTO; slug: string }) {
  // Prefer the cached OG image stored on the post. Only existing posts without a
  // cached value (and with a deploy URL) trigger a one-time backfill request,
  // which stores the result so future loads never hit the external site again.
  const needsBackfill = !post.ogImageUrl && !!post.deployUrl;
  const { data: backfill } = useQuery(
    ogImageBackfillQueryOptions(needsBackfill ? post.id : "", post.deployUrl ?? ""),
  );
  const ogImage = post.ogImageUrl || backfill?.image || null;

  return (
    <Link
      to="/board/$slug/$postNo"
      params={{ slug, postNo: String(post.postNo) }}
      className="block overflow-hidden rounded-2xl bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-95"
    >
      <div className="relative flex h-32 items-center justify-center overflow-hidden bg-accent text-primary">
        {ogImage ? (
          <img
            src={ogImage}
            alt={`${post.title} 배포 미리보기`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <FolderGit2 className="h-10 w-10" />
        )}
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-foreground">{post.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          {post.author}
        </p>
      </div>
    </Link>
  );
}
