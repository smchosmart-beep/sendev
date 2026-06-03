import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
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
  FileText,
  Star,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import {
  postQueryOptions,
  readmeQueryOptions,
  criteriaQueryOptions,
  reviewsQueryOptions,
} from "@/lib/platform.queries";
import { createReview } from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  return (
    <div className="space-y-6">
      <BackLink categoryId={categoryId} />

      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">{post.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-4 w-4" />
            {post.author}
          </span>
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
        </div>
      </div>

      <ReadmeSection githubUrl={post.githubUrl} />
      <EvaluationSection categoryId={categoryId} postId={postId} />
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

  const [reviewerName, setReviewerName] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});

  const mutation = useMutation({
    mutationFn: () =>
      create({ data: { postId, reviewerName, scores } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", postId] });
      toast.success("평가를 제출했어요!");
      setReviewerName("");
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
              if (!reviewerName.trim()) {
                toast.error("평가자 이름을 입력해주세요.");
                return;
              }
              for (const c of criteria) {
                if (typeof scores[c.id] !== "number") {
                  toast.error("모든 항목에 점수를 입력해주세요.");
                  return;
                }
              }
              mutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="reviewer">평가자 이름</Label>
              <Input
                id="reviewer"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            {criteria.map((c) => (
              <div key={c.id} className="space-y-2">
                <Label>
                  {c.criterionName}{" "}
                  <span className="text-muted-foreground">(0 ~ {c.maxScore})</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={c.maxScore}
                  value={scores[c.id] ?? ""}
                  onChange={(e) =>
                    setScores((prev) => ({
                      ...prev,
                      [c.id]: Math.max(
                        0,
                        Math.min(c.maxScore, Number(e.target.value)),
                      ),
                    }))
                  }
                  className="rounded-xl"
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
