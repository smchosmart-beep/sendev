import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Layers, User, Play } from "lucide-react";

import {
  postsQueryOptions,
  categoriesQueryOptions,
  ogImageBackfillQueryOptions,
} from "@/lib/platform.queries";
import { type PostDTO } from "@/lib/platform.functions";
import { sortSeriesPosts } from "@/lib/series";
import { getEmbedUrl, getThumbnailUrl } from "@/lib/embed";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_main/board/$slug/series/$series")({
  loader: async ({ context, params }) => {
    const categories = await context.queryClient.ensureQueryData(
      categoriesQueryOptions(),
    );
    const category = categories.find((c) => c.slug === params.slug);
    if (category) {
      await context.queryClient.ensureQueryData(postsQueryOptions(category.id));
    }
  },
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      시리즈를 불러오지 못했어요: {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-6 text-sm text-muted-foreground">
      시리즈를 찾을 수 없어요.
    </div>
  ),
  component: SeriesPage,
});

function SeriesPage() {
  const { slug, series } = useParams({
    from: "/_main/board/$slug/series/$series",
  });
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const category = categories.find((c) => c.slug === slug);

  if (!category) return null;
  return <SeriesInner slug={slug} series={series} categoryId={category.id} />;
}

function SeriesInner({
  slug,
  series,
  categoryId,
}: {
  slug: string;
  series: string;
  categoryId: string;
}) {
  const { data: posts } = useSuspenseQuery(postsQueryOptions(categoryId));
  const episodes = sortSeriesPosts(
    posts.filter((p) => p.type === "link" && p.series.trim() === series),
  );

  return (
    <div className="space-y-6">
      <Link
        to="/board/$slug"
        params={{ slug }}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:-translate-x-0.5 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        카테고리으로
      </Link>

      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Layers className="h-6 w-6 text-primary" />
          {series}
        </h1>
        <p className="text-sm text-muted-foreground">영상 {episodes.length}개</p>
      </div>

      {episodes.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="이 시리즈에 영상이 없어요."
          description="다른 시리즈를 확인해보세요."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {episodes.map((p) => (
            <EpisodeCard key={p.id} post={p} slug={slug} />
          ))}
        </div>
      )}
    </div>
  );
}

function EpisodeCard({ post, slug }: { post: PostDTO; slug: string }) {
  const needsBackfill = !post.ogImageUrl && !!post.deployUrl;
  const { data: backfill } = useQuery(
    ogImageBackfillQueryOptions(needsBackfill ? post.id : "", post.deployUrl ?? ""),
  );
  const thumb = getThumbnailUrl(post.deployUrl);
  const ogImage = post.ogImageUrl || backfill?.image || thumb || null;
  const embeddable = !!getEmbedUrl(post.deployUrl);

  return (
    <Link
      to="/board/$slug/$postNo"
      params={{ slug, postNo: String(post.postNo) }}
      className="group block overflow-hidden rounded-2xl bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-95"
    >
      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-accent text-primary">
        {ogImage ? (
          <img
            src={ogImage}
            alt={`${post.title} 미리보기`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <Layers className="h-10 w-10" />
        )}
        {embeddable && (
          <span className="absolute inset-0 flex items-center justify-center transition-colors group-hover:bg-foreground/10">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-background/85 text-primary shadow-md">
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </span>
          </span>
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
