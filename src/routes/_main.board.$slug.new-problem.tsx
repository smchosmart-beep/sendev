import { useState } from "react";
import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import {
  useSuspenseQuery,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, PackageOpen } from "lucide-react";
import { toast } from "sonner";

import {
  categoriesQueryOptions,
  problemOptionsQueryOptions,
} from "@/lib/platform.queries";
import { createPost } from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";
import { CopyrightNoticeDialog } from "@/components/CopyrightNoticeDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { cn } from "@/lib/utils";
import {
  useNicknameIdentity,
  useNicknameClaimed,
} from "@/hooks/useNicknameIdentity";

const TITLE_MAX = 30;

export const Route = createFileRoute("/_main/board/$slug/new-problem")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(categoriesQueryOptions()),
      context.queryClient.ensureQueryData(problemOptionsQueryOptions()),
    ]),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      페이지를 불러오지 못했어요: {error.message}
    </div>
  ),
  component: NewProblemPage,
});

function NewProblemPage() {
  const { slug } = useParams({ from: "/_main/board/$slug/new-problem" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const create = useServerFn(createPost);
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const { data: options } = useSuspenseQuery(problemOptionsQueryOptions());
  const category = categories.find((c) => c.slug === slug);

  const [area, setArea] = useState("");
  const [customArea, setCustomArea] = useState("");
  const [isCustomArea, setIsCustomArea] = useState(false);
  const [frequency, setFrequency] = useState("");
  const [title, setTitle] = useState("");
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
  const needsConfirm = !claimed;

  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          categoryId: category!.id,
          type: "problem",
          title,
          author,
          nicknamePassword,
          problemArea: area,
          problemFrequency: frequency,
          githubUrl: "",
          deployUrl: "",
        },
      }),
    onSuccess: (res) => {
      persistIdentity();
      queryClient.invalidateQueries({ queryKey: ["posts", category!.id] });
      toast.success("현장의 문제가 등록되었어요!");
      navigate({
        to: "/board/$slug/$postNo",
        params: { slug, postNo: String(res.postNo) },
      });
    },
    onError: (err: unknown) =>
      toast.error(
        err instanceof Error ? err.message : "등록 중 문제가 발생했어요.",
      ),
  });

  if (!category) {
    return (
      <div className="space-y-6">
        <BackLink slug={slug} />
        <EmptyState
          icon={PackageOpen}
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
        <h1 className="text-2xl font-bold text-foreground">
          {category.problemName || "문제ZIP"} 제보
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          현장의 문제를 세 단계로 간단히 남겨주세요.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!area) {
              toast.error("고통받는 영역을 선택해주세요.");
              return;
            }
            if (!frequency) {
              toast.error("발생 빈도를 선택해주세요.");
              return;
            }
            if (!title.trim()) {
              toast.error("한 줄 고발을 입력해주세요.");
              return;
            }
            if (!author.trim()) {
              toast.error("작성자를 입력해주세요.");
              return;
            }
            if (
              needsConfirm &&
              nicknamePassword.trim() !== nicknamePasswordConfirm.trim()
            ) {
              toast.error("닉네임 비밀번호가 일치하지 않아요.");
              return;
            }
            mutation.mutate();
          }}
          className="mt-6 space-y-8"
        >
          {/* Q1 영역 */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground">
              Q1. 어느 영역에서 가장 고통받고 계신가요?
            </Label>
            <div className="flex flex-wrap gap-2">
              {options.areas.map((opt) => (
                <ChoiceButton
                  key={opt}
                  label={opt}
                  selected={area === opt}
                  onClick={() => setArea(opt)}
                />
              ))}
            </div>
          </div>

          {/* Q2 빈도 */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground">
              Q2. 이 문제는 얼마나 자주 발생하나요?
            </Label>
            <div className="flex flex-wrap gap-2">
              {options.frequencies.map((opt) => (
                <ChoiceButton
                  key={opt}
                  label={opt}
                  selected={frequency === opt}
                  onClick={() => setFrequency(opt)}
                />
              ))}
            </div>
          </div>

          {/* Q3 한 줄 고발 */}
          <div className="space-y-2">
            <Label
              htmlFor="pb-title"
              className="text-base font-semibold text-foreground"
            >
              Q3. 현장의 문제를 한 줄로 고발해주세요!
            </Label>
            <Input
              id="pb-title"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
              placeholder="예) 보건실 방문 기록 수기 작성, 교내 행사 신청 채널 파편화 등"
              className="rounded-xl"
            />
            <p className="text-right text-xs text-muted-foreground">
              {title.length}/{TITLE_MAX}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pb-author">작성자</Label>
            <Input
              id="pb-author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pb-nickpw">닉네임 비밀번호</Label>
            <PasswordInput
              id="pb-nickpw"
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
              <Label htmlFor="pb-nickpw-confirm">닉네임 비밀번호 확인</Label>
              <PasswordInput
                id="pb-nickpw-confirm"
                value={nicknamePasswordConfirm}
                onChange={(e) => setNicknamePasswordConfirm(e.target.value)}
                placeholder="비밀번호를 한 번 더 입력"
                className="rounded-xl"
              />
              {nicknamePasswordConfirm.length > 0 &&
                nicknamePassword.trim() !== nicknamePasswordConfirm.trim() && (
                  <p className="text-xs text-destructive">
                    비밀번호가 일치하지 않아요.
                  </p>
                )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              asChild
              type="button"
              variant="secondary"
              className="rounded-xl active:scale-95"
            >
              <Link to="/board/$slug" params={{ slug }}>
                취소
              </Link>
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-xl active:scale-95"
            >
              {mutation.isPending ? "등록 중..." : "제보하기"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChoiceButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-95",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-input bg-card text-foreground hover:border-primary/50 hover:bg-accent",
      )}
    >
      {label}
    </button>
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
      카테고리로
    </Link>
  );
}
