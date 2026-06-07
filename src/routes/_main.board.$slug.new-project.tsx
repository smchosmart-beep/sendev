import { useState } from "react";
import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, FolderGit2 } from "lucide-react";
import { toast } from "sonner";

import { categoriesQueryOptions } from "@/lib/platform.queries";
import { createPost, GITHUB_URL_RE } from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { useNicknameIdentity } from "@/hooks/useNicknameIdentity";

export const Route = createFileRoute("/_main/board/$slug/new-project")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(categoriesQueryOptions()),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      페이지를 불러오지 못했어요: {error.message}
    </div>
  ),
  component: NewProjectPage,
});

function NewProjectPage() {
  const { slug } = useParams({ from: "/_main/board/$slug/new-project" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const create = useServerFn(createPost);
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const category = categories.find((c) => c.slug === slug);
  const githubRequired = category?.githubRequired ?? false;

  const [title, setTitle] = useState("");
  const {
    author,
    setAuthor,
    nicknamePassword,
    setNicknamePassword,
    hasStored,
    persistIdentity,
  } = useNicknameIdentity();
  const [githubUrl, setGithubUrl] = useState("");
  const [deployUrl, setDeployUrl] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          categoryId: category!.id,
          type: "project",
          title,
          author,
          nicknamePassword,
          githubUrl,
          deployUrl,
          editPassword,
        },
      }),
    onSuccess: (res) => {
      persistIdentity();
      queryClient.invalidateQueries({ queryKey: ["posts", category!.id] });
      toast.success("산출물이 등록되었어요!");
      navigate({
        to: "/board/$slug/$postNo",
        params: { slug, postNo: String(res.postNo) },
      });
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "등록 중 문제가 발생했어요."),
  });

  if (!category) {
    return (
      <div className="space-y-6">
        <BackLink slug={slug} />
        <EmptyState
          icon={FolderGit2}
          title="카테고리을 찾을 수 없어요."
          description="삭제되었거나 잘못된 주소일 수 있어요."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink slug={slug} />

      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">{category.projectName || "산출물"} 등록</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          프로젝트 정보와 GitHub 링크를 입력해주세요.
        </p>

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
              toast.error("이 카테고리은 GitHub 링크가 필수예요.");
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
          className="mt-6 space-y-4"
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
            <Label htmlFor="p-nickpw">닉네임 비밀번호</Label>
            <Input
              id="p-nickpw"
              type="password"
              value={nicknamePassword}
              onChange={(e) => setNicknamePassword(e.target.value)}
              placeholder="이 닉네임을 보호할 비밀번호"
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              이 닉네임을 처음 쓰면 비밀번호가 등록되고, 다음부터 같은 비밀번호로 인증합니다.
              {hasStored
                ? " 저장된 닉네임을 불러왔어요."
                : " 등록하면 이 기기에서 다음부터 자동으로 채워져요."}
            </p>
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
                이 카테고리은 GitHub 링크가 필수입니다.
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
          <div className="flex justify-end gap-2 pt-2">
            <Button asChild type="button" variant="secondary" className="rounded-xl active:scale-95">
              <Link to="/board/$slug" params={{ slug }}>취소</Link>
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-xl active:scale-95"
            >
              {mutation.isPending ? "등록 중..." : "등록"}
            </Button>
          </div>
        </form>
      </div>
    </div>
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
      카테고리으로
    </Link>
  );
}
