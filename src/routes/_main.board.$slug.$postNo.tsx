import { useState, useRef, useEffect, type ImgHTMLAttributes } from "react";
import {
  createFileRoute,
  Link,
  Navigate,
  useParams,
  useNavigate,
} from "@tanstack/react-router";
import {
  useSuspenseQuery,
  useQuery,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import {
  ArrowLeft,
  ArrowRight,
  User,
  Github,
  ExternalLink,
  FileText,
  Star,
  Loader2,
  Pencil,
  Trash2,
  Share2,
  MessageCircle,
  Eye,
  Layers,
  CornerDownRight,
  Maximize,
  Minimize,
  FolderInput,
  Download,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { LikeButton } from "@/components/LikeButton";

import {
  postQueryOptions,
  postByNoQueryOptions,
  getBoardPassword,
  categoriesQueryOptions,
  readmeQueryOptions,
  criteriaQueryOptions,
  reviewsQueryOptions,
  myReviewQueryOptions,
  myReviewedPostIdsQueryOptions,
  postsQueryOptions,
  postChainQueryOptions,
  commentsQueryOptions,
  profileMapQueryOptions,
  linkPreviewQueryOptions,
  canvaLinkQueryOptions,
  readPostIdsQueryOptions,
} from "@/lib/platform.queries";
import { stableEvalOrder, getOrderSeed } from "@/lib/series";
import {
  createReview,
  updatePost,
  deletePost,
  movePost,
  createComment,
  deleteComment,
  verifyPostPassword,
  markPostRead,
  incrementPostView,
  type PostDTO,
  type CommentDTO,
  type TabGroup,
} from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";
import { AuthorBadge } from "@/components/AuthorBadge";
import { CommentImagePicker } from "@/components/CommentImagePicker";
import { getEmbedUrl } from "@/lib/embed";
import { downloadFile } from "@/lib/download";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { getFileIcon } from "@/lib/file-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { PostEditor } from "@/components/PostEditor";
import { useNicknameIdentity, useStoredIdentity, useNicknameClaimed } from "@/hooks/useNicknameIdentity";

const NUMERIC_RE = /^\d+$/;

// Sanitization schema for post body HTML. Extends the safe defaults to keep the
// rich-text editor's inline formatting (color / font-size on <span>) while
// stripping event handlers (onerror/onclick/…), <script>, and other vectors.
const POST_HTML_SCHEMA = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "u"],
  attributes: {
    ...defaultSchema.attributes,
    span: [...(defaultSchema.attributes?.span ?? []), "style"],
    img: ["src", "alt", "title"],
  },
};

// Allows only safe link protocols; blocks javascript:, data:, etc.
function safeExternalHref(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url, "https://example.com");
    return u.protocol === "http:" || u.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

// Strips markdown/HTML from post content and trims to a share-friendly excerpt.
function toPlainExcerpt(content: string, max = 160): string {
  const text = (content ?? "")
    .replace(/<[^>]*>/g, " ") // HTML tags
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> text
    .replace(/[#>*_`~|-]/g, " ") // markdown symbols
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}


const TAB_LABELS: Record<TabGroup, string> = {
  hackathon: "해커톤",
  resources: "자료집",
  devground: "Dev Ground",
  helloworld: "Hello, World",
};
const TAB_ORDER: TabGroup[] = ["hackathon", "resources", "devground", "helloworld"];

export const Route = createFileRoute("/_main/board/$slug/$postNo")({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(profileMapQueryOptions());
    if (NUMERIC_RE.test(params.postNo)) {
      return context.queryClient.ensureQueryData(
        postByNoQueryOptions(params.slug, Number(params.postNo), getBoardPassword(params.slug)),
      );
    }
    return null;
  },
  head: ({ params, loaderData }) => {
    const post = loaderData as PostDTO | null;
    if (!post) return {};
    const title = `${post.title} — SEN _DEV_CONNECT`;
    const description = toPlainExcerpt(post.content);
    const url = `https://sendev.kr/board/${params.slug}/${params.postNo}`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: post.title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
    ];
    if (post.ogImageUrl) {
      meta.push({ property: "og:image", content: post.ogImageUrl });
      meta.push({ name: "twitter:image", content: post.ogImageUrl });
    }
    return { meta, links: [{ rel: "canonical", href: url }] };
  },
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      산출물을 불러오지 못했어요: {error.message}
    </div>
  ),
  component: PostDetailRoute,
});

function PostDetailRoute() {
  const { slug, postNo } = useParams({ from: "/_main/board/$slug/$postNo" });
  // Legacy URLs used the post UUID instead of the per-board number.
  if (!NUMERIC_RE.test(postNo)) {
    return <LegacyPostRedirect slug={slug} postId={postNo} />;
  }
  return <ProjectDetailPage slug={slug} postNo={Number(postNo)} />;
}

// Resolves an old UUID-based post link to its canonical short URL.
function LegacyPostRedirect({ slug, postId }: { slug: string; postId: string }) {
  const { data: post, isLoading } = useQuery(postQueryOptions(postId, getBoardPassword(slug)));
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        이동 중...
      </div>
    );
  }

  if (post) {
    const cat = categories.find((c) => c.id === post.categoryId);
    if (cat) {
      return (
        <Navigate
          to="/board/$slug/$postNo"
          params={{ slug: cat.slug, postNo: String(post.postNo) }}
          replace
        />
      );
    }
  }

  return (
    <div className="space-y-6">
      <BackLink slug={slug} />
      <EmptyState
        icon={FileText}
        title="산출물을 찾을 수 없어요."
        description="삭제되었거나 잘못된 주소일 수 있어요."
      />
    </div>
  );
}

