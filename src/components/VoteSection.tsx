import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Lock, Plus, RotateCcw, Save, Trophy, Vote } from "lucide-react";
import { toast } from "sonner";

import type { CategoryDTO, PostDTO } from "@/lib/platform.functions";
import {
  cancelRunoff,
  normalizeUsername,
  resetVotes,
  setVoteRevealed,
  setVoteStatus,
  startRunoff,
  submitVotes,
} from "@/lib/platform.functions";
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
import { VoteVoterPanel } from "@/components/VoteVoterPanel";
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
  const round = state?.round ?? 1;
  const seats = state?.seats ?? maxChoices;
  const runoffIds = useMemo(() => new Set(state?.runoffIds ?? []), [state]);
  const lockedIds = useMemo(() => new Set(state?.lockedIds ?? []), [state]);
  const isRunoff = round > 1;

  const { data: myVotes = [] } = useQuery(
    myVotesQueryOptions(category.id, nickname, boardPassword, adminPassword),
  );

  const { data: requirement } = useQuery({
    ...voteRequirementQueryOptions(category.id, nickname),
    enabled: nickname.trim().length > 0,
  });
  const required = requirement?.required ?? maxChoices;

  // 서버에 저장된 내 표를 로컬 선택 상태의 기준으로 삼는다.
  const savedKey = useMemo(() => [...myVotes].sort().join("|"), [myVotes]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(myVotes));
  useEffect(() => {
    setSelected(new Set(myVotes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);
  const mySet = selected;

  const { data: results } = useQuery({
    ...voteResultsQueryOptions(category.id, boardPassword, adminPassword),
    enabled: status === "closed" || isRunoff,
  });
  const counts = results?.counts ?? {};
  // 닉네임이 투표 판단에 영향을 주지 않도록, 관리자가 최종 결과를 공개하기
  // 전까지는(결선까지 모두 끝나기 전) 관리자 포함 모두 작성자를 숨긴다.
  const showAuthor = !!state?.revealed;

  const myKey = normalizeUsername(nickname);
  const isMyPost = (author: string) =>
    myKey.length > 0 && normalizeUsername(author ?? "") === myKey;

  const save = useServerFn(submitVotes);
  const saveMutation = useMutation({
    mutationFn: (postIds: string[]) =>
      save({
        data: {
          categoryId: category.id,
          postIds,
          nickname,
          nicknamePassword,
          boardPassword,
          adminPassword,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-votes", category.id] });
      queryClient.invalidateQueries({ queryKey: ["vote-requirement", category.id] });
      queryClient.invalidateQueries({ queryKey: ["vote-voter-status", category.id] });
      toast.success("투표를 저장했어요.");
    },
    onError: (err: unknown) => {
      queryClient.invalidateQueries({ queryKey: ["vote-state", category.id] });
      queryClient.invalidateQueries({ queryKey: ["vote-requirement", category.id] });
      toast.error(err instanceof Error ? err.message : "투표하지 못했어요.");
    },
  });

  // 라운드나 1인당 선택 수가 바뀌면, 선택 가능 표 수 기준도 즉시 다시 불러온다.
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["vote-requirement", category.id] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, maxChoices, category.id]);

  // 결선이 끝난 뒤에는 1차에서 확정된 팀도 함께 보여 최종 명단을 완성한다.
  const showFinal = isRunoff && status === "closed";

  // 확정 팀의 득표수는 그 팀이 확정된(마지막으로 표를 받은) 라운드 기준.
  const lockedCountOf = (postId: string) => {
    const byRound = results?.roundCounts ?? {};
    for (let r = round - 1; r >= 1; r -= 1) {
      const c = byRound[r]?.[postId];
      if (typeof c === "number" && c > 0) return c;
    }
    return 0;
  };

  const runoffPosts = useMemo(
    () => (isRunoff ? posts.filter((p) => runoffIds.has(p.id)) : posts),
    [posts, isRunoff, runoffIds],
  );

  const lockedPosts = useMemo(
    () => (showFinal ? posts.filter((p) => lockedIds.has(p.id)) : []),
    [posts, showFinal, lockedIds],
  );

  // 결선 후보(현재 라운드 득표순)
  const runoffOrdered = useMemo(() => {
    if (status !== "closed") return runoffPosts;
    return [...runoffPosts].sort(
      (a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runoffPosts, status, counts]);

  const ordered = useMemo(() => {
    if (!showFinal) return runoffOrdered;
    const locked = [...lockedPosts].sort(
      (a, b) => lockedCountOf(b.id) - lockedCountOf(a.id),
    );
    return [...locked, ...runoffOrdered];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFinal, lockedPosts, runoffOrdered, results, round]);

  // 이번 라운드 종료 시 남은 자리를 채운 팀(동점으로 넘치면 그대로 표시).
  // 판정 대상은 항상 "이번 라운드 후보"뿐이며, 확정 팀은 선발로 합산만 한다.
  const winnerInfo = useMemo(() => {
    if (status !== "closed")
      return {
        winners: new Set<string>(),
        tied: 0,
        tieCount: 0,
        tiedIds: new Set<string>(),
      };
    const remaining = Math.max(0, seats - lockedIds.size);
    const sorted = [...runoffOrdered];
    const withLocked = (ids: string[]) => new Set([...lockedIds, ...ids]);
    if (remaining <= 0 || sorted.length <= remaining) {
      return {
        winners: withLocked(sorted.map((p) => p.id)),
        tied: 0,
        tieCount: 0,
        tiedIds: new Set<string>(),
      };
    }
    const cutoff = counts[sorted[remaining - 1]!.id] ?? 0;
    const above = sorted.filter((p) => (counts[p.id] ?? 0) > cutoff);
    const tied = sorted.filter((p) => (counts[p.id] ?? 0) === cutoff);
    const overflow = above.length + tied.length > remaining;
    return {
      winners: withLocked(
        [...above, ...(overflow ? [] : tied)].map((p) => p.id),
      ),
      tied: overflow ? tied.length : 0,
      tieCount: cutoff,
      tiedIds: new Set(overflow ? tied.map((p) => p.id) : []),
      lockedCount: lockedIds.size + above.length,
      openSeats: remaining - above.length,
    } as {
      winners: Set<string>;
      tied: number;
      tieCount: number;
      tiedIds: Set<string>;
      lockedCount?: number;
      openSeats?: number;
    };
  }, [status, runoffOrdered, counts, seats, lockedIds]);

  // 표 수 기준 표준 경쟁 순위(동점은 같은 순위, 다음 순위는 인원수만큼 건너뜀).
  // 라운드가 다른 확정 팀은 순위 비교 대상에서 제외한다.
  const rankMap = useMemo(() => {
    const map = new Map<string, { rank: number; tied: boolean }>();
    if (status !== "closed") return map;
    let rank = 0;
    let prev: number | null = null;
    const groups = new Map<number, number>();
    runoffOrdered.forEach((p) => {
      const c = counts[p.id] ?? 0;
      groups.set(c, (groups.get(c) ?? 0) + 1);
    });
    runoffOrdered.forEach((p, i) => {
      const c = counts[p.id] ?? 0;
      if (prev === null || c !== prev) {
        rank = i + 1;
        prev = c;
      }
      map.set(p.id, { rank, tied: (groups.get(c) ?? 0) > 1 });
    });
    return map;
  }, [runoffOrdered, counts, status]);

  const pageCount = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pageCount);
  const paged = ordered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const savedSet = useMemo(() => new Set(myVotes), [myVotes]);
  const dirty =
    selected.size !== savedSet.size ||
    [...selected].some((id) => !savedSet.has(id));
  const canSave =
    status === "open" && required > 0 && selected.size === required && dirty;

  const handleVote = (postId: string, author: string) => {
    if (status !== "open") {
      toast.error("지금은 투표할 수 없어요.");
      return;
    }
    if (!nickname.trim() || !nicknamePassword.trim()) {
      toast.error("먼저 메뉴에서 닉네임과 비밀번호를 등록해 주세요.");
      return;
    }
    if (isMyPost(author)) {
      toast.error("본인이 쓴 글에는 투표할 수 없어요.");
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
        return next;
      }
      if (next.size >= required) {
        toast.error(`최대 ${required}개까지 선택할 수 있어요.`);
        return prev;
      }
      next.add(postId);
      return next;
    });
  };


  return (
    <section className="space-y-4">
      {confirmDialog}
      <VoteVoterPanel
        categoryId={category.id}
        boardPassword={boardPassword}
        adminPassword={adminPassword}
        active={status === "open"}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Vote className="h-5 w-5 text-primary" />
          {boardName}
          <StatusBadge status={status} />
          {isRunoff && (
            <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
              결선 {round}차
            </span>
          )}
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
            {isRunoff && (
              <>
                동점으로 남은 자리를 가리는 <b>결선 투표</b>예요. 이미 확정된{" "}
                <b>{lockedIds.size}팀</b>을 뺀 남은 자리를 두고 아래 후보들만
                다시 투표합니다.{" "}
              </>
            )}
            투표가 진행 중이에요. <b>{required}개</b>를 모두 선택한 뒤 <b>투표
            저장</b>을 눌러야 반영돼요. 본인이 쓴 글에는 투표할 수 없고, 종료
            전까지는 선택을 바꿔 다시 저장할 수 있어요. 결과는 투표가 종료된 뒤
            한 번에 공개됩니다.
          </>
        ) : status === "closed" ? (
          <>투표가 종료되었어요. 아래에서 최종 결과를 확인할 수 있어요.</>
        ) : (
          <>아직 투표가 시작되지 않았어요. 먼저 후보 글을 등록해 주세요.</>
        )}

      </p>

      {status === "closed" && winnerInfo.tied > 0 && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-foreground">
          <b>{winnerInfo.lockedCount ?? 0}팀 확정</b>, 남은 자리{" "}
          {winnerInfo.openSeats ?? 0}개를 {winnerInfo.tied}팀이 동점(
          {winnerInfo.tieCount}표)으로 다투는 중이에요. 관리자는 아래에서 결선
          투표를 시작할 수 있어요.
        </p>
      )}


      {status === "open" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-sm text-foreground">
            선택 <b className="text-primary">{selected.size}</b> / {required}
            {savedSet.size > 0 && !dirty && (
              <span className="ml-2 text-xs text-muted-foreground">저장됨</span>
            )}
          </p>
          <Button
            type="button"
            className="rounded-xl active:scale-95"
            disabled={!canSave || saveMutation.isPending}
            onClick={() => saveMutation.mutate([...selected])}
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "저장 중..." : "투표 저장"}
          </Button>
        </div>
      )}



      {isAdmin && (
        <AdminVoteControls
          categoryId={category.id}
          status={status}
          maxChoices={maxChoices}
          seats={seats}
          round={round}
          canStartRunoff={status === "closed" && winnerInfo.tied > 0}
          revealed={!!state?.revealed}
          canReveal={status === "closed" && winnerInfo.tied === 0}
          runoffCandidates={winnerInfo.tied}
          defaultRunoffChoices={Math.max(1, winnerInfo.openSeats ?? 1)}
          confirm={confirm}
          onDone={() => {
            queryClient.invalidateQueries({ queryKey: ["vote-state", category.id] });
            queryClient.invalidateQueries({ queryKey: ["vote-results", category.id] });
            queryClient.invalidateQueries({ queryKey: ["my-votes", category.id] });
            queryClient.invalidateQueries({ queryKey: ["categories"] });
            queryClient.invalidateQueries({ queryKey: ["vote-requirement", category.id] });
            queryClient.invalidateQueries({ queryKey: ["vote-voter-status", category.id] });
            queryClient.invalidateQueries({ queryKey: ["posts"] });
            queryClient.invalidateQueries({ queryKey: ["post"] });
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
            {paged.map((post) => {
              const voted = mySet.has(post.id);
              const count = counts[post.id] ?? 0;
              const rankInfo = rankMap.get(post.id);
              const showRank =
                status === "closed" && count > 0 && !!rankInfo && rankInfo.rank <= 3;
              const isLocked = lockedIds.has(post.id);
              const isWinner =
                status === "closed" && winnerInfo.winners.has(post.id);
              const isTied = status === "closed" && winnerInfo.tiedIds.has(post.id);
              return (
                <div
                  key={post.id}
                  className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md ${
                    isLocked || isWinner
                      ? "border-emerald-300 bg-emerald-50"
                      : isTied
                        ? "border-amber-300 bg-amber-50"
                        : voted
                          ? "border-primary bg-accent/50"
                          : "border-border bg-card"
                  }`}
                >
                  <Link
                    to="/board/$slug/$postNo"
                    params={{ slug, postNo: String(post.postNo) }}
                    className="space-y-1"
                  >
                    <span className="flex flex-wrap items-center gap-1">
                      {showRank && rankInfo && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          <Trophy className="h-3.5 w-3.5" />
                          {rankInfo.tied ? `공동 ${rankInfo.rank}위` : `${rankInfo.rank}위`}
                        </span>
                      )}
                      {(lockedIds.has(post.id) ||
                        (status === "closed" && winnerInfo.winners.has(post.id))) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                          선발
                        </span>
                      )}
                    </span>
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
                      disabled={
                        status !== "open" ||
                        saveMutation.isPending ||
                        isMyPost(post.author)
                      }
                      onClick={() => handleVote(post.id, post.author)}
                      className="h-8 rounded-lg px-3 text-sm active:scale-95"
                    >
                      {isMyPost(post.author) ? (
                        "내 글"
                      ) : voted ? (
                        <>
                          <Check className="h-3 w-3" />
                          선택함
                        </>
                      ) : (
                        "선택"
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
  seats,
  round,
  canStartRunoff,
  revealed,
  canReveal,
  runoffCandidates,
  defaultRunoffChoices,
  confirm,
  onDone,
}: {
  categoryId: string;
  status: string;
  maxChoices: number;
  seats: number;
  round: number;
  canStartRunoff: boolean;
  revealed: boolean;
  canReveal: boolean;
  runoffCandidates: number;
  defaultRunoffChoices: number;
  confirm: (opts: { title?: string; description: string; destructive?: boolean }) => Promise<boolean>;
  onDone: () => void;
}) {
  type Mode = "start" | "stop" | "reset" | "runoff" | "cancel-runoff" | "reveal" | "hide";
  const [dialog, setDialog] = useState<
    | null
    | {
        mode: Mode;
        password: string;
        limit: string;
        seats: string;
        error: string;
        submitting: boolean;
      }
  >(null);

  const setStatus = useServerFn(setVoteStatus);
  const reset = useServerFn(resetVotes);
  const runoff = useServerFn(startRunoff);
  const cancel = useServerFn(cancelRunoff);
  const reveal = useServerFn(setVoteRevealed);

  const openDialog = (mode: Mode) => {
    setDialog({
      mode,
      password: "",
      limit:
        mode === "runoff"
          ? String(Math.max(1, defaultRunoffChoices))
          : String(maxChoices || 1),
      seats: String(seats || maxChoices || 1),
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
            seats: Math.max(1, Number(dialog.seats) || 1),
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
      } else if (dialog.mode === "runoff") {
        await runoff({
          data: {
            categoryId,
            maxChoices: Math.max(1, Number(dialog.limit) || 1),
            adminPassword: dialog.password,
          },
        });
      } else if (dialog.mode === "reveal" || dialog.mode === "hide") {
        await reveal({
          data: {
            categoryId,
            revealed: dialog.mode === "reveal",
            adminPassword: dialog.password,
          },
        });
      } else {
        await cancel({ data: { categoryId, adminPassword: dialog.password } });
      }
      closeDialog();
      onDone();
      toast.success(
        dialog.mode === "start"
          ? "투표를 시작했어요."
          : dialog.mode === "stop"
            ? "투표를 종료했어요."
            : dialog.mode === "reset"
              ? "투표 기록을 초기화했어요."
              : dialog.mode === "runoff"
                ? "결선 투표를 시작했어요."
                : dialog.mode === "reveal"
                  ? "최종 결과와 작성자 닉네임을 공개했어요."
                  : dialog.mode === "hide"
                    ? "작성자 닉네임을 다시 비공개로 바꿨어요."
                    : "결선을 취소했어요.",
      );
    } catch (err) {
      setDialog({
        ...dialog,
        submitting: false,
        error: err instanceof Error ? err.message : "처리하지 못했어요.",
      });
    }
  };

  const title =
    dialog?.mode === "start"
      ? "투표 시작"
      : dialog?.mode === "stop"
        ? "투표 종료"
        : dialog?.mode === "reset"
          ? "투표 초기화"
          : dialog?.mode === "runoff"
            ? "결선 투표 시작"
            : dialog?.mode === "reveal"
              ? "최종 결과·닉네임 공개"
              : dialog?.mode === "hide"
                ? "닉네임 다시 비공개"
                : "결선 취소";

  const description =
    dialog?.mode === "start"
      ? "관리자 비밀번호를 입력하고 1인당 최대 투표 수와 선발 정원을 정해 주세요."
      : dialog?.mode === "stop"
        ? "관리자 비밀번호를 입력하면 투표가 종료되고 결과가 공개됩니다."
        : dialog?.mode === "reset"
          ? "관리자 비밀번호를 입력하면 모든 투표 기록이 삭제됩니다."
          : dialog?.mode === "runoff"
            ? `동점 후보 ${runoffCandidates}팀만으로 결선 투표를 엽니다. 1인당 선택 수를 정해 주세요.`
            : dialog?.mode === "reveal"
              ? "관리자 비밀번호를 입력하면 후보 작성자 닉네임이 모두에게 공개됩니다."
              : dialog?.mode === "hide"
                ? "관리자 비밀번호를 입력하면 작성자 닉네임을 다시 익명으로 되돌립니다."
                : "현재 결선 라운드의 표를 지우고 직전 결과로 되돌립니다.";

  return (
    <>
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-dashed border-primary/40 bg-card p-4">
        <div className="space-y-1">
          <Label className="text-xs">1인당 최대 투표 수</Label>
          <p className="h-9 w-28 rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
            {maxChoices || 1}표
          </p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">선발 정원</Label>
          <p className="h-9 w-28 rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
            {seats || 1}팀
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
        {status === "closed" && !revealed && canReveal && (
          <Button
            type="button"
            className="rounded-xl active:scale-95"
            onClick={() => openDialog("reveal")}
          >
            최종 결과·닉네임 공개
          </Button>
        )}
        {status === "closed" && !revealed && !canReveal && (
          <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            동점이 남아 있어요. 결선 투표를 먼저 진행해 주세요.
          </p>
        )}
        {revealed && (
          <Button
            type="button"
            variant="secondary"
            className="rounded-xl active:scale-95"
            onClick={() => openDialog("hide")}
          >
            닉네임 다시 비공개
          </Button>
        )}
        {canStartRunoff && (
          <Button
            type="button"
            className="rounded-xl active:scale-95"
            onClick={() => openDialog("runoff")}
          >
            결선 투표 시작
          </Button>
        )}
        {round > 1 && (
          <Button
            type="button"
            variant="secondary"
            className="rounded-xl active:scale-95"
            onClick={async () => {
              const ok = await confirm({
                title: "결선 취소",
                description: "현재 결선 라운드의 표가 삭제되고 직전 결과로 돌아가요.",
                destructive: true,
              });
              if (ok) openDialog("cancel-runoff");
            }}
          >
            결선 취소
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
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
            className="space-y-4"
          >
            {(dialog?.mode === "start" || dialog?.mode === "runoff") && (
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
            {dialog?.mode === "start" && (
              <div className="space-y-1">
                <Label htmlFor="vote-seats" className="text-xs">
                  선발 정원(최종 몇 팀을 뽑을지)
                </Label>
                <Input
                  id="vote-seats"
                  type="number"
                  min={1}
                  max={1000}
                  value={dialog.seats}
                  onChange={(e) => setDialog({ ...dialog, seats: e.target.value })}
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
                disabled={!dialog?.password.trim() || dialog?.submitting}
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
