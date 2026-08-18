import { useState } from "react";
import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, MessageCircle, CornerDownRight } from "lucide-react";
import { toast } from "sonner";

import {
  categoriesQueryOptions,
  postByNoQueryOptions,
  getBoardPassword,
} from "@/lib/platform.queries";
import { createPost } from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";
import { CopyrightNoticeDialog } from "@/components/CopyrightNoticeDialog";
import { PostEditor } from "@/components/PostEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/PasswordInput";
import { useNicknameIdentity, useNicknameClaimed } from "@/hooks/useNicknameIdentity";
import { useApplyPostTemplate } from "@/hooks/usePostTemplate";


export const Route = createFileRoute("/_main/board/$slug/new-general")({
  validateSearch: (search: Partial<Record<string, unknown>>): { parent?: number } => {
    const raw = Number(search.parent);
    return { parent: Number.isFinite(raw) && raw > 0 ? raw : undefined };
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(categoriesQueryOptions()),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      페이지를 불러오지 못했어요: {error.message}
    </div>
  ),
  component: NewGeneralPage,
});

function NewGeneralPage() {
  const { slug } = useParams({ from: "/_main/board/$slug/new-general" });
  const { parent } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const create = useServerFn(createPost);
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const category = categories.find((c) => c.slug === slug);
  const boardName = category?.generalName || "일반게시판";

  // 연재(답글)로 작성하는 경우 부모 글을 불러와 안내와 연결에 사용한다.
  const { data: parentPost } = useQuery({
    ...postByNoQueryOptions(slug, parent ?? 0, getBoardPassword(slug)),
    enabled: !!parent,
  });
  const parentPostId = parentPost?.id ?? null;


  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  useApplyPostTemplate(category?.id, "post", content, setContent);
  const [pinned, setPinned] = useState(false);
  const {
    author,
    setAuthor,
    nicknamePassword,
    setNicknamePassword,
    hasStored,
    persistIdentity,
  } = useNicknameIdentity();
  const [nicknamePasswordConfirm, setNicknamePasswordConfirm] = useState("");
  const { claimed } = useNicknameClaimed(author);
  // 등록되지 않은 닉네임(처음 사용)일 때만 비밀번호 확인을 한 번 더 받는다.
  const needsConfirm = !claimed;

  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          categoryId: category!.id,
          type: "post",
          pinned,
          title,
          content,
          author,
          nicknamePassword,
          githubUrl: "",
          deployUrl: "",
          parentPostId,
        },
      }),
    onSuccess: (res) => {
      persistIdentity();
      queryClient.invalidateQueries({ queryKey: ["posts", category!.id] });
      if (parentPostId) {
        queryClient.invalidateQueries({ queryKey: ["post-chain"] });
      }
      toast.success(parentPostId ? "다음 편이 등록되었어요!" : "글이 등록되었어요!");
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
          icon={MessageCircle}
          title="카테고리을 찾을 수 없어요."
          description="삭제되었거나 잘못된 주소일 수 있어요."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink slug={slug} />
      <CopyrightNoticeDialog />

      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">
          {parentPost ? "다음 편 작성" : `${boardName} 글 등록`}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {parentPost ? "이전 편에 이어지는 연재 글을 작성해요." : "자유롭게 글을 남겨보세요."}
        </p>

        {parentPost && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-accent p-3 text-sm text-foreground">
            <CornerDownRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <span className="font-medium">{parentPost.title}</span>
              <span className="text-muted-foreground">에 이어지는 다음 편 작성 중</span>
            </span>
          </div>
        )}


        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim() || !author.trim()) {
              toast.error("제목과 작성자를 입력해주세요.");
              return;
            }
            if (needsConfirm && nicknamePassword.trim() !== nicknamePasswordConfirm.trim()) {
              toast.error("닉네임 비밀번호가 일치하지 않아요.");
              return;
            }
            mutation.mutate();
          }}
          className="mt-6 space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="g-title">제목</Label>
            <Input
              id="g-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="g-pinned"
              checked={pinned}
              onCheckedChange={(v) => setPinned(v === true)}
            />
            <Label htmlFor="g-pinned" className="cursor-pointer text-sm font-normal text-muted-foreground">
              상단 고정(공지)
            </Label>
          </div>
          <div className="space-y-2">
            <Label>내용</Label>
            <PostEditor
              value={content}
              onChange={setContent}
              placeholder="내용을 입력해 주세요."
              rows={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-author">작성자</Label>
            <Input
              id="g-author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-nickpw">닉네임 비밀번호</Label>
            <PasswordInput
              id="g-nickpw"
              value={nicknamePassword}
              onChange={(e) => setNicknamePassword(e.target.value)}
              placeholder="이 닉네임을 보호할 비밀번호"
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              이 닉네임을 처음 쓰면 비밀번호가 등록되고, 다음부터 같은 비밀번호로 인증합니다.
              {claimed
                ? " 이미 등록된 닉네임이에요. 등록한 비밀번호를 입력해 주세요."
                : hasStored
                  ? " 저장된 닉네임을 불러왔어요."
                  : " 등록하면 이 기기에서 다음부터 자동으로 채워져요."}
            </p>
          </div>
          {needsConfirm && (
            <div className="space-y-2">
              <Label htmlFor="g-nickpw-confirm">닉네임 비밀번호 확인</Label>
              <PasswordInput
                id="g-nickpw-confirm"
                value={nicknamePasswordConfirm}
                onChange={(e) => setNicknamePasswordConfirm(e.target.value)}
                placeholder="비밀번호를 한 번 더 입력"
                className="rounded-xl"
              />
              {nicknamePasswordConfirm.length > 0 &&
                nicknamePassword.trim() !== nicknamePasswordConfirm.trim() && (
                  <p className="text-xs text-destructive">비밀번호가 일치하지 않아요.</p>
                )}
            </div>
          )}
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
