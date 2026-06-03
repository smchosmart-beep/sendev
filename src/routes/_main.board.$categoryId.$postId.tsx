import { useState, useRef, useEffect } from "react";
import {
  createFileRoute,
  Link,
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
import {
  ArrowLeft,
  User,
  Github,
  ExternalLink,
  FileText,
  Star,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  postQueryOptions,
  readmeQueryOptions,
  criteriaQueryOptions,
  reviewsQueryOptions,
} from "@/lib/platform.queries";
import {
  createReview,
  updatePost,
  deletePost,
} from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";
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
import { Label } from "@/components/ui/label";
import { PostEditor } from "@/components/PostEditor";

export const Route = createFileRoute("/_main/board/$categoryId/$postId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(postQueryOptions(params.postId)),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      산출물을 불러오지 못했어요: {error.message}
    </div>
  ),
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { categoryId, postId } = useParams({
    from: "/_main/board/$categoryId/$postId",
  });
  const { data: post } = useSuspenseQuery(postQueryOptions(postId));

  if (!post) {
    return (
      <div className="space-y-6">
        <BackLink categoryId={categoryId} />
        <EmptyState
          icon={FileText}
          title="산출물을 찾을 수 없어요."
          description="삭제되었거나 잘못된 주소일 수 있어요."
        />
      </div>
    );
  }

  const isBoardPost = post.type === "notice" || post.type === "question";

  return (
    <div className="space-y-6">
      <BackLink categoryId={categoryId} />

      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">{post.title}</h1>
          <ManagePost
            post={post}
            categoryId={categoryId}
            postId={postId}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-4 w-4" />
            {post.author}
          </span>
          <span>{new Date(post.createdAt).toLocaleDateString("ko-KR")}</span>
          {post.githubUrl && (
            <a
              href={post.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Github className="h-4 w-4" />
              GitHub 저장소
            </a>
          )}
          {post.deployUrl && (
            <a
              href={post.deployUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              배포 사이트
            </a>
          )}
        </div>

        {isBoardPost && (
          <article className="prose prose-sm mt-6 max-w-none border-t border-border pt-6 prose-headings:text-foreground prose-p:text-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-primary prose-li:text-foreground prose-table:text-foreground">
            {post.content.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {post.content}
              </ReactMarkdown>
            ) : (
              <p className="text-sm text-muted-foreground">내용이 없어요.</p>
            )}
          </article>
        )}
      </div>

      {!isBoardPost && (
        <>
          <ReadmeSection githubUrl={post.githubUrl} />
          <EvaluationSection categoryId={categoryId} postId={postId} />
        </>
      )}
    </div>
  );
}

interface ManagePostProps {
  post: {
    type: "notice" | "project" | "question";
    title: string;
    content: string;
    author: string;
    githubUrl: string;
    deployUrl: string;
  };
  categoryId: string;
  postId: string;
}

function ManagePost({ post, categoryId, postId }: ManagePostProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const update = useServerFn(updatePost);
  const remove = useServerFn(deletePost);

  const isBoardPost = post.type === "notice" || post.type === "question";
  const noun = isBoardPost ? (post.type === "notice" ? "공지" : "질문") : "산출물";

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Edit form state
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [author, setAuthor] = useState(post.author);
  const [githubUrl, setGithubUrl] = useState(post.githubUrl);
  const [deployUrl, setDeployUrl] = useState(post.deployUrl);
  const [editPw, setEditPw] = useState("");
  const [deletePw, setDeletePw] = useState("");

  const openEdit = () => {
    setTitle(post.title);
    setContent(post.content);
    setAuthor(post.author);
    setGithubUrl(post.githubUrl);
    setDeployUrl(post.deployUrl);
    setEditPw("");
    setEditOpen(true);
  };

  const editMutation = useMutation({
    mutationFn: () =>
      update({
        data: isBoardPost
          ? { id: postId, password: editPw, title, content, author }
          : { id: postId, password: editPw, title, author, githubUrl, deployUrl },
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("비밀번호가 일치하지 않아요.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts", categoryId] });
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
      toast.success("산출물이 삭제되었어요.");
      setDeleteOpen(false);
      navigate({ to: "/board/$categoryId", params: { categoryId } });
    },
    onError: () => toast.error("삭제 중 문제가 발생했어요."),
  });

  return (
    <div className="flex shrink-0 gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={openEdit}
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

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>산출물 수정</DialogTitle>
            <DialogDescription>
              등록 시 설정한 비밀번호를 입력해야 수정할 수 있어요.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim() || !author.trim()) {
                toast.error("제목과 작성자를 입력해주세요.");
                return;
              }
              if (!editPw.trim()) {
                toast.error("비밀번호를 입력해주세요.");
                return;
              }
              editMutation.mutate();
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-2">
              <Label htmlFor="e-title">프로젝트 제목</Label>
              <Input
                id="e-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl"
              />
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="e-pw">비밀번호</Label>
              <Input
                id="e-pw"
                type="password"
                value={editPw}
                onChange={(e) => setEditPw(e.target.value)}
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                등록 시 설정한 비밀번호 또는 관리자 비밀번호를 입력하세요.
              </p>
            </div>
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
            <DialogTitle>산출물 삭제</DialogTitle>
            <DialogDescription>
              등록 시 설정한 비밀번호를 입력하면 삭제돼요. 이 작업은 되돌릴 수
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
              <Input
                id="d-pw"
                type="password"
                value={deletePw}
                onChange={(e) => setDeletePw(e.target.value)}
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                등록 시 설정한 비밀번호 또는 관리자 비밀번호를 입력하세요.
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
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
}: {
  categoryId: string;
  postId: string;
}) {
  const queryClient = useQueryClient();
  const { data: criteria = [] } = useQuery(
    criteriaQueryOptions(categoryId, true),
  );
  const { data: reviews = [] } = useQuery(reviewsQueryOptions(postId));
  const create = useServerFn(createReview);

  const [scores, setScores] = useState<Record<string, number>>({});

  const mutation = useMutation({
    mutationFn: () =>
      create({ data: { postId, scores } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", postId] });
      toast.success("평가를 제출했어요!");
      setScores({});
    },
    onError: () => toast.error("제출 중 문제가 발생했어요."),
  });

  const averages = criteria.map((c) => {
    const vals = reviews
      .map((r) => r.scores[c.id])
      .filter((v): v is number => typeof v === "number");
    const avg =
      vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    return { criterion: c, avg, count: vals.length };
  });

  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
        <Star className="h-5 w-5 text-primary" />
        평가
      </h2>

      {criteria.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          이 게시판은 아직 평가 기준이 설정되지 않았어요.
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

          {/* 제출 폼 */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
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
                  onChange={(v) =>
                    setScores((prev) => ({ ...prev, [c.id]: v }))
                  }
                />
              </div>
            ))}
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-xl active:scale-95"
            >
              {mutation.isPending ? "제출 중..." : "평가 제출"}
            </Button>
          </form>

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
        className="flex cursor-pointer touch-none select-none"
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
            <span key={i} className="relative inline-block h-8 w-8">
              <Star className="absolute inset-0 h-8 w-8 text-muted-foreground/40" />
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star className="h-8 w-8 fill-primary text-primary" />
              </span>
            </span>
          );
        })}
      </div>
      <span className="text-sm font-semibold text-primary">
        {display > 0 ? display.toFixed(1) : "-"} / {max}
      </span>
    </div>
  );
}


function BackLink({ categoryId }: { categoryId: string }) {
  return (
    <Link
      to="/board/$categoryId"
      params={{ categoryId }}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:-translate-x-0.5 hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      게시판으로
    </Link>
  );
}
