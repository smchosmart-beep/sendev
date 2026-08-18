import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Lock, Plus, RotateCcw, Save, Trophy, Vote } from "lucide-react";
import { toast } from "sonner";

import type { CategoryDTO, PostDTO } from "@/lib/platform.functions";
import { normalizeUsername, resetVotes, setVoteStatus, submitVotes } from "@/lib/platform.functions";
import {
  getBoardPassword,
  myVotesQueryOptions,
  voteRequirementQueryOptions,
  voteResultsQueryOptions,
  voteStateQueryOptions,
} from "@/lib/platform.queries";
import { getAdminPassword } from "@/lib/admin-auth";
import { useStoredIdentity } from "@/hooks/useNicknameIdentity";
import { useConfirm } from "@/hooks/useConfirm";
import { EmptyState } from "@/components/EmptyState";
import { voteCardText } from "@/lib/post-text";
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


const PAGE_SIZE = 36;

interface Props {
  category: CategoryDTO;
  slug: string;
  posts: PostDTO[];
  page: number;
  onPageChange: (page: number) => void;
  Pagination: React.ComponentType<{
    page: number;
    pageCount: number;
    onChange: (page: number) => void;
  }>;
}

export function VoteSection({
  category,
  slug,
  posts,
  page,
  onPageChange,
  Pagination,
}: Props) {
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const { identity } = useStoredIdentity();
  const nickname = identity?.author ?? "";
  const nicknamePassword = identity?.nicknamePassword ?? "";
  const boardPassword = getBoardPassword(slug);
  const adminPassword = typeof window === "undefined" ? "" : getAdminPassword();
  const isAdmin = adminPassword.length > 0;
  const boardName = category.voteName || "투표";

  const { data: state } = useQuery(voteStateQueryOptions(category.id));
  const status = state?.status ?? category.voteStatus;
  const maxChoices = state?.maxChoices ?? category.voteMaxChoices;

  const { data: myVotes = [] } = useQuery(
    myVotesQueryOptions(category.id, nickname, boardPassword, adminPassword),
  );
  const mySet = useMemo(() => new Set(myVotes), [myVotes]);

  const { data: results } = useQuery({
    ...voteResultsQueryOptions(category.id, boardPassword, adminPassword),
    enabled: status === "closed",
  });
  const counts = results?.counts ?? {};
  // 닉네임이 투표 판단에 영향을 주지 않도록, 종료 전까지는 관리자 포함 모두 작성자를 숨긴다.
  const showAuthor = status === "closed";


  const vote = useServerFn(castVote);
  const voteMutation = useMutation({
    mutationFn: (postId: string) =>
      vote({
        data: {
          categoryId: category.id,
          postId,
          nickname,
          nicknamePassword,
          boardPassword,
          adminPassword,
        },
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["my-votes", category.id] });
      toast.success(res.voted ? "투표했어요!" : "투표를 취소했어요.");
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "투표하지 못했어요."),
  });

  const ordered = useMemo(() => {
    if (status !== "closed") return posts;
    return [...posts].sort(
      (a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0),
    );
  }, [posts, status, counts]);

  const pageCount = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pageCount);
  const paged = ordered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const handleVote = (postId: string) => {
    if (status !== "open") {
      toast.error("지금은 투표할 수 없어요.");
      return;
    }
    if (!nickname.trim() || !nicknamePassword.trim()) {
      toast.error("먼저 메뉴에서 닉네임과 비밀번호를 등록해 주세요.");
      return;
    }
    voteMutation.mutate(postId);
  };

  return (
    <section className="space-y-4">
      {confirmDialog}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Vote className="h-5 w-5 text-primary" />
          {boardName}
          <StatusBadge status={status} />
        </h2>
        <Button asChild className="rounded-xl active:scale-95">
          <Link to="/board/$slug/new-vote" params={{ slug }}>
            <Plus className="h-4 w-4" />
            글 등록
          </Link>
        </Button>
      </div>

      <p className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
        {status === "open" ? (
          <>
            투표가 진행 중이에요. 1인당 최대 <b>{maxChoices}표</b>까지 선택할 수
            있고, 지금은 <b>{myVotes.length}표</b>를 사용했어요. 결과는 투표가
            종료된 뒤 한 번에 공개됩니다.
          </>
        ) : status === "closed" ? (
          <>투표가 종료되었어요. 아래에서 최종 결과를 확인할 수 있어요.</>
        ) : (
          <>아직 투표가 시작되지 않았어요. 먼저 후보 글을 등록해 주세요.</>
        )}
      </p>

      {isAdmin && (
        <AdminVoteControls
          categoryId={category.id}
          status={status}
          maxChoices={maxChoices}
          confirm={confirm}
          onDone={() => {
            queryClient.invalidateQueries({ queryKey: ["vote-state", category.id] });
            queryClient.invalidateQueries({ queryKey: ["vote-results", category.id] });
            queryClient.invalidateQueries({ queryKey: ["my-votes", category.id] });
            queryClient.invalidateQueries({ queryKey: ["categories"] });
          }}
        />
      )}

      {ordered.length === 0 ? (
        <EmptyState
          icon={Vote}
          title="아직 등록된 글이 없어요."
          description="첫 번째 후보 글을 등록해보세요."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {paged.map((post, idx) => {
              const voted = mySet.has(post.id);
              const count = counts[post.id] ?? 0;
              const rank = status === "closed" ? (current - 1) * PAGE_SIZE + idx + 1 : 0;
              return (
                <div
                  key={post.id}
                  className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md ${
                    voted ? "border-primary bg-accent/50" : "border-border bg-card"
                  }`}
                >
                  <Link
                    to="/board/$slug/$postNo"
                    params={{ slug, postNo: String(post.postNo) }}
                    className="space-y-1"
                  >
                    {status === "closed" && rank <= 3 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        <Trophy className="h-3.5 w-3.5" />
                        {rank}위
                      </span>
                    )}
                    <p className="line-clamp-5 text-sm font-medium leading-relaxed text-foreground">
                      {voteCardText(post.content, post.title)}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {showAuthor ? post.author : "익명"}
                    </p>
                  </Link>

                  <div className="flex items-center justify-between gap-2">
                    {status === "closed" ? (
                      <span className="text-sm font-semibold text-primary">
                        {count}표
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" />
                        비공개
                      </span>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant={voted ? "default" : "secondary"}
                      disabled={status !== "open" || voteMutation.isPending}
                      onClick={() => handleVote(post.id)}
                      className="h-8 rounded-lg px-3 text-sm active:scale-95"
                    >
                      {voted ? (
                        <>
                          <Check className="h-3 w-3" />
                          투표함
                        </>
                      ) : (
                        "투표"
                      )}
                    </Button>
                  </div>
                  {isAdmin && status === "closed" && (results?.voters?.[post.id]?.length ?? 0) > 0 && (
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      {results!.voters[post.id]!.join(", ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <Pagination page={current} pageCount={pageCount} onChange={onPageChange} />
        </>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    idle: { label: "대기", cls: "bg-muted text-muted-foreground" },
    open: { label: "투표 중", cls: "bg-primary text-primary-foreground" },
    closed: { label: "종료", cls: "bg-secondary text-secondary-foreground" },
  };
  const s = map[status] ?? map.idle!;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

function AdminVoteControls({
  categoryId,
  status,
  maxChoices,
  confirm,
  onDone,
}: {
  categoryId: string;
  status: string;
  maxChoices: number;
  confirm: (opts: { title?: string; description: string; destructive?: boolean }) => Promise<boolean>;
  onDone: () => void;
}) {
  const [dialog, setDialog] = useState<
    | null
    | {
        mode: "start" | "stop" | "reset";
        password: string;
        limit: string;
        error: string;
        submitting: boolean;
      }
  >(null);

  const setStatus = useServerFn(setVoteStatus);
  const reset = useServerFn(resetVotes);

  const openDialog = (mode: "start" | "stop" | "reset") => {
    setDialog({
      mode,
      password: "",
      limit: String(maxChoices || 1),
      error: "",
      submitting: false,
    });
  };

  const closeDialog = () => setDialog(null);

  const handleSubmit = async () => {
    if (!dialog) return;
    setDialog({ ...dialog, error: "", submitting: true });
    try {
      if (dialog.mode === "start") {
        await setStatus({
          data: {
            categoryId,
            status: "open",
            maxChoices: Math.max(1, Number(dialog.limit) || 1),
            adminPassword: dialog.password,
          },
        });
      } else if (dialog.mode === "stop") {
        await setStatus({
          data: { categoryId, status: "closed", maxChoices: 1, adminPassword: dialog.password },
        });
      } else if (dialog.mode === "reset") {
        await reset({ data: { categoryId, adminPassword: dialog.password } });
        await setStatus({
          data: { categoryId, status: "idle", maxChoices: 1, adminPassword: dialog.password },
        });
      }
      closeDialog();
      onDone();
      toast.success(
        dialog.mode === "start"
          ? "투표를 시작했어요."
          : dialog.mode === "stop"
            ? "투표를 종료했어요."
            : "투표 기록을 초기화했어요.",
      );
    } catch (err) {
      setDialog({
        ...dialog,
        submitting: false,
        error: err instanceof Error ? err.message : "처리하지 못했어요.",
      });
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-dashed border-primary/40 bg-card p-4">
        <div className="space-y-1">
          <Label className="text-xs">1인당 최대 투표 수</Label>
          <p className="h-9 w-28 rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
            {maxChoices || 1}표
          </p>
        </div>
        {status !== "open" ? (
          <Button
            type="button"
            className="rounded-xl active:scale-95"
            onClick={() => openDialog("start")}
          >
            투표 시작
          </Button>
        ) : (
          <Button
            type="button"
            className="rounded-xl active:scale-95"
            onClick={() => openDialog("stop")}
          >
            투표 종료
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          className="rounded-xl active:scale-95"
          onClick={async () => {
            const ok = await confirm({
              title: "투표 초기화",
              description: "이 게시판의 모든 표가 삭제돼요. 되돌릴 수 없어요.",
              destructive: true,
            });
            if (ok) openDialog("reset");
          }}
        >
          <RotateCcw className="h-4 w-4" />
          초기화
        </Button>
      </div>

      <Dialog open={!!dialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "start"
                ? "투표 시작"
                : dialog?.mode === "stop"
                  ? "투표 종료"
                  : "투표 초기화"}
            </DialogTitle>
            <DialogDescription>
              {dialog?.mode === "start"
                ? "관리자 비밀번호를 입력하고 1인당 최대 투표 수를 확인해 주세요."
                : dialog?.mode === "stop"
                  ? "관리자 비밀번호를 입력하면 투표가 종료되고 결과가 공개됩니다."
                  : "관리자 비밀번호를 입력하면 모든 투표 기록이 삭제됩니다."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
            className="space-y-4"
          >
            {dialog?.mode === "start" && (
              <div className="space-y-1">
                <Label htmlFor="vote-limit" className="text-xs">
                  1인당 최대 투표 수
                </Label>
                <Input
                  id="vote-limit"
                  type="number"
                  min={1}
                  max={100}
                  value={dialog.limit}
                  onChange={(e) => setDialog({ ...dialog, limit: e.target.value })}
                  className="h-10 rounded-xl"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="admin-password" className="text-xs">
                관리자 비밀번호
              </Label>
              <Input
                id="admin-password"
                type="password"
                autoFocus
                value={dialog?.password ?? ""}
                onChange={(e) =>
                  setDialog((d) =>
                    d ? { ...d, password: e.target.value, error: "" } : null,
                  )
                }
                className="h-10 rounded-xl"
              />
            </div>
            {dialog?.error && (
              <p className="text-sm text-destructive">{dialog.error}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                className="rounded-xl"
                onClick={closeDialog}
                disabled={dialog?.submitting}
              >
                취소
              </Button>
              <Button
                type="submit"
                className="rounded-xl"
                disabled={
                  !dialog?.password.trim() || dialog?.submitting
                }
              >
                {dialog?.submitting ? "처리 중..." : "확인"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