function ProjectDetailPage({ slug, postNo }: { slug: string; postNo: number }) {
  const { data: post } = useSuspenseQuery(postByNoQueryOptions(slug, postNo, getBoardPassword(slug)));
  const { data: profileMap } = useSuspenseQuery(profileMapQueryOptions());

  // 닉네임이 등록된 경우, 상세 진입 시 글을 읽음으로 기록(기기 간 연동).
  // useRef 가드로 StrictMode/리렌더 중복 호출 방지.
  const { identity } = useStoredIdentity();
  const queryClient = useQueryClient();
  const markRead = useServerFn(markPostRead);
  const markedRef = useRef<string | null>(null);
  const readerName = (identity?.author ?? "").trim();
  const currentPostId = post?.id ?? null;
  useEffect(() => {
    if (!currentPostId || readerName.length === 0) return;
    if (markedRef.current === currentPostId) return;
    markedRef.current = currentPostId;
    markRead({ data: { author: readerName, postId: currentPostId } })
      .then(() => {
        queryClient.invalidateQueries({
          queryKey: ["read-post-ids", readerName.toLowerCase()],
        });
        queryClient.invalidateQueries({ queryKey: ["post-stubs"] });
      })
      .catch(() => {
        markedRef.current = null;
      });
  }, [currentPostId, readerName, markRead, queryClient]);

  // 조회수 증가: 상세 진입(새로고침 포함)마다 +1. useRef 가드는 StrictMode
  // 이중 렌더만 차단하며, 새로고침은 재마운트라 가드가 리셋되어 정상 집계된다.
  // 표시는 낙관적 업데이트 없이 해당 글 쿼리만 invalidate해 서버 값으로 동기화.
  const incrementView = useServerFn(incrementPostView);
  const viewedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentPostId) return;
    if (viewedRef.current === currentPostId) return;
    viewedRef.current = currentPostId;
    incrementView({ data: { postId: currentPostId } })
      .then(() => {
        queryClient.invalidateQueries({
          queryKey: ["post-by-no", slug, postNo],
        });
        queryClient.invalidateQueries({ queryKey: ["post", currentPostId] });
      })
      .catch(() => {
        viewedRef.current = null;
      });
  }, [currentPostId, incrementView, queryClient, slug, postNo]);

  if (!post) {
    return (
      <div className="space-y-6">
        <BackLink slug={slug} />
        <EmptyState
          icon={FileText}
          title="산출물을 찾을 수 없어요."
          description="삭제되었거나 잘못된 주소일 수 있어요."
        />
      </div>
    );
  }

  const isBoardPost = post.type === "post";
  const isLink = post.type === "link";
  const embedUrl = isLink ? getEmbedUrl(post.deployUrl) : null;

  return (
    <div className="space-y-6">
      <BackLink slug={slug} />

      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <h1 className="text-xl font-bold text-foreground break-words sm:text-2xl">{post.title}</h1>
          <ManagePost post={post} slug={slug} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            {post.author}
            <AuthorBadge author={post.author} profileMap={profileMap} size="md" />
          </span>
          <span>
            {new Date(post.createdAt).toLocaleString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="h-4 w-4" />
            {post.viewCount.toLocaleString("ko-KR")}
          </span>
          {!isLink && safeExternalHref(post.githubUrl) && (
            <a
              href={safeExternalHref(post.githubUrl)!}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Github className="h-4 w-4" />
              GitHub 저장소
            </a>
          )}
          {safeExternalHref(post.deployUrl) && (
            <a
              href={safeExternalHref(post.deployUrl)!}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              {isLink ? "원본 링크" : "배포 사이트"}
            </a>
          )}
        </div>

        {isBoardPost && (
          <article className="post-content prose prose-sm mt-6 max-w-none break-words border-t border-border pt-6 [&_a]:break-words [&_a]:[overflow-wrap:anywhere] prose-headings:text-foreground prose-p:text-foreground prose-a:text-primary prose-a:no-underline prose-strong:text-foreground prose-code:text-primary prose-li:text-foreground prose-table:text-foreground">
            {post.content.trim() ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, [rehypeSanitize, POST_HTML_SCHEMA]]}
                components={{
                  img: ({ node, ...props }) => <BodyImage {...props} />,
                  a: ({ node, className, ...props }) => (
                    <a
                      {...props}
                      className={`break-words [overflow-wrap:anywhere] ${className ?? ""}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                  p: ({ node, children, ...props }) => {
                    const href = soleLinkHref(node);
                    if (href) {
                      if (isPostFileHref(href)) {
                        return <FileCard href={href} name={soleLinkText(node)} />;
                      }
                      if (isCanvaHref(href)) {
                        return <CanvaLinkCard href={href} />;
                      }
                      const embedUrl = getEmbedUrl(href);
                      if (embedUrl) {
                        return <EmbeddedFrame embedUrl={embedUrl} href={href} />;
                      }
                      return <LinkPreviewCard href={href} />;
                    }
                    return <p {...props}>{children}</p>;
                  },
                }}
              >
                {post.content}
              </ReactMarkdown>
            ) : (
              <p className="text-sm text-muted-foreground">내용이 없어요.</p>
            )}
          </article>
        )}
      </div>

      <div className="flex items-center gap-2">
        <LikeButton targetType="post" targetId={post.id} />
      </div>


      {isLink && (
        <LinkEmbedSection
          embedUrl={embedUrl}
          deployUrl={post.deployUrl}
          ogImageUrl={post.ogImageUrl}
          title={post.title}
        />
      )}

      {!isBoardPost && !isLink && (
        <>
          <ReadmeSection githubUrl={post.githubUrl} />
          <EvaluationSection categoryId={post.categoryId} postId={post.id} slug={slug} />
        </>
      )}

      {isBoardPost && <SeriesChainSection post={post} slug={slug} />}

      {isBoardPost && <CommentsSection postId={post.id} />}
    </div>
  );
}

// 답글로 이어지는 연재(체인)를 글 상세 하단에 표시한다. 같은 연재의 모든 편을
// 작성순으로 보여주고, 현재 편을 강조하며 이전/다음 편으로 이동할 수 있다.
function SeriesChainSection({ post, slug }: { post: PostDTO; slug: string }) {
  const { data: chain } = useQuery(postChainQueryOptions(post.id));
  const episodes = chain ?? [];
  const currentIndex = episodes.findIndex((e) => e.id === post.id);
  const prev = currentIndex > 0 ? episodes[currentIndex - 1] : null;
  const next =
    currentIndex >= 0 && currentIndex < episodes.length - 1
      ? episodes[currentIndex + 1]
      : null;
  const hasSeries = episodes.length > 1;

  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Layers className="h-5 w-5 text-primary" />
          연재 {hasSeries ? `(${episodes.length}편)` : ""}
        </h2>
        <Button asChild size="sm" className="rounded-xl active:scale-95">
          <Link
            to="/board/$slug/new-general"
            params={{ slug }}
            search={{ parent: post.postNo }}
          >
            <CornerDownRight className="h-4 w-4" />
            다음 편 작성
          </Link>
        </Button>
      </div>

      {hasSeries && (
        <>
          <ol className="mt-4 space-y-1.5">
            {episodes.map((ep, i) => {
              const isCurrent = ep.id === post.id;
              return (
                <li key={ep.id}>
                  <Link
                    to="/board/$slug/$postNo"
                    params={{ slug, postNo: String(ep.postNo) }}
                    className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                      isCurrent
                        ? "bg-accent font-medium text-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    }`}
                  >
                    <span className="shrink-0 tabular-nums text-primary">{i + 1}.</span>
                    <span className="break-words">{ep.title}</span>
                  </Link>
                </li>
              );
            })}
          </ol>

          <div className="mt-4 flex items-center justify-between gap-2">
            {prev ? (
              <Button asChild variant="secondary" size="sm" className="rounded-xl active:scale-95">
                <Link to="/board/$slug/$postNo" params={{ slug, postNo: String(prev.postNo) }}>
                  <ArrowLeft className="h-4 w-4" />
                  이전 편
                </Link>
              </Button>
            ) : (
              <span />
            )}
            {next ? (
              <Button asChild variant="secondary" size="sm" className="rounded-xl active:scale-95">
                <Link to="/board/$slug/$postNo" params={{ slug, postNo: String(next.postNo) }}>
                  다음 편
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <span />
            )}
          </div>
        </>
      )}
    </section>
  );
}



