import { useState } from "react";
import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, LinkIcon } from "lucide-react";
import { toast } from "sonner";

import { categoriesQueryOptions, postsQueryOptions, getBoardPassword } from "@/lib/platform.queries";
import { createPost } from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { useNicknameIdentity } from "@/hooks/useNicknameIdentity";

export const Route = createFileRoute("/_main/board/$slug/new-link")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(categoriesQueryOptions()),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      페이지를 불러오지 못했어요: {error.message}
    </div>
  ),
  component: NewLinkPage,
});

function NewLinkPage() {
  const { slug } = useParams({ from: "/_main/board/$slug/new-link" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const create = useServerFn(createPost);
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const category = categories.find((c) => c.slug === slug);
  const linkName = category?.linkName || "링크";

  const [title, setTitle] = useState("");
  const {
    author,
    setAuthor,
    nicknamePassword,
    setNicknamePassword,
    hasStored,
    persistIdentity,
  } = useNicknameIdentity();
  const [linkUrl, setLinkUrl] = useState("");
  const [series, setSeries] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [nicknamePasswordConfirm, setNicknamePasswordConfirm] = useState("");
  

  // Suggest existing series names in this board for consistent grouping.
  const { data: posts } = useQuery({
    ...postsQueryOptions(category?.id ?? "", getBoardPassword(slug)),
    enabled: !!category,
  });
  const seriesOptions = Array.from(
    new Set(
      (posts ?? [])
        .filter((p) => p.type === "link" && p.series.trim())
        .map((p) => p.series.trim()),
    ),
  );

  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          categoryId: category!.id,
          type: "link",
          title,
          author,
          nicknamePassword,
          deployUrl: linkUrl,
          series: series.trim(),
          editPassword,
        },
      }),
    onSuccess: (res) => {
      persistIdentity();
      queryClient.invalidateQueries({ queryKey: ["posts", category!.id] });
      toast.success(`${linkName}이(가) 등록되었어요!`);
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
          icon={LinkIcon}
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
        <h1 className="text-2xl font-bold text-foreground">{linkName} 등록</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          제목, 작성자, 링크를 입력하면 미리보기 썸네일이 자동으로 표시돼요.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim() || !author.trim()) {
              toast.error("제목과 작성자를 입력해주세요.");
              return;
            }
            const url = linkUrl.trim();
            if (!url || !/^https?:\/\/.+/i.test(url)) {
              toast.error("링크 형식이 올바르지 않아요. (예: https://...)");
              return;
            }
            if (!editPassword.trim()) {
              toast.error("수정·삭제용 비밀번호를 입력해주세요.");
              return;
            }
            if (!hasStored && nicknamePassword.trim() !== nicknamePasswordConfirm.trim()) {
              toast.error("닉네임 비밀번호가 일치하지 않아요.");
              return;
            }
            mutation.mutate();
          }}
          className="mt-6 space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="l-title">제목</Label>
            <Input
              id="l-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="l-author">작성자</Label>
            <Input
              id="l-author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="l-nickpw">닉네임 비밀번호</Label>
            <PasswordInput
              id="l-nickpw"
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
          {!hasStored && (
            <div className="space-y-2">
              <Label htmlFor="l-nickpw-confirm">닉네임 비밀번호 확인</Label>
              <PasswordInput
                id="l-nickpw-confirm"
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
          <div className="space-y-2">
            <Label htmlFor="l-url">링크 URL</Label>
            <Input
              id="l-url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              유튜브, 캔바 등 링크 주소의 미리보기 이미지가 카드에 표시돼요.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="l-series">시리즈 (선택)</Label>
            <Input
              id="l-series"
              value={series}
              onChange={(e) => setSeries(e.target.value)}
              list="series-options"
              placeholder="예: 양실장의 바이브코딩 대학"
              className="rounded-xl"
            />
            <datalist id="series-options">
              {seriesOptions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <p className="text-xs text-muted-foreground">
              같은 시리즈명을 입력하면 카테고리에서 하나의 카드로 묶여 표시돼요. 비워두면 단독 영상으로 등록돼요.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="l-pw">수정·삭제 비밀번호</Label>
            <PasswordInput
              id="l-pw"
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
