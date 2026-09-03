import { useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { toast } from "sonner";

import { categoriesQueryOptions } from "@/lib/platform.queries";
import { createRecord } from "@/lib/record.functions";
import { EmptyState } from "@/components/EmptyState";
import { CopyrightNoticeDialog } from "@/components/CopyrightNoticeDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { useNicknameIdentity, useNicknameClaimed } from "@/hooks/useNicknameIdentity";

export const Route = createFileRoute("/_main/board/$slug/new-record")({
  loader: ({ context }) => context.queryClient.ensureQueryData(categoriesQueryOptions()),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      페이지를 불러오지 못했어요: {error.message}
    </div>
  ),
  component: NewRecordPage,
});

function NewRecordPage() {
  const { slug } = useParams({ from: "/_main/board/$slug/new-record" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const create = useServerFn(createRecord);
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const category = categories.find((c) => c.slug === slug);
  const boardName = category?.recordName || "활동기록";
  const isGrowth = category?.recordKind === "growth";

  const [teamName, setTeamName] = useState("");
  const {
    author,
    setAuthor,
    nicknamePassword,
    setNicknamePassword,
    persistIdentity,
  } = useNicknameIdentity();
  const [confirmPassword, setConfirmPassword] = useState("");
  const { claimed } = useNicknameClaimed(author);
  const needsConfirm = !claimed;

  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          categoryId: category!.id,
          teamName: teamName.trim(),
          author: author.trim(),
          nicknamePassword,
        },
      }),
    onSuccess: (res) => {
      persistIdentity();
      queryClient.invalidateQueries({ queryKey: ["posts", category!.id] });
      toast.success(
        res.existing ? "이미 참여 중인 기록으로 이동해요." : "활동기록이 만들어졌어요!",
      );
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
          icon={ClipboardList}
          title="카테고리를 찾을 수 없어요."
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
        <h1 className="text-2xl font-bold text-foreground">{boardName} 시작하기</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isGrowth
            ? "개인 기록이에요. 작성자 본인과 관리자만 편집할 수 있어요."
            : "팀당 기록은 하나예요. 만든 뒤 팀원을 추가하면 다 같이 편집할 수 있어요."}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!teamName.trim() || !author.trim()) {
              toast.error(
                isGrowth
                  ? "프로젝트명과 작성자를 입력해주세요."
                  : "팀 이름과 작성자를 입력해주세요.",
              );
              return;
            }
            if (needsConfirm && nicknamePassword.trim() !== confirmPassword.trim()) {
              toast.error("닉네임 비밀번호가 일치하지 않아요.");
              return;
            }
            mutation.mutate();
          }}
          className="mt-6 space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="rec-team">{isGrowth ? "프로젝트명" : "팀 이름"}</Label>
            <Input
              id="rec-team"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder={isGrowth ? "예) 수업 질문 카드" : "예: 4모둠 배수탐험대"}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rec-author">작성자(내 닉네임)</Label>
            <Input
              id="rec-author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rec-nickpw">닉네임 비밀번호</Label>
            <PasswordInput
              id="rec-nickpw"
              value={nicknamePassword}
              onChange={(e) => setNicknamePassword(e.target.value)}
              placeholder="이 닉네임을 보호할 비밀번호"
              className="rounded-xl"
            />
          </div>
          {needsConfirm && (
            <div className="space-y-2">
              <Label htmlFor="rec-nickpw2">닉네임 비밀번호 확인</Label>
              <PasswordInput
                id="rec-nickpw2"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 한 번 더 입력"
                className="rounded-xl"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button asChild type="button" variant="secondary" className="rounded-xl active:scale-95">
              <Link to="/board/$slug" params={{ slug }}>
                취소
              </Link>
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-xl active:scale-95"
            >
              {mutation.isPending ? "만드는 중..." : "만들기"}
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