function LinkEmbedSection({
  embedUrl,
  deployUrl,
  ogImageUrl,
  title,
}: {
  embedUrl: string | null;
  deployUrl: string;
  ogImageUrl: string;
  title: string;
}) {
  if (embedUrl) {
    return (
      <section className="overflow-hidden rounded-2xl bg-card shadow-sm">
        <div className="aspect-video w-full">
          <iframe
            src={embedUrl}
            title={title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm">
      {ogImageUrl ? (
        <img
          src={ogImageUrl}
          alt={`${title} 미리보기`}
          loading="lazy"
          className="aspect-video w-full rounded-xl object-cover"
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-accent text-primary">
          <ExternalLink className="h-10 w-10" />
        </div>
      )}
      {safeExternalHref(deployUrl) && (
        <Button asChild className="mt-4 w-full rounded-xl active:scale-95">
          <a href={safeExternalHref(deployUrl)!} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            링크 바로가기
          </a>
        </Button>
      )}
    </section>
  );
}

// Detects a markdown paragraph whose only meaningful child is a single link,
// and returns its href (regardless of provider).
function soleLinkHref(node: unknown): string | null {
  const n = node as
    | { children?: Array<{ tagName?: string; properties?: { href?: string }; type?: string; value?: string }> }
    | undefined;
  const children = (n?.children ?? []).filter(
    (c) => !(c.type === "text" && !(c.value ?? "").trim()),
  );
  if (children.length !== 1) return null;
  const only = children[0];
  if (only.tagName !== "a") return null;
  const href = only.properties?.href;
  if (!href || !/^https?:\/\//i.test(href)) return null;
  return href;
}

// Returns the visible text of a sole link paragraph (used as the file name).
function soleLinkText(node: unknown): string {
  const n = node as
    | { children?: Array<{ tagName?: string; children?: Array<{ value?: string }> }> }
    | undefined;
  const only = (n?.children ?? []).find((c) => c.tagName === "a");
  return (only?.children ?? []).map((c) => c.value ?? "").join("").trim();
}

// A standalone link pointing at the post-files bucket is a downloadable
// attachment, not an OG-preview link.
function isPostFileHref(href: string): boolean {
  return /\/post-files\//.test(href);
}

// Renders an uploaded attachment as a download card.
function FileCard({ href, name }: { href: string; name: string }) {
  const fileName = name || "첨부파일";
  const ext = (fileName.match(/\.([a-zA-Z0-9]{1,10})$/)?.[1] ?? "FILE").toUpperCase();
  const FileIcon = getFileIcon(fileName);
  return (
    <button
      type="button"
      onClick={() => downloadFile(href, fileName)}
      className="my-4 flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left no-underline shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
        <FileIcon className="h-6 w-6" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold text-foreground">{fileName}</span>
        <span className="text-xs text-muted-foreground">{ext} 파일</span>
      </span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Download className="h-4 w-4" />
      </span>
    </button>
  );
}

// Renders a post-body image that opens a full-screen lightbox on click.
function BodyImage({
  src,
  alt,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const [open, setOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fsImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (!src) return null;

  const fileName = (() => {
    try {
      const path = new URL(src, window.location.href).pathname;
      const last = path.split("/").filter(Boolean).pop();
      return last ? decodeURIComponent(last) : "image";
    } catch {
      return "image";
    }
  })();

  const enterFullscreen = async () => {
    const el = wrapperRef.current;
    if (!el?.requestFullscreen) return;
    try {
      await el.requestFullscreen();
      // 가로형 이미지는 모바일에서 가로 모드로 회전해 꽉 차게 표시
      const img = fsImgRef.current;
      const orientation = screen.orientation as
        | (ScreenOrientation & { lock?: (o: string) => Promise<void> })
        | undefined;
      if (
        img &&
        img.naturalWidth > img.naturalHeight &&
        orientation?.lock
      ) {
        try {
          await orientation.lock("landscape");
        } catch {
          /* iOS Safari 등 미지원 환경 무시 */
        }
      }
    } catch {
      /* 전체화면 미지원 환경 무시 */
    }
  };

  const exitFullscreen = async () => {
    try {
      const orientation = screen.orientation as
        | (ScreenOrientation & { unlock?: () => void })
        | undefined;
      orientation?.unlock?.();
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* 무시 */
    }
  };

  return (
    <>
      <img
        {...props}
        src={src}
        alt={alt ?? ""}
        loading="lazy"
        onClick={() => setOpen(true)}
        className="cursor-zoom-in rounded-xl"
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="flex h-screen w-screen max-w-none flex-col items-center justify-center border-0 bg-black/90 p-0 shadow-none sm:max-w-none sm:rounded-none [&>button]:hidden"
        >
          <DialogTitle className="sr-only">{alt || "이미지 확대"}</DialogTitle>
          <DialogDescription className="sr-only">
            전체화면으로 확대된 이미지입니다. 닫으려면 ESC를 누르거나 배경을 클릭하세요.
          </DialogDescription>

          {/* 우측 상단 어두운 영역의 버튼들 */}
          <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={() => (isFullscreen ? exitFullscreen() : enterFullscreen())}
              aria-label={isFullscreen ? "전체화면 나가기" : "전체화면 보기"}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white opacity-80 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => downloadFile(src, fileName)}
              aria-label="이미지 다운로드"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white opacity-80 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="닫기"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white opacity-80 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            ref={wrapperRef}
            className="flex h-full w-full items-center justify-center overflow-hidden bg-black/90"
          >
            <TransformWrapper
              key={open ? "open" : "closed"}
              doubleClick={{ mode: "toggle", step: 2 }}
              wheel={{ step: 0.2 }}
              pinch={{ step: 5 }}
              minScale={1}
              maxScale={6}
              centerOnInit
            >
              <TransformComponent
                wrapperStyle={{
                  width: "100%",
                  height: "100%",
                  touchAction: "none",
                }}
                contentStyle={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  ref={fsImgRef}
                  src={src}
                  alt={alt ?? ""}
                  draggable={false}
                  className={
                    isFullscreen
                      ? "h-screen w-screen object-contain"
                      : "max-h-[82vh] max-w-[92vw] w-auto rounded-lg object-contain"
                  }
                />
              </TransformComponent>
            </TransformWrapper>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


// Renders an OG-style preview card for an arbitrary link placed alone in a
// post body. Falls back to a plain link when no metadata is available.
function GoogleDriveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 87.3 78" className={className} aria-hidden="true">
      <path
        d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z"
        fill="#0066da"
      />
      <path
        d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5C.4 49.9 0 51.45 0 53h27.5z"
        fill="#00ac47"
      />
      <path
        d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 11.5z"
        fill="#ea4335"
      />
      <path
        d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.95 0H34.35c-1.55 0-3.1.45-4.45 1.2z"
        fill="#00832d"
      />
      <path
        d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.45 1.2h50.9c1.55 0 3.1-.45 4.45-1.2z"
        fill="#2684fc"
      />
      <path
        d="M73.4 26.5l-12.75-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z"
        fill="#ffba00"
      />
    </svg>
  );
}

// Canva brand mark (simplified inline SVG, no extra dependency).
function CanvaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#00C4CC" />
      <circle cx="24" cy="24" r="24" fill="url(#canva-grad)" />
      <defs>
        <linearGradient id="canva-grad" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#823AF3" />
          <stop offset="0.5" stopColor="#4B66E1" />
          <stop offset="1" stopColor="#01F1C4" />
        </linearGradient>
      </defs>
      <text
        x="24"
        y="32"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="22"
        fontStyle="italic"
        fill="#ffffff"
      >
        C
      </text>
    </svg>
  );
}

// True for Canva share links (short canva.link links and canva.com design links).
function isCanvaHref(href: string): boolean {
  try {
    const host = new URL(href).hostname.replace(/^www\./, "").toLowerCase();
    if (host === "canva.link") return true;
    if (host === "canva.com")
      return new URL(href).pathname.includes("/design/");
    return false;
  } catch {
    return false;
  }
}

function LinkPreviewCard({ href }: { href: string }) {
  const { data, isLoading } = useQuery(linkPreviewQueryOptions(href));
  let hostname = href;
  try {
    hostname = new URL(href).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }
  const isGoogleDrive =
    hostname === "drive.google.com" || hostname === "docs.google.com";
  const isCanva = isCanvaHref(href);
  const brandIcon = isGoogleDrive
    ? GoogleDriveIcon
    : isCanva
      ? CanvaIcon
      : null;
  const title = data?.title || hostname;
  const siteName = data?.siteName || hostname;
  const image = data?.image || null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="my-4 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 no-underline shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center"
    >
      <span className="flex aspect-video w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent text-primary sm:w-56">
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : brandIcon ? (
          (() => {
            const Brand = brandIcon;
            return <Brand className="h-12 w-12" />;
          })()
        ) : (
          <ExternalLink className="h-8 w-8" />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-1 pb-1 sm:px-2">
        <span className="line-clamp-2 font-semibold text-foreground">
          {isLoading ? "미리보기 불러오는 중…" : title}
        </span>
        <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          {brandIcon ? (
            (() => {
              const Brand = brandIcon;
              return <Brand className="h-3.5 w-3.5 shrink-0" />;
            })()
          ) : (
            <ExternalLink className="h-3 w-3 shrink-0" />
          )}
          {siteName}
        </span>
      </span>
    </a>
  );
}


// Renders an embedded player (Canva/YouTube/Vimeo) inline within post content,
// with a small link to open the original below it.
function EmbeddedFrame({ embedUrl, href }: { embedUrl: string; href: string }) {
  return (
    <span className="my-4 block">
      <span className="block overflow-hidden rounded-2xl bg-card shadow-sm">
        <span className="block aspect-video w-full">
          <iframe
            src={embedUrl}
            title="임베드 미리보기"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </span>
      </span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        원본 링크 열기
      </a>
    </span>
  );
}

function ManagePost({ post, slug }: { post: PostDTO; slug: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const update = useServerFn(updatePost);
  const remove = useServerFn(deletePost);
  const move = useServerFn(movePost);
  const verify = useServerFn(verifyPostPassword);
  const canMove = post.type === "post";
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const category = categories.find((c) => c.id === post.categoryId);
  const projectName = category?.projectName || "산출물";
  const linkName = category?.linkName || "링크";

  const postId = post.id;
  const categoryId = post.categoryId;
  const isBoardPost = post.type === "post";
  const noun = isBoardPost
    ? post.pinned
      ? "공지"
      : "글"
    : post.type === "link"
      ? linkName
      : projectName;

  const [editGateOpen, setEditGateOpen] = useState(false);
  const [editGatePw, setEditGatePw] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Move flow state
  const [moveGateOpen, setMoveGateOpen] = useState(false);
  const [moveGatePw, setMoveGatePw] = useState("");
  const [movePickOpen, setMovePickOpen] = useState(false);
  const [moveTab, setMoveTab] = useState<TabGroup | null>(null);
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);


  // Edit form state
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [author, setAuthor] = useState(post.author);
  const [pinned, setPinned] = useState(post.pinned);
  const [githubUrl, setGithubUrl] = useState(post.githubUrl);
  const [deployUrl, setDeployUrl] = useState(post.deployUrl);
  const [editPw, setEditPw] = useState("");
  const [deletePw, setDeletePw] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["post-by-no", slug, post.postNo] });
    queryClient.invalidateQueries({ queryKey: ["post", postId] });
    queryClient.invalidateQueries({ queryKey: ["posts", categoryId] });
  };

  // Verify the password first, then open the edit form with fields prefilled.
  const editGateMutation = useMutation({
    mutationFn: () => verify({ data: { id: postId, password: editGatePw } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("비밀번호가 일치하지 않아요.");
        return;
      }
      setTitle(post.title);
      setContent(post.content);
      setAuthor(post.author);
      setPinned(post.pinned);
      setGithubUrl(post.githubUrl);
      setDeployUrl(post.deployUrl);
      setEditPw(editGatePw);
      setEditGateOpen(false);
      setEditOpen(true);
    },
    onError: () => toast.error("확인 중 문제가 발생했어요."),
  });

  const openEditGate = () => {
    setEditGatePw("");
    setEditGateOpen(true);
  };

  const editMutation = useMutation({
    mutationFn: () =>
      update({
        data: isBoardPost
          ? { id: postId, password: editPw, title, content, author, pinned }
          : { id: postId, password: editPw, title, author, githubUrl, deployUrl },
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("비밀번호가 일치하지 않아요.");
        return;
      }
      invalidate();
      toast.success(`${noun}이(가) 수정되었어요!`);
      setEditOpen(false);
    },
    onError: () => toast.error("수정 중 문제가 발생했어요."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => remove({ data: { id: postId, password: deletePw } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("비밀번호가 일치하지 않아요.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["posts", categoryId] });
      toast.success(`${noun}이(가) 삭제되었어요.`);
      setDeleteOpen(false);
      navigate({ to: "/board/$slug", params: { slug } });
    },
    onError: () => toast.error("삭제 중 문제가 발생했어요."),
  });

  // Move flow: verify the admin password, then open the target picker.
  const moveVerifyMutation = useMutation({
    mutationFn: () => verify({ data: { id: postId, password: moveGatePw } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("관리자 비밀번호가 일치하지 않아요.");
        return;
      }
      setMoveTab(null);
      setMoveTargetId(null);
      setMoveGateOpen(false);
      setMovePickOpen(true);
    },
    onError: () => toast.error("확인 중 문제가 발생했어요."),
  });

  const moveMutation = useMutation({
    mutationFn: () =>
      move({
        data: {
          id: postId,
          password: moveGatePw,
          targetCategoryId: moveTargetId ?? "",
        },
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("이동에 실패했어요. 관리자 비밀번호를 확인해주세요.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["posts", categoryId] });
      if (moveTargetId) {
        queryClient.invalidateQueries({ queryKey: ["posts", moveTargetId] });
      }
      toast.success("게시글을 이동했어요!");
      setMovePickOpen(false);
      if (res.slug && res.postNo) {
        navigate({
          to: "/board/$slug/$postNo",
          params: { slug: res.slug, postNo: String(res.postNo) },
        });
      }
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "이동 중 문제가 발생했어요."),
  });

  const openMoveGate = () => {
    setMoveGatePw("");
    setMoveGateOpen(true);
  };

  // Boards in the selected tab, excluding current. Post type is ignored —
  // posts can move to any board.
  const moveTargets = categories.filter(
    (c) =>
      c.id !== categoryId &&
      c.tabGroup === moveTab &&
      c.enablePost,
  );
  const tabsWithBoards = TAB_ORDER.filter((tab) =>
    categories.some(
      (c) =>
        c.id !== categoryId &&
        c.tabGroup === tab &&
        c.enablePost,
    ),
  );


  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("게시글 링크가 복사되었어요!");
    } catch {
      toast.error("링크 복사에 실패했어요.");
    }
  };

  return (
    <div className="flex shrink-0 gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={openEditGate}
        className="rounded-xl active:scale-95"
      >
        <Pencil className="h-4 w-4" />
        수정
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => {
          setDeletePw("");
          setDeleteOpen(true);
        }}
        className="rounded-xl active:scale-95"
      >
        <Trash2 className="h-4 w-4" />
        삭제
      </Button>
      {canMove && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={openMoveGate}
          className="rounded-xl active:scale-95"
        >
          <FolderInput className="h-4 w-4" />
          이동
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleShare}
        className="rounded-xl active:scale-95"
      >
        <Share2 className="h-4 w-4" />
        공유
      </Button>

      {/* Move password gate dialog */}
      <Dialog open={moveGateOpen} onOpenChange={setMoveGateOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>게시글 이동</DialogTitle>
            <DialogDescription>
              관리자 비밀번호를 입력해야 다른 게시판으로 이동할 수 있어요.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!moveGatePw.trim()) {
                toast.error("관리자 비밀번호를 입력해주세요.");
                return;
              }
              moveVerifyMutation.mutate();
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-2">
              <Label htmlFor="mv-pw">관리자 비밀번호</Label>
              <PasswordInput
                id="mv-pw"
                value={moveGatePw}
                onChange={(e) => setMoveGatePw(e.target.value)}
                className="rounded-xl"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMoveGateOpen(false)}
                className="rounded-xl active:scale-95"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={moveVerifyMutation.isPending}
                className="rounded-xl active:scale-95"
              >
                {moveVerifyMutation.isPending ? "확인 중..." : "확인"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Move target picker dialog */}
      <Dialog open={movePickOpen} onOpenChange={setMovePickOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>이동할 게시판 선택</DialogTitle>
            <DialogDescription>
              탭 메뉴와 게시판을 차례대로 선택하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>탭 메뉴</Label>
              <div className="flex flex-wrap gap-2">
                {tabsWithBoards.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    이동할 수 있는 게시판이 없어요.
                  </p>
                )}
                {tabsWithBoards.map((tab) => (
                  <Button
                    key={tab}
                    type="button"
                    size="sm"
                    variant={moveTab === tab ? "default" : "secondary"}
                    onClick={() => {
                      setMoveTab(tab);
                      setMoveTargetId(null);
                    }}
                    className="rounded-xl active:scale-95"
                  >
                    {TAB_LABELS[tab]}
                  </Button>
                ))}
              </div>
            </div>

            {moveTab && (
              <div className="space-y-2">
                <Label>게시판</Label>
                <div className="flex flex-col gap-2">
                  {moveTargets.map((c) => (
                    <Button
                      key={c.id}
                      type="button"
                      variant={moveTargetId === c.id ? "default" : "secondary"}
                      onClick={() => setMoveTargetId(c.id)}
                      className="justify-start rounded-xl active:scale-95"
                    >
                      {c.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setMovePickOpen(false)}
              className="rounded-xl active:scale-95"
            >
              취소
            </Button>
            <Button
              type="button"
              disabled={!moveTargetId || moveMutation.isPending}
              onClick={() => moveMutation.mutate()}
              className="rounded-xl active:scale-95"
            >
              {moveMutation.isPending ? "이동 중..." : "이동하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Edit password gate dialog */}
      <Dialog open={editGateOpen} onOpenChange={setEditGateOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{noun} 수정</DialogTitle>
            <DialogDescription>
              {post.pinned
                ? "관리자 비밀번호를 입력해야 수정할 수 있어요."
                : "작성자의 닉네임 비밀번호를 입력해야 수정할 수 있어요."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editGatePw.trim()) {
                toast.error("비밀번호를 입력해주세요.");
                return;
              }
              editGateMutation.mutate();
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-2">
              <Label htmlFor="eg-pw">비밀번호</Label>
              <PasswordInput
                id="eg-pw"
                value={editGatePw}
                onChange={(e) => setEditGatePw(e.target.value)}
                className="rounded-xl"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                작성자의 닉네임 비밀번호 또는 관리자 비밀번호를 입력하세요.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditGateOpen(false)}
                className="rounded-xl active:scale-95"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={editGateMutation.isPending}
                className="rounded-xl active:scale-95"
              >
                {editGateMutation.isPending ? "확인 중..." : "확인"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto overflow-x-hidden rounded-2xl">
          <DialogHeader>
            <DialogTitle>{noun} 수정</DialogTitle>
            <DialogDescription>
              내용을 수정한 뒤 저장하세요.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim() || (!isBoardPost && !author.trim())) {
                toast.error("제목과 작성자를 입력해주세요.");
                return;
              }
              editMutation.mutate();
            }}
            className="min-w-0 space-y-4 py-2"
          >
            <div className="space-y-2">
              <Label htmlFor="e-title">제목</Label>
              <Input
                id="e-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl"
              />
            </div>
            {isBoardPost ? (
              <>
                <div className="space-y-2">
                  <Label>내용</Label>
                  <PostEditor value={content} onChange={setContent} rows={8} />
                </div>
                {post.type === "post" && (
                  <div className="space-y-2">
                    <Label htmlFor="e-author">작성자</Label>
                    <Input
                      id="e-author"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                )}
                {post.type === "post" && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="e-pinned"
                      checked={pinned}
                      onCheckedChange={(v) => setPinned(v === true)}
                    />
                    <Label
                      htmlFor="e-pinned"
                      className="cursor-pointer text-sm font-normal text-muted-foreground"
                    >
                      상단 고정(공지)
                    </Label>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="e-author">작성자</Label>
                  <Input
                    id="e-author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e-github">GitHub 링크</Label>
                  <Input
                    id="e-github"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e-deploy">배포 URL (선택)</Label>
                  <Input
                    id="e-deploy"
                    value={deployUrl}
                    onChange={(e) => setDeployUrl(e.target.value)}
                    placeholder="https://my-app.lovable.app"
                    className="rounded-xl"
                  />
                </div>
              </>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditOpen(false)}
                className="rounded-xl active:scale-95"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={editMutation.isPending}
                className="rounded-xl active:scale-95"
              >
                {editMutation.isPending ? "수정 중..." : "수정"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{noun} 삭제</DialogTitle>
            <DialogDescription>
              작성자의 닉네임 비밀번호를 입력하면 삭제돼요. 이 작업은 되돌릴 수
              없어요.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!deletePw.trim()) {
                toast.error("비밀번호를 입력해주세요.");
                return;
              }
              deleteMutation.mutate();
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-2">
              <Label htmlFor="d-pw">비밀번호</Label>
              <PasswordInput
                id="d-pw"
                value={deletePw}
                onChange={(e) => setDeletePw(e.target.value)}
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                작성자의 닉네임 비밀번호 또는 관리자 비밀번호를 입력하세요.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeleteOpen(false)}
                className="rounded-xl active:scale-95"
              >
                취소
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={deleteMutation.isPending}
                className="rounded-xl active:scale-95"
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReadmeSection({ githubUrl }: { githubUrl: string }) {
  const { data, isLoading } = useQuery(readmeQueryOptions(githubUrl));

  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
        <FileText className="h-5 w-5 text-primary" />
        README
      </h2>
      {!githubUrl ? (
        <p className="text-sm text-muted-foreground">등록된 GitHub 링크가 없어요.</p>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          README를 불러오는 중...
        </div>
      ) : data?.error ? (
        <p className="text-sm text-muted-foreground">{data.error}</p>
      ) : (
        <article className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-primary prose-li:text-foreground prose-table:text-foreground">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ node, ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" />
              ),
            }}
          >
            {data?.markdown ?? ""}
          </ReactMarkdown>
        </article>
      )}
    </section>
  );
}

function EvaluationSection({
  categoryId,
  postId,
  slug,
}: {
  categoryId: string;
  postId: string;
  slug: string;
}) {
  const queryClient = useQueryClient();
  const { data: criteria = [] } = useQuery(
    criteriaQueryOptions(categoryId, true),
  );
  const { data: reviews = [] } = useQuery(reviewsQueryOptions(postId));
  const create = useServerFn(createReview);
  const { identity, save: saveIdentity } = useStoredIdentity();

  const [scores, setScores] = useState<Record<string, number>>({});
  const [reviewerName, setReviewerName] = useState("");
  const [nicknamePassword, setNicknamePassword] = useState("");
  const [nicknamePasswordConfirm, setNicknamePasswordConfirm] = useState("");
  // 서버에 아직 등록되지 않은 닉네임(처음 사용)일 때만 확인 입력을 한 번 더 받는다.
  const { claimed: reviewerClaimed } = useNicknameClaimed(reviewerName);
  const reviewPwIsNew = !reviewerClaimed;

  // 저장된 닉네임 비밀번호를 자동으로 채워, 한 번 등록하면 평가에서도 재입력하지 않게 한다.
  useEffect(() => {
    if (identity?.nicknamePassword) {
      setNicknamePassword((prev) => (prev ? prev : identity.nicknamePassword));
    }
  }, [identity]);

  // 이 기기에서 마지막으로 사용한 닉네임을 기본값으로만 채운다(고정하지 않음).
  const storageKey = `sendev:nickname:${slug}`;
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(storageKey);
    if (saved && saved.trim()) {
      setReviewerName((prev) => (prev ? prev : saved.trim()));
    }
  }, [storageKey]);

  // 이름 입력에 디바운스를 적용해 과도한 조회를 막는다.
  const [debouncedName, setDebouncedName] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedName(reviewerName.trim()), 500);
    return () => clearTimeout(t);
  }, [reviewerName]);

  const { data: myReview } = useQuery(
    myReviewQueryOptions(postId, debouncedName),
  );
  const alreadyReviewed = myReview?.found ?? false;
  const myReviewDate =
    alreadyReviewed && myReview?.createdAt
      ? new Date(myReview.createdAt).toLocaleDateString("ko-KR", {
          month: "long",
          day: "numeric",
        })
      : null;

  // 저장된 본인 점수를 별점에 다시 채워, 제출/재방문 시 "내가 준 별점"이 보이도록 한다.
  // 사용자가 아직 폼을 건드리지 않은 경우에만 채워 입력 중 값을 덮어쓰지 않는다.
  const touchedRef = useRef(false);
  useEffect(() => {
    if (touchedRef.current) return;
    if (myReview?.found && myReview.scores) {
      setScores(myReview.scores);
    }
  }, [myReview]);


  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          postId,
          reviewerName: reviewerName.trim(),
          nicknamePassword: nicknamePassword.trim(),
          scores,
        },
      }),
    onSuccess: (res: { ok: boolean; updated?: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ["reviews", postId] });
      queryClient.invalidateQueries({ queryKey: ["my-review", postId] });
      queryClient.invalidateQueries({ queryKey: ["my-reviewed"] });
      // 이 기기에 이 카테고리의 닉네임을 기본값으로 저장한다(다음 입력 시 자동 채움).
      const name = reviewerName.trim();
      if (typeof window !== "undefined" && name) {
        window.localStorage.setItem(storageKey, name);
      }
      // 닉네임+비밀번호를 식별자 저장소에 저장해 다음 평가/글/댓글에서 자동 채움.
      if (name) saveIdentity(name, nicknamePassword.trim());
      toast.success(
        res?.updated ? "평가가 갱신되었어요!" : "평가를 제출했어요!",
      );
      // 방금 매긴 별점을 유지해 "반영 안 됨"으로 보이지 않게 한다.
      // 이후 my-review 재조회로 저장된 점수가 다시 채워진다.
      touchedRef.current = false;
    },
    onError: (err: unknown) =>
      toast.error(
        err instanceof Error ? err.message : "제출 중 문제가 발생했어요.",
      ),
  });


  const averages = criteria.map((c) => {
    const vals = reviews
      .map((r) => r.scores[c.id])
      .filter((v): v is number => typeof v === "number");
    const avg =
      vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    return { criterion: c, avg, count: vals.length };
  });

  // 연속 평가용: 기기별 고정 랜덤 순서로 다음 평가할 산출물을 계산한다.
  const { data: allPosts = [] } = useQuery(postsQueryOptions(categoryId, getBoardPassword(slug)));
  const { data: categories = [] } = useQuery(categoriesQueryOptions());
  const category = categories.find((c) => c.id === categoryId);
  const evalOpen = category?.evalOpen ?? false;
  const evalSeed = category?.evalSeed ?? 0;
  const [orderSeed, setOrderSeed] = useState<number | null>(null);
  useEffect(() => {
    setOrderSeed(getOrderSeed());
  }, []);
  const reviewerForList = debouncedName;
  const { data: reviewedIds = [] } = useQuery(
    myReviewedPostIdsQueryOptions(reviewerForList),
  );
  const projectCount = allPosts.filter((p) => p.type === "project").length;
  const hasMultipleProjects = projectCount > 1;
  const nextProjectNo = (() => {
    if (orderSeed === null) return null;
    const projects = allPosts.filter((p) => p.type === "project");
    if (projects.length <= 1) return null;
    const ordered = stableEvalOrder(projects, orderSeed, evalSeed);
    const currentIdx = ordered.findIndex((p) => p.id === postId);
    if (currentIdx === -1) return null;
    // 방금 제출한 현재 글 포함, 이미 평가한 산출물 집합
    const reviewedSet = new Set<string>([...reviewedIds, postId]);
    for (let step = 1; step <= ordered.length; step++) {
      const cand = ordered[(currentIdx + step) % ordered.length];
      if (cand.id === postId) continue;
      if (!reviewedSet.has(cand.id)) return cand.postNo;
    }
    return null;
  })();



  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
        <Star className="h-5 w-5 text-primary" />
        평가
      </h2>

      {criteria.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          이 카테고리은 아직 평가 기준이 설정되지 않았어요.
        </p>
      ) : (
        <div className="space-y-8">
          {/* 요약 */}
          {reviews.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                평가 요약 ({reviews.length}명 참여)
              </h3>
              <div className="space-y-2">
                {averages.map(({ criterion, avg }) => (
                  <div
                    key={criterion.id}
                    className="flex items-center justify-between rounded-xl bg-muted px-4 py-2 text-sm"
                  >
                    <span className="text-foreground">{criterion.criterionName}</span>
                    <span className="font-semibold text-primary">
                      {avg !== null ? avg.toFixed(1) : "-"} / {criterion.maxScore}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 제출 폼 (관리자가 평가를 개시한 경우에만) */}
          {!evalOpen ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center">
              <p className="text-sm font-medium text-foreground">
                🔒 아직 평가가 시작되지 않았어요.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                관리자가 평가를 개시하면 별점을 매길 수 있어요.
              </p>
            </div>
          ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!reviewerName.trim()) {
                toast.error("닉네임을 입력해주세요.");
                return;
              }
              if (!nicknamePassword.trim()) {
                toast.error("닉네임 비밀번호를 입력해주세요.");
                return;
              }
              if (
                reviewPwIsNew &&
                nicknamePassword.trim() !== nicknamePasswordConfirm.trim()
              ) {
                toast.error("닉네임 비밀번호가 일치하지 않아요.");
                return;
              }
              for (const c of criteria) {
                if (!scores[c.id] || scores[c.id] <= 0) {
                  toast.error("모든 항목에 별점을 매겨주세요.");
                  return;
                }
              }
              mutation.mutate();
            }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="reviewer-name">닉네임</Label>
              <Input
                id="reviewer-name"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="닉네임을 입력하세요"
                maxLength={100}
              />
              {debouncedName ? (
                alreadyReviewed ? (
                  <p className="text-xs font-medium text-primary">
                    ✅ 이미 평가하셨어요
                    {myReviewDate ? ` · ${myReviewDate} 제출` : ""} (점수를 새로
                    매겨 다시 제출하면 갱신돼요)
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    아직 평가하지 않으셨어요.
                  </p>
                )
              ) : null}
              <p className="text-xs text-muted-foreground">
                닉네임은 중복 평가 방지용이므로 흔하지 않은 것으로 정해주세요. 같은 닉네임으로 다시 제출하면 비밀번호 확인 후 평가가 갱신됩니다.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reviewer-pw">닉네임 비밀번호</Label>
              <PasswordInput
                id="reviewer-pw"
                value={nicknamePassword}
                onChange={(e) => setNicknamePassword(e.target.value)}
                placeholder="닉네임 비밀번호"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                닉네임을 처음 쓰면 비밀번호가 등록되고, 다음부터 같은 비밀번호로 본인 확인을 해요. 글·댓글과 같은 비밀번호를 사용합니다.
              </p>
            </div>
            {reviewPwIsNew && (
              <div className="space-y-2">
                <Label htmlFor="reviewer-pw-confirm">닉네임 비밀번호 확인</Label>
                <PasswordInput
                  id="reviewer-pw-confirm"
                  value={nicknamePasswordConfirm}
                  onChange={(e) => setNicknamePasswordConfirm(e.target.value)}
                  placeholder="비밀번호를 한 번 더 입력"
                  maxLength={100}
                />
                {nicknamePasswordConfirm.length > 0 &&
                  nicknamePassword.trim() !== nicknamePasswordConfirm.trim() && (
                    <p className="text-xs text-destructive">
                      비밀번호가 일치하지 않아요.
                    </p>
                  )}
              </div>
            )}
            {criteria.map((c) => (
              <div key={c.id} className="space-y-2">
                <Label className="flex items-center gap-2">
                  {c.criterionName}{" "}
                  <span className="text-xs text-muted-foreground">
                    (0.5점 단위 · 만점 {c.maxScore})
                  </span>
                </Label>
                <StarRating
                  max={c.maxScore}
                  value={scores[c.id] ?? 0}
                  onChange={(v) => {
                    touchedRef.current = true;
                    setScores((prev) => ({ ...prev, [c.id]: v }));
                  }}
                />

              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="rounded-xl active:scale-95"
              >
                {mutation.isPending
                  ? "제출 중..."
                  : alreadyReviewed
                    ? "평가 수정"
                    : "평가 제출"}
              </Button>
              {alreadyReviewed && nextProjectNo !== null && (
                <Button
                  asChild
                  variant="secondary"
                  className="rounded-xl active:scale-95"
                >
                  <Link
                    to="/board/$slug/$postNo"
                    params={{ slug, postNo: String(nextProjectNo) }}
                  >
                    다음 산출물 평가
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
            {alreadyReviewed && hasMultipleProjects && nextProjectNo === null && (
              <p className="text-xs font-medium text-primary">
                🎉 이 카테고리의 모든 산출물 평가를 마쳤어요.
              </p>
            )}
          </form>
          )}
        </div>
      )}
    </section>
  );
}

// Drag-and-click star rating with 0.5 increments (0 … max).
function StarRating({
  max,
  value,
  onChange,
}: {
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  // Compute a 0.5-step value from a pointer's x position over the star row.
  const valueFromClientX = (clientX: number): number => {
    const el = containerRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const clamped = Math.min(1, Math.max(0, ratio));
    const raw = clamped * max;
    const stepped = Math.ceil(raw * 2) / 2; // round up to nearest 0.5
    return Math.min(max, Math.max(0.5, stepped));
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: PointerEvent) => setHover(valueFromClientX(e.clientX));
    const handleUp = (e: PointerEvent) => {
      onChange(valueFromClientX(e.clientX));
      setDragging(false);
      setHover(null);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, max]);

  const display = hover ?? value;

  return (
    <div className="flex items-center gap-3">
      <div
        ref={containerRef}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={0}
        className="inline-flex w-fit max-w-full cursor-pointer touch-none select-none"
        onPointerDown={(e) => {
          e.preventDefault();
          setDragging(true);
          const v = valueFromClientX(e.clientX);
          setHover(v);
          onChange(v);
        }}
        onPointerMove={(e) => {
          if (!dragging) setHover(valueFromClientX(e.clientX));
        }}
        onPointerLeave={() => {
          if (!dragging) setHover(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            onChange(Math.min(max, (value || 0) + 0.5));
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            onChange(Math.max(0, (value || 0) - 0.5));
          }
        }}
      >
        {Array.from({ length: max }).map((_, i) => {
          const fill = Math.min(1, Math.max(0, display - i)); // 0, 0.5, or 1
          return (
            <span key={i} className="relative block aspect-square w-8 shrink-0">
              <Star className="absolute inset-0 h-full w-full text-muted-foreground/40" />
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star className="h-full w-auto max-w-none fill-primary text-primary" />
              </span>
            </span>
          );
        })}
      </div>
      <span className="shrink-0 text-sm font-semibold text-primary">
        {display > 0 ? display.toFixed(1) : "-"} / {max}
      </span>
    </div>
  );
}

function CommentsSection({ postId }: { postId: string }) {
  const queryClient = useQueryClient();
  const { data: comments = [], isLoading } = useQuery(
    commentsQueryOptions(postId),
  );
  const create = useServerFn(createComment);
  const remove = useServerFn(deleteComment);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["comments", postId] });

  // New top-level comment form state.
  const {
    author,
    setAuthor,
    nicknamePassword,
    setNicknamePassword,
    hasStored,
    persistIdentity,
  } = useNicknameIdentity();
  const [content, setContent] = useState("");
  const [nicknamePasswordConfirm, setNicknamePasswordConfirm] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const { claimed } = useNicknameClaimed(author);
  const needsConfirm = !claimed;

  // Reply form is open for at most one comment at a time.
  const [replyTo, setReplyTo] = useState<string | null>(null);

  // Delete dialog state.
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deletePw, setDeletePw] = useState("");

  // Lightbox state for viewing attached comment images in-app.
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (vars: {
      parentId: string | null;
      author: string;
      content: string;
      imageUrls: string[];
      nicknamePassword: string;
    }) => create({ data: { postId, ...vars } }),
    onSuccess: (_res, vars) => {
      invalidate();
      toast.success(vars.parentId ? "답글을 남겼어요!" : "댓글을 남겼어요!");
      if (vars.parentId) {
        setReplyTo(null);
      } else {
        // Keep the nickname/identity fields filled for the next comment.
        persistIdentity();
        setContent("");
        setImageUrls([]);
      }
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "등록 중 문제가 발생했어요."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id, password: deletePw } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("비밀번호가 일치하지 않아요.");
        return;
      }
      invalidate();
      toast.success("삭제되었어요.");
      setDeleteTarget(null);
      setDeletePw("");
    },
    onError: () => toast.error("삭제 중 문제가 발생했어요."),
  });

  const topLevel = comments.filter((c) => !c.parentId);
  const repliesOf = (parentId: string) =>
    comments.filter((c) => c.parentId === parentId);

  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
        <MessageCircle className="h-5 w-5 text-primary" />
        댓글 {comments.length > 0 && `(${comments.length})`}
      </h2>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          댓글을 불러오는 중...
        </div>
      ) : topLevel.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          아직 댓글이 없어요. 첫 댓글을 남겨보세요!
        </p>
      ) : (
        <ul className="space-y-4">
          {topLevel.map((c) => (
            <li key={c.id} className="space-y-3">
              <CommentItem
                comment={c}
                onReply={() => setReplyTo(replyTo === c.id ? null : c.id)}
                onImageClick={setLightboxUrl}
                onDelete={() => {
                  setDeleteTarget(c.id);
                  setDeletePw("");
                }}
              />

              {/* Reply form */}
              {replyTo === c.id && (
                <CommentForm
                  compact
                  pending={createMutation.isPending}
                  onCancel={() => setReplyTo(null)}
                  onSubmit={(vals) =>
                    createMutation.mutate({ parentId: c.id, ...vals })
                  }
                />
              )}

              {/* Replies */}
              {repliesOf(c.id).length > 0 && (
                <ul className="space-y-3 border-l-2 border-border pl-4">
                  {repliesOf(c.id).map((r) => (
                    <li key={r.id}>
                      <CommentItem
                        comment={r}
                        isReply
                        onImageClick={setLightboxUrl}
                        onDelete={() => {
                          setDeleteTarget(r.id);
                          setDeletePw("");
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* New comment form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!content.trim() && imageUrls.length === 0) {
            toast.error("댓글 내용 또는 이미지를 입력해주세요.");
            return;
          }
          if (!author.trim()) {
            toast.error("닉네임을 입력해주세요.");
            return;
          }
          if (!nicknamePassword.trim()) {
            toast.error("닉네임 비밀번호를 입력해주세요.");
            return;
          }
          if (
            needsConfirm &&
            nicknamePassword.trim() !== nicknamePasswordConfirm.trim()
          ) {
            toast.error("닉네임 비밀번호가 일치하지 않아요.");
            return;
          }
          createMutation.mutate({
            parentId: null,
            author: author.trim(),
            content: content.trim(),
            imageUrls,
            nicknamePassword: nicknamePassword.trim(),
          });
        }}
        className="mt-6 space-y-3 border-t border-border pt-6"
      >
        <div className={`grid gap-3 ${needsConfirm ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <Input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="닉네임"
            maxLength={100}
            className="rounded-xl"
          />
          <PasswordInput
            value={nicknamePassword}
            onChange={(e) => setNicknamePassword(e.target.value)}
            placeholder="닉네임 비밀번호"
            maxLength={100}
            className="rounded-xl"
          />
          {needsConfirm && (
            <PasswordInput
              value={nicknamePasswordConfirm}
              onChange={(e) => setNicknamePasswordConfirm(e.target.value)}
              placeholder="닉네임 비밀번호 확인"
              maxLength={100}
              className="rounded-xl"
            />
          )}
        </div>
        {needsConfirm &&
          nicknamePasswordConfirm.length > 0 &&
          nicknamePassword.trim() !== nicknamePasswordConfirm.trim() && (
            <p className="text-xs text-destructive">닉네임 비밀번호가 일치하지 않아요.</p>
          )}

        <p className="text-xs text-muted-foreground">
          닉네임을 처음 쓰면 비밀번호가 등록되고, 다음부터 같은 비밀번호로 본인 확인합니다. 이 비밀번호로 댓글 삭제도 진행해요.
          {claimed
            ? " 이미 등록된 닉네임이에요. 등록한 비밀번호를 입력해 주세요."
            : hasStored
              ? " 저장된 닉네임을 불러왔어요."
              : ""}
        </p>
        <AutoTextarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="댓글을 입력하세요"
          rows={3}
          maxLength={5000}
          className="rounded-xl"
        />
        <CommentImagePicker
          value={imageUrls}
          onChange={setImageUrls}
          disabled={createMutation.isPending}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-xl active:scale-95"
          >
            {createMutation.isPending ? "등록 중..." : "댓글 등록"}
          </Button>
        </div>
      </form>

      {/* Delete dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>댓글 삭제</DialogTitle>
            <DialogDescription>
              작성자의 닉네임 비밀번호 또는 관리자 비밀번호를 입력해야 삭제할 수
              있어요.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!deletePw.trim()) {
                toast.error("비밀번호를 입력해주세요.");
                return;
              }
              if (deleteTarget) deleteMutation.mutate(deleteTarget);
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-2">
              <Label htmlFor="c-del-pw">비밀번호</Label>
              <PasswordInput
                id="c-del-pw"
                value={deletePw}
                onChange={(e) => setDeletePw(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl active:scale-95"
              >
                취소
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={deleteMutation.isPending}
                className="rounded-xl active:scale-95"
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image lightbox */}
      <Dialog
        open={lightboxUrl !== null}
        onOpenChange={(open) => {
          if (!open) setLightboxUrl(null);
        }}
      >
        <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>첨부 이미지</DialogTitle>
            <DialogDescription>댓글에 첨부된 이미지</DialogDescription>
          </DialogHeader>
          {lightboxUrl && (
            <LightboxImage url={lightboxUrl} />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function LightboxImage({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  };

  return (
    <div
      ref={containerRef}
      className={
        isFullscreen
          ? "relative flex h-screen w-screen items-center justify-center bg-black"
          : "relative mx-auto w-fit rounded-xl bg-black/80"
      }
    >
      <img
        src={url}
        alt="첨부 이미지"
        className={
          isFullscreen
            ? "h-full w-full object-contain"
            : "mx-auto max-h-[85vh] w-auto max-w-full rounded-xl object-contain"
        }
      />
      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute left-3 top-3 rounded-lg bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-black/70"
        title={isFullscreen ? "전체화면 종료" : "전체화면"}
      >
        {isFullscreen ? (
          <Minimize className="h-5 w-5" />
        ) : (
          <Maximize className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}

function CommentItem({
  comment,
  isReply = false,
  onReply,
  onDelete,
  onImageClick,
}: {
  comment: CommentDTO;
  isReply?: boolean;
  onReply?: () => void;
  onDelete: () => void;
  onImageClick: (url: string) => void;
}) {
  const { data: profileMap } = useSuspenseQuery(profileMapQueryOptions());
  return (
    <div className="rounded-xl bg-muted/50 px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {isReply && (
            <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="font-medium text-foreground">{comment.author}</span>
          <AuthorBadge author={comment.author} profileMap={profileMap} />
          <span className="w-full text-xs text-muted-foreground sm:w-auto">
            {new Date(comment.createdAt).toLocaleString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
          {onReply && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReply}
              className="h-7 rounded-lg px-2 text-xs"
            >
              답글
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-7 rounded-lg px-2 text-xs text-destructive hover:text-destructive"
          >
            삭제
          </Button>
        </div>
      </div>
      {comment.content && (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">
          {comment.content}
        </p>
      )}
      {comment.imageUrls.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {comment.imageUrls.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => onImageClick(url)}
              className="block w-full cursor-pointer overflow-hidden rounded-lg border border-border bg-muted transition hover:opacity-90"
            >
              <img
                src={url}
                alt={`첨부 이미지 ${i + 1}`}
                loading="lazy"
                className="h-auto w-full object-contain"
              />
            </button>
          ))}
        </div>
      )}
      <div className="mt-2">
        <LikeButton targetType="comment" targetId={comment.id} size="sm" />
      </div>
    </div>

  );
}

function CommentForm({
  compact = false,
  pending,
  onSubmit,
  onCancel,
}: {
  compact?: boolean;
  pending: boolean;
  onSubmit: (vals: {
    author: string;
    content: string;
    imageUrls: string[];
    nicknamePassword: string;
  }) => void;
  onCancel?: () => void;
}) {
  const {
    author,
    setAuthor,
    nicknamePassword,
    setNicknamePassword,
    hasStored,
    persistIdentity,
  } = useNicknameIdentity();
  const [content, setContent] = useState("");
  const [nicknamePasswordConfirm, setNicknamePasswordConfirm] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const { claimed } = useNicknameClaimed(author);
  const needsConfirm = !claimed;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!content.trim() && imageUrls.length === 0) {
          toast.error("내용 또는 이미지를 입력해주세요.");
          return;
        }
        if (!author.trim()) {
          toast.error("닉네임을 입력해주세요.");
          return;
        }
        if (!nicknamePassword.trim()) {
          toast.error("닉네임 비밀번호를 입력해주세요.");
          return;
        }
        if (
          needsConfirm &&
          nicknamePassword.trim() !== nicknamePasswordConfirm.trim()
        ) {
          toast.error("닉네임 비밀번호가 일치하지 않아요.");
          return;
        }
        persistIdentity();
        onSubmit({
          author: author.trim(),
          content: content.trim(),
          imageUrls,
          nicknamePassword: nicknamePassword.trim(),
        });
      }}
      className={`space-y-3 rounded-xl border border-border p-4 ${compact ? "ml-4" : ""}`}
    >
      <div className={`grid gap-3 ${needsConfirm ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <Input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="닉네임"
          maxLength={100}
          className="rounded-xl"
        />
        <PasswordInput
          value={nicknamePassword}
          onChange={(e) => setNicknamePassword(e.target.value)}
          placeholder="닉네임 비밀번호"
          maxLength={100}
          className="rounded-xl"
        />
        {needsConfirm && (
          <PasswordInput
            value={nicknamePasswordConfirm}
            onChange={(e) => setNicknamePasswordConfirm(e.target.value)}
            placeholder="닉네임 비밀번호 확인 (닉네임 입력 시)"
            maxLength={100}
            className="rounded-xl"
          />
        )}
      </div>
      {needsConfirm &&
        nicknamePasswordConfirm.length > 0 &&
        nicknamePassword.trim() !== nicknamePasswordConfirm.trim() && (
          <p className="text-xs text-destructive">닉네임 비밀번호가 일치하지 않아요.</p>
        )}

      {claimed ? (
        <p className="text-xs text-muted-foreground">
          이미 등록된 닉네임이에요. 등록한 비밀번호를 입력해 주세요.
        </p>
      ) : hasStored ? (
        <p className="text-xs text-muted-foreground">
          저장된 닉네임을 불러왔어요.
        </p>
      ) : null}
      <AutoTextarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="답글을 입력하세요"
        rows={2}
        maxLength={5000}
        className="rounded-xl"
      />
      <CommentImagePicker
        value={imageUrls}
        onChange={setImageUrls}
        disabled={pending}
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
            className="rounded-xl active:scale-95"
          >
            취소
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          className="rounded-xl active:scale-95"
        >
          {pending ? "등록 중..." : "답글 등록"}
        </Button>
      </div>
    </form>
  );
}

function BackLink({ slug }: { slug: string }) {
  return (
    <Link
      to="/board/$slug"
      params={{ slug }}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:-translate-x-0.5 hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      게시글 목록
    </Link>
  );
}
