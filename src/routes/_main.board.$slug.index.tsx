import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Megaphone, FolderGit2, User, Plus, MessageCircleQuestion, MessageCircle, Link as LinkIcon, Play, Layers, CheckCircle2, ChevronLeft, ChevronRight, Eye, PackageOpen } from "lucide-react";

import {
  postsQueryOptions,
  getBoardPassword,
  categoriesQueryOptions,
  ogImageBackfillQueryOptions,
  myReviewedPostIdsQueryOptions,
  profileMapQueryOptions,
  readPostIdsQueryOptions,
} from "@/lib/platform.queries";
import { useStoredIdentity } from "@/hooks/useNicknameIdentity";
import { type PostDTO, getLikeState } from "@/lib/platform.functions";
import { groupLinksBySeries, seededShuffle, getOrderSeed } from "@/lib/series";
import { getEmbedUrl, getThumbnailUrl, getCanvaPreviewUrl } from "@/lib/embed";
import { EmptyState } from "@/components/EmptyState";
import { AuthorBadge } from "@/components/AuthorBadge";
import { Button } from "@/components/ui/button";
import { ThumbnailUploadButton } from "@/components/ThumbnailUploadButton";
import { LikeButton } from "@/components/LikeButton";

const PAGE_SIZE = 10;

function toPage(value: unknown): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export const Route = createFileRoute("/_main/board/$slug/")({
  validateSearch: (search: Record<string, unknown>): { qpage: number; gpage: number; ppage: number } => ({
    qpage: toPage(search.qpage),
    gpage: toPage(search.gpage),
    ppage: toPage(search.ppage),
  }),
  loader: async ({ context, params }) => {
    const categories = await context.queryClient.ensureQueryData(
      categoriesQueryOptions(),
    );
    const category = categories.find((c) => c.slug === params.slug);
    context.queryClient.ensureQueryData(profileMapQueryOptions());
    if (category) {
      await context.queryClient.ensureQueryData(
        postsQueryOptions(category.id, getBoardPassword(params.slug)),
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
  const { data: posts } = useSuspenseQuery(postsQueryOptions(category.id, getBoardPassword(slug)));
  const { data: profileMap } = useSuspenseQuery(profileMapQueryOptions());
  const { qpage, gpage, ppage } = Route.useSearch();
  const navigate = useNavigate({ from: "/board/$slug" });
  const notices = posts.filter((p) => p.type === "post" && p.pinned);
  const generals = posts.filter((p) => p.type === "post" && !p.pinned);
  const projects = posts.filter((p) => p.type === "project");
  const links = posts.filter((p) => p.type === "link");
  const problems = posts.filter((p) => p.type === "problem");
  const linkItems = groupLinksBySeries(links);

  const generalPageCount = Math.max(1, Math.ceil(generals.length / PAGE_SIZE));
  const currentGPage = Math.min(gpage, generalPageCount);
  const pagedGenerals = generals.slice(
    (currentGPage - 1) * PAGE_SIZE,
    currentGPage * PAGE_SIZE,
  );

  // 문제ZIP 페이지네이션 — 대량(수백) 참여 시 렌더/좋아요 조회 부하를 페이지당으로 제한.
  const problemPageCount = Math.max(1, Math.ceil(problems.length / PAGE_SIZE));
  const currentPPage = Math.min(ppage, problemPageCount);
  const pagedProblems = problems.slice(
    (currentPPage - 1) * PAGE_SIZE,
    currentPPage * PAGE_SIZE,
  );

  // 현재 페이지 문제 카드들의 좋아요 상태를 1회로 배치 조회 (카드별 개별 호출 제거).
  const { identity: likeIdentity } = useStoredIdentity();
  const likerName = likeIdentity?.author ?? "";
  const fetchLikeState = useServerFn(getLikeState);
  const problemIds = pagedProblems.map((p) => p.id);
  const { data: problemLikeMap } = useQuery({
    queryKey: ["likeState", "post", "batch", slug, currentPPage, likerName, problemIds.join(",")],
    queryFn: () =>
      fetchLikeState({ data: { targetType: "post", targetIds: problemIds, likerName } }),
    enabled: problemIds.length > 0,
    staleTime: 30_000,
  });

  // 공정 평가를 위한 기기별 고정 랜덤 순서.
  // SSR/최초 렌더는 원본 순서(하이드레이션 안전), 마운트 후 셔플 적용.
  const [seed, setSeed] = useState<number | null>(null);
  const [reviewerName, setReviewerName] = useState("");
  useEffect(() => {
    setSeed(getOrderSeed());
    const saved = window.localStorage.getItem(`sendev:nickname:${slug}`);
    if (saved && saved.trim()) setReviewerName(saved.trim());
  }, [slug]);

  const orderedProjects = useMemo(
    () => (seed === null ? projects : seededShuffle(projects, seed)),
    [projects, seed],
  );

  const { data: reviewedIds = [] } = useQuery(
    myReviewedPostIdsQueryOptions(reviewerName),
  );
  const reviewedSet = useMemo(() => new Set(reviewedIds), [reviewedIds]);

  // 읽지 않은 글에 분홍 점 표시 — 닉네임이 등록된 경우에만.
  const { identity } = useStoredIdentity();
  const readerName = identity?.author ?? "";
  const { data: readIds = [] } = useQuery(readPostIdsQueryOptions(readerName));
  const readSet = useMemo(() => new Set(readIds), [readIds]);
  const hasReader = readerName.trim().length > 0;
  const isUnread = (id: string) => hasReader && !readSet.has(id);

  return (
    <div className="space-y-6">
      {category.enablePost && notices.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Megaphone className="h-5 w-5 text-primary" />
            고정 게시글
          </h2>
          {notices.map((n) => (
            <Link
              key={n.id}
              to="/board/$slug/$postNo"
              params={{ slug, postNo: String(n.postNo) }}
              className="flex items-center justify-between gap-5 rounded-2xl bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
            >
              <span className="flex flex-1 min-w-0 items-start gap-2">
                {isUnread(n.id) && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-pink-500" aria-label="읽지 않음" />
                )}
                <span className="min-w-0 line-clamp-2 text-sm font-medium text-foreground">{n.title}</span>
              </span>
              <span className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
                <span className="hidden sm:flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {n.viewCount}
                </span>
                {n.commentCount > 0 && (
                  <span className="flex items-center gap-1 text-primary">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {n.commentCount}
                  </span>
                )}
                <span className="flex flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-1">
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <User className="h-3.5 w-3.5" />
                    {n.author}
                    <AuthorBadge author={n.author} profileMap={profileMap} only="level" />
                  </span>
                  <AuthorBadge author={n.author} profileMap={profileMap} only="awards" />
                </span>
              </span>
            </Link>
          ))}
        </section>
      )}

      {category.enablePost && (
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
            <>
              {pagedGenerals.map((g) => (
                <Link
                  key={g.id}
                  to="/board/$slug/$postNo"
                  params={{ slug, postNo: String(g.postNo) }}
                  className="flex items-center justify-between gap-5 rounded-2xl bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                >
                  <span className="flex flex-1 min-w-0 items-start gap-2">
                    {isUnread(g.id) && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-pink-500" aria-label="읽지 않음" />
                    )}
                    <span className="min-w-0 line-clamp-2 text-sm font-medium text-foreground">{g.title}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
                    <span className="hidden sm:flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {g.viewCount}
                    </span>
                    {g.commentCount > 0 && (
                      <span className="flex items-center gap-1 text-primary">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {g.commentCount}
                      </span>
                    )}
                    <span className="flex flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-1">
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <User className="h-3.5 w-3.5" />
                        {g.author}
                        <AuthorBadge author={g.author} profileMap={profileMap} only="level" />
                      </span>
                      <AuthorBadge author={g.author} profileMap={profileMap} only="awards" />
                    </span>
                  </span>
                </Link>
              ))}
              <BoardPagination
                page={currentGPage}
                pageCount={generalPageCount}
                onChange={(p) =>
                  navigate({ search: (prev: { qpage: number; gpage: number }) => ({ ...prev, gpage: p }) })
                }
              />
            </>
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
              {orderedProjects.map((p) => (
                <ProjectCard
                  key={p.id}
                  post={p}
                  slug={slug}
                  reviewed={reviewedSet.has(p.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {category.enableLink && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <LinkIcon className="h-5 w-5 text-primary" />
              {category.linkName || "링크"}
            </h2>
            <Button asChild className="rounded-xl active:scale-95">
              <Link to="/board/$slug/new-link" params={{ slug }}>
                <Plus className="h-4 w-4" />
                {category.linkName || "링크"} 등록
              </Link>
            </Button>
          </div>

          {links.length === 0 ? (
            <EmptyState
              icon={LinkIcon}
              title={`아직 등록된 ${category.linkName || "링크"}이 없어요.`}
              description="링크를 공유하면 미리보기 썸네일이 표시돼요."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {linkItems.map((item) =>
                item.kind === "series" ? (
                  <SeriesCard
                    key={`series-${item.name}`}
                    name={item.name}
                    posts={item.posts}
                    slug={slug}
                  />
                ) : (
                  <LinkCard key={item.post.id} post={item.post} slug={slug} />
                ),
              )}
            </div>
          )}
        </section>
      )}

      {category.enableProblem && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <PackageOpen className="h-5 w-5 text-primary" />
              {category.problemName || "문제ZIP"}
            </h2>
            <Button asChild className="rounded-xl active:scale-95">
              <Link to="/board/$slug/new-problem" params={{ slug }}>
                <Plus className="h-4 w-4" />
                문제 제보하기
              </Link>
            </Button>
          </div>

          {problems.length === 0 ? (
            <EmptyState
              icon={PackageOpen}
              title="아직 제보된 문제가 없어요."
              description="현장에서 겪는 불편을 한 줄로 남겨주세요!"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {problems.map((post) => (
                <ProblemCard key={post.id} post={post} slug={slug} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ProblemCard({ post, slug }: { post: PostDTO; slug: string }) {
  const { data: profileMap } = useSuspenseQuery(profileMapQueryOptions());
  return (
    <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <Link
        to="/board/$slug/$postNo"
        params={{ slug, postNo: String(post.postNo) }}
        className="space-y-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          {post.problemArea && (
            <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-primary">
              {post.problemArea}
            </span>
          )}
          {post.problemFrequency && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {post.problemFrequency}
            </span>
          )}
        </div>
        <p className="text-base font-semibold leading-snug text-foreground">
          {post.title}
        </p>
      </Link>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          <AuthorBadge author={post.author} profileMap={profileMap} />
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5" />
            {post.commentCount}
          </span>
          <LikeButton targetType="post" targetId={post.id} size="sm" />
        </div>
      </div>
    </div>
  );
}


function BoardPagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  const pages: (number | "ellipsis")[] = [];
  const push = (p: number) => pages.push(p);
  if (pageCount <= 7) {
    for (let p = 1; p <= pageCount; p++) push(p);
  } else {
    push(1);
    const start = Math.max(2, page - 1);
    const end = Math.min(pageCount - 1, page + 1);
    if (start > 2) pages.push("ellipsis");
    for (let p = start; p <= end; p++) push(p);
    if (end < pageCount - 1) pages.push("ellipsis");
    push(pageCount);
  }

  const btnBase =
    "flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-sm font-medium transition-colors active:scale-95";

  return (
    <nav
      aria-label="페이지 이동"
      className="flex items-center justify-center gap-1.5 pt-2"
    >
      <button
        type="button"
        aria-label="이전 페이지"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={`${btnBase} bg-card text-foreground shadow-sm disabled:opacity-40`}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span
            key={`e-${i}`}
            className="flex h-9 w-9 items-center justify-center text-sm text-muted-foreground"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? "page" : undefined}
            onClick={() => onChange(p)}
            className={`${btnBase} shadow-sm ${
              p === page
                ? "bg-primary text-primary-foreground"
                : "bg-card text-foreground"
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        aria-label="다음 페이지"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        className={`${btnBase} bg-card text-foreground shadow-sm disabled:opacity-40`}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}


function SeriesCard({
  name,
  posts,
  slug,
}: {
  name: string;
  posts: PostDTO[];
  slug: string;
}) {
  // Use the first episode's cached thumbnail as the series cover.
  const cover = posts.find((p) => p.ogImageUrl)?.ogImageUrl ?? null;
  const fallbackThumb = getThumbnailUrl(posts[0]?.deployUrl);
  const ogImage = cover || fallbackThumb || null;

  return (
    <Link
      to="/board/$slug/series/$series"
      params={{ slug, series: name }}
      className="group block overflow-hidden rounded-2xl bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-95"
    >
      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-accent text-primary">
        {ogImage ? (
          <img
            src={ogImage}
            alt={`${name} 시리즈 미리보기`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <Layers className="h-10 w-10" />
        )}
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-foreground/75 px-2.5 py-1 text-xs font-medium text-background">
          <Layers className="h-3.5 w-3.5" />
          시리즈
        </span>
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-foreground">{name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          영상 {posts.length}개
        </p>
      </div>
    </Link>
  );
}



function LinkCard({ post, slug }: { post: PostDTO; slug: string }) {
  const { data: profileMap } = useSuspenseQuery(profileMapQueryOptions());
  const needsBackfill = !post.ogImageUrl && !!post.deployUrl;
  const { data: backfill } = useQuery(
    ogImageBackfillQueryOptions(needsBackfill ? post.id : "", post.deployUrl ?? ""),
  );
  const thumb = getThumbnailUrl(post.deployUrl);
  const ogImage = post.ogImageUrl || backfill?.image || thumb || null;
  const embeddable = !!getEmbedUrl(post.deployUrl);
  const canvaPreview = getCanvaPreviewUrl(post.deployUrl);

  return (
    <Link
      to="/board/$slug/$postNo"
      params={{ slug, postNo: String(post.postNo) }}
      className="group block overflow-hidden rounded-2xl bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-95"
    >
      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-accent text-primary">
        {canvaPreview ? (
          <iframe
            src={canvaPreview}
            title={`${post.title} 미리보기`}
            loading="lazy"
            tabIndex={-1}
            className="pointer-events-none h-full w-full border-0"
            allow="fullscreen"
          />
        ) : ogImage ? (
          <img
            src={ogImage}
            alt={`${post.title} 미리보기`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <LinkIcon className="h-10 w-10" />
        )}
        {embeddable && (
          <span className="absolute inset-0 flex items-center justify-center transition-colors group-hover:bg-foreground/10">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-background/85 text-primary shadow-md">
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </span>
          </span>
        )}
        <ThumbnailUploadButton
          postId={post.id}
          categoryId={post.categoryId}
          recommendedSize="1280×720px (16:9)"
        />

      </div>
      <div className="p-5">
        <h3 className="font-semibold text-foreground">{post.title}</h3>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {post.author}
            <AuthorBadge author={post.author} profileMap={profileMap} />
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {post.viewCount}
          </span>
        </p>
      </div>
    </Link>
  );
}

function ProjectCard({
  post,
  slug,
  reviewed = false,
}: {
  post: PostDTO;
  slug: string;
  reviewed?: boolean;
}) {
  const { data: profileMap } = useSuspenseQuery(profileMapQueryOptions());
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
      className="group block overflow-hidden rounded-2xl bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-95"
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
        <ThumbnailUploadButton
          postId={post.id}
          categoryId={post.categoryId}
          recommendedSize="1280×640px (가로형)"
        />
        {reviewed && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground shadow-sm">
            <CheckCircle2 className="h-3.5 w-3.5" />
            평가 완료
          </span>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-semibold text-foreground">{post.title}</h3>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {post.author}
            <AuthorBadge author={post.author} profileMap={profileMap} />
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {post.viewCount}
          </span>
        </p>
      </div>
    </Link>
  );
}
