import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  useSuspenseQuery,
  useQuery,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Megaphone, FolderGit2, User, Plus, MessageCircleQuestion } from "lucide-react";
import { toast } from "sonner";

import {
  postsQueryOptions,
  categoriesQueryOptions,
  ogImageBackfillQueryOptions,
} from "@/lib/platform.queries";
import { createPost, GITHUB_URL_RE, type PostDTO } from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_main/board/$categoryId/")({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(postsQueryOptions(params.categoryId)),
      context.queryClient.ensureQueryData(categoriesQueryOptions()),
    ]),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      산출물을 불러오지 못했어요: {error.message}
    </div>
  ),
  component: BoardContent,
});

function BoardContent() {
  const { categoryId } = useParams({ from: "/_main/board/$categoryId/" });
  const { data: posts } = useSuspenseQuery(postsQueryOptions(categoryId));
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const githubRequired =
    categories.find((c) => c.id === categoryId)?.githubRequired ?? false;
  const notices = posts.filter((p) => p.type === "notice");
  const questions = posts.filter((p) => p.type === "question");
  const projects = posts.filter((p) => p.type === "project");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(false);

  return (
    <div className="space-y-6">
      {notices.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Megaphone className="h-5 w-5 text-primary" />
            공지사항
          </h2>
          {notices.map((n) => (
            <div
              key={n.id}
              className="flex items-center justify-between rounded-2xl bg-card p-5 shadow-sm"
            >
              <span className="font-medium text-foreground">{n.title}</span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                {n.author}
              </span>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <MessageCircleQuestion className="h-5 w-5 text-primary" />
            질문게시판
          </h2>
          <Button
            onClick={() => setQuestionOpen(true)}
            variant="secondary"
            className="rounded-xl active:scale-95"
          >
            <Plus className="h-4 w-4" />
            질문 등록
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
              to="/board/$categoryId/$postId"
              params={{ categoryId, postId: q.id }}
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

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <FolderGit2 className="h-5 w-5 text-primary" />
            산출물
          </h2>
          <Button
            onClick={() => setRegisterOpen(true)}
            className="rounded-xl active:scale-95"
          >
            <Plus className="h-4 w-4" />
            산출물 등록
          </Button>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={FolderGit2}
            title="아직 등록된 산출물이 없어요. 첫 번째 개발자가 되어주세요!"
            description="GitHub 링크와 함께 프로젝트를 공유해보세요."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} post={p} categoryId={categoryId} />
            ))}
          </div>
        )}
      </section>

      <RegisterDialog
        categoryId={categoryId}
        githubRequired={githubRequired}
        open={registerOpen}
        onOpenChange={setRegisterOpen}
      />
    </div>
  );
}

function ProjectCard({
  post,
  categoryId,
}: {
  post: PostDTO;
  categoryId: string;
}) {
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
      to="/board/$categoryId/$postId"
      params={{ categoryId, postId: post.id }}
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



function RegisterDialog({
  categoryId,
  githubRequired,
  open,
  onOpenChange,
}: {
  categoryId: string;
  githubRequired: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const create = useServerFn(createPost);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [deployUrl, setDeployUrl] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: { categoryId, type: "project", title, author, githubUrl, deployUrl, editPassword },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", categoryId] });
      toast.success("산출물이 등록되었어요!");
      setTitle("");
      setAuthor("");
      setGithubUrl("");
      setDeployUrl("");
      setEditPassword("");
      onOpenChange(false);
    },
    onError: () => toast.error("등록 중 문제가 발생했어요."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>산출물 등록</DialogTitle>
          <DialogDescription>
            프로젝트 정보와 GitHub 링크를 입력해주세요.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim() || !author.trim()) {
              toast.error("제목과 작성자를 입력해주세요.");
              return;
            }
            if (!editPassword.trim()) {
              toast.error("수정·삭제용 비밀번호를 입력해주세요.");
              return;
            }
            const url = githubUrl.trim();
            if (githubRequired && !url) {
              toast.error("이 게시판은 GitHub 링크가 필수예요.");
              return;
            }
            if (url && !GITHUB_URL_RE.test(url)) {
              toast.error("GitHub 링크 형식이 올바르지 않아요. (예: https://github.com/owner/repo)");
              return;
            }
            const dep = deployUrl.trim();
            if (dep && !/^https?:\/\/.+/i.test(dep)) {
              toast.error("배포 URL 형식이 올바르지 않아요. (예: https://my-app.lovable.app)");
              return;
            }
            mutation.mutate();
          }}
          className="space-y-4 py-2"
        >
          <div className="space-y-2">
            <Label htmlFor="p-title">프로젝트 제목</Label>
            <Input
              id="p-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-author">작성자</Label>
            <Input
              id="p-author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-github">
              GitHub 링크{githubRequired && <span className="ml-1 text-destructive">*</span>}
            </Label>
            <Input
              id="p-github"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="rounded-xl"
            />
            {githubRequired && (
              <p className="text-xs text-muted-foreground">
                이 게시판은 GitHub 링크가 필수입니다.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-deploy">배포 URL (선택)</Label>
            <Input
              id="p-deploy"
              value={deployUrl}
              onChange={(e) => setDeployUrl(e.target.value)}
              placeholder="https://my-app.lovable.app"
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              입력하면 산출물 카드에 배포 사이트 미리보기 이미지가 표시돼요.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-pw">수정·삭제 비밀번호</Label>
            <Input
              id="p-pw"
              type="password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              placeholder="나중에 수정·삭제할 때 사용해요"
              className="rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="rounded-xl active:scale-95"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-xl active:scale-95"
            >
              {mutation.isPending ? "등록 중..." : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
