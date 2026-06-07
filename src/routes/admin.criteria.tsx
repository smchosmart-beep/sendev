import { getAdminPassword } from "@/lib/admin-auth";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useSuspenseQuery,
  useQuery,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  LayoutGrid,
  Shuffle,
  Lock,
  Unlock,
  UserCheck,
  ClipboardList,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

import {
  categoriesQueryOptions,
  criteriaQueryOptions,
  postsQueryOptions,
  reviewAllowlistQueryOptions,
  categoryReviewsQueryOptions,
} from "@/lib/platform.queries";
import {
  createCriterion,
  updateCriterion,
  deleteCriterion,
  shuffleEvaluation,
  closeEvaluation,
  addReviewAllowlistName,
  addReviewAllowlistNames,
  removeReviewAllowlistName,
  setReviewAllowlistOnly,
  deleteReview,
} from "@/lib/platform.functions";
import type { CategoryDTO } from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/criteria")({
  loader: ({ context }) => context.queryClient.ensureQueryData(categoriesQueryOptions()),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      불러오지 못했어요: {error.message}
    </div>
  ),
  component: CriteriaPage,
});

function CriteriaPage() {
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  // 산출물 게시판이 활성화된 카테고리만 평가 기준 대상으로 노출합니다.
  const projectCategories = categories.filter((c) => c.enableProject);
  const [selected, setSelected] = useState<string | null>(
    projectCategories[0]?.id ?? null,
  );

  if (projectCategories.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="산출물 게시판이 있는 카테고리이 없어요."
        description="평가 기준은 산출물 게시판이 활성화된 카테고리에서만 설정할 수 있어요."
      />
    );
  }

  const activeBoard =
    projectCategories.find((c) => c.id === selected) ?? projectCategories[0];
  const activeId = activeBoard.id;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-card p-6 shadow-sm">
        <Label htmlFor="c-board" className="mb-3 block">카테고리 선택</Label>
        <select
          id="c-board"
          value={activeId}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
        >
          {projectCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </section>

      <BoardEvalCard key={`eval-${activeId}`} board={activeBoard} />

      <CriteriaManager key={activeId} categoryId={activeId} />

      <ReviewAllowlistCard key={`allow-${activeId}`} board={activeBoard} />

      <CategoryReviewsCard key={`reviews-${activeId}`} categoryId={activeId} />
    </div>
  );
}

function BoardEvalCard({ board }: { board: CategoryDTO }) {
  const queryClient = useQueryClient();
  const shuffle = useServerFn(shuffleEvaluation);
  const close = useServerFn(closeEvaluation);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: posts = [] } = useQuery(postsQueryOptions(board.id, "", getAdminPassword()));
  const projectCount = posts.filter((p) => p.type === "project").length;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const shuffleMutation = useMutation({
    mutationFn: () => shuffle({ data: { id: board.id, adminPassword: getAdminPassword() } }),
    onSuccess: () => {
      invalidate();
      setConfirmOpen(false);
      toast.success(
        board.evalOpen ? "평가 순서를 다시 섞었어요." : "평가를 개시했어요!",
      );
    },
    onError: () => toast.error("처리 중 문제가 발생했어요."),
  });

  const closeMutation = useMutation({
    mutationFn: () => close({ data: { id: board.id, adminPassword: getAdminPassword() } }),
    onSuccess: () => {
      invalidate();
      toast.success("평가를 마감했어요.");
    },
    onError: () => toast.error("처리 중 문제가 발생했어요."),
  });

  const busy = shuffleMutation.isPending || closeMutation.isPending;

  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Shuffle className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">평가 진행 관리</h2>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                board.evalOpen
                  ? "inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                  : "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
              }
            >
              {board.evalOpen ? (
                <>
                  <Unlock className="h-3 w-3" /> 평가 진행중
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3" /> 평가 잠김
                </>
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              {board.projectName} {projectCount}개
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            셔플을 누르면 평가가 시작되고, 평가자마다 산출물 순서가 새로 섞입니다.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {board.evalOpen ? (
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="secondary"
                  className="w-full rounded-xl active:scale-95 sm:w-auto"
                  disabled={busy}
                >
                  <Shuffle className="h-4 w-4" /> 순서 다시 섞기
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>순서를 다시 섞을까요?</AlertDialogTitle>
                  <AlertDialogDescription>
                    모든 평가자의 산출물 평가 순서가 새로 섞입니다. 이미 평가한
                    기록은 유지돼요.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={() => shuffleMutation.mutate()}>
                    다시 섞기
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button
              className="w-full rounded-xl active:scale-95 sm:w-auto"
              disabled={busy}
              onClick={() => shuffleMutation.mutate()}
            >
              <Shuffle className="h-4 w-4" /> 평가 셔플 & 개시
            </Button>
          )}

          {board.evalOpen && (
            <Button
              variant="outline"
              className="w-full rounded-xl active:scale-95 sm:w-auto"
              disabled={busy}
              onClick={() => closeMutation.mutate()}
            >
              <Lock className="h-4 w-4" /> 평가 마감
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function CriteriaManager({ categoryId }: { categoryId: string }) {
  const queryClient = useQueryClient();
  const { data: criteria = [] } = useQuery(criteriaQueryOptions(categoryId, false));
  const createFn = useServerFn(createCriterion);
  const updateFn = useServerFn(updateCriterion);
  const deleteFn = useServerFn(deleteCriterion);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["criteria", categoryId] });

  const [name, setName] = useState("");
  const [maxScore, setMaxScore] = useState(5);

  const addMutation = useMutation({
    mutationFn: () =>
      createFn({
        data: { categoryId, criterionName: name.trim(), maxScore, adminPassword: getAdminPassword() },
      }),
    onSuccess: () => {
      invalidate();
      setName("");
      setMaxScore(5);
      toast.success("평가 기준이 추가되었어요.");
    },
    onError: () => toast.error("추가 중 문제가 발생했어요."),
  });

  const toggleMutation = useMutation({
    mutationFn: (v: { id: string; isActive: boolean }) =>
      updateFn({ data: { id: v.id, isActive: v.isActive, adminPassword: getAdminPassword() } }),
    onSuccess: invalidate,
    onError: () => toast.error("변경 중 문제가 발생했어요."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id, adminPassword: getAdminPassword() } }),
    onSuccess: () => {
      invalidate();
      toast.success("평가 기준이 삭제되었어요.");
    },
    onError: () => toast.error("삭제 중 문제가 발생했어요."),
  });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">평가 기준 추가</h2>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              toast.error("기준 이름을 입력해주세요.");
              return;
            }
            addMutation.mutate();
          }}
          className="grid gap-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
        >
          <div className="space-y-2">
            <Label htmlFor="cname">기준 이름</Label>
            <Input
              id="cname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 창의성"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cmax">만점</Label>
            <Input
              id="cmax"
              type="number"
              min={1}
              max={100}
              value={maxScore}
              onChange={(e) => setMaxScore(Math.max(1, Math.min(100, Number(e.target.value))))}
              className="rounded-xl"
            />
          </div>
          <Button
            type="submit"
            disabled={addMutation.isPending}
            className="rounded-xl active:scale-95"
          >
            <Plus className="h-4 w-4" />
            추가
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">기준 목록</h2>
        {criteria.length === 0 ? (
          <EmptyState
            icon={SlidersHorizontal}
            title="아직 등록된 평가 기준이 없어요."
            description="위 폼으로 첫 번째 루브릭 기준을 추가해보세요."
          />
        ) : (
          <div className="space-y-3">
            {criteria.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-4 rounded-2xl bg-card p-5 shadow-sm"
              >
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-foreground">
                    {c.criterionName}
                  </h3>
                  <p className="text-sm text-muted-foreground">만점 {c.maxScore}점</p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={c.isActive}
                      onCheckedChange={(v) =>
                        toggleMutation.mutate({ id: c.id, isActive: v })
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      {c.isActive ? "활성" : "비활성"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(c.id)}
                    className="rounded-xl text-destructive hover:bg-destructive/10 active:scale-95"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ReviewAllowlistCard({ board }: { board: CategoryDTO }) {
  const queryClient = useQueryClient();
  const adminPassword = getAdminPassword();
  const { data: entries = [] } = useQuery(
    reviewAllowlistQueryOptions(board.id, adminPassword),
  );
  const addFn = useServerFn(addReviewAllowlistName);
  const addBulkFn = useServerFn(addReviewAllowlistNames);
  const removeFn = useServerFn(removeReviewAllowlistName);
  const toggleFn = useServerFn(setReviewAllowlistOnly);
  const [name, setName] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const parsedBulkNames = bulkText
    .split(/[\n,\t]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const uniqueBulkCount = new Set(
    parsedBulkNames.map((s) => s.toLowerCase()),
  ).size;

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: ["review-allowlist", board.id] });

  const addMutation = useMutation({
    mutationFn: () =>
      addFn({
        data: { categoryId: board.id, reviewerName: name.trim(), adminPassword },
      }),
    onSuccess: () => {
      invalidateList();
      setName("");
      toast.success("평가자 명단에 추가했어요.");
    },
    onError: () => toast.error("추가 중 문제가 발생했어요."),
  });

  const addBulkMutation = useMutation({
    mutationFn: () =>
      addBulkFn({
        data: {
          categoryId: board.id,
          reviewerNames: parsedBulkNames,
          adminPassword,
        },
      }),
    onSuccess: (res) => {
      invalidateList();
      setBulkText("");
      setBulkOpen(false);
      toast.success(`${res?.added ?? 0}명을 명단에 추가했어요.`);
    },
    onError: () => toast.error("일괄 추가 중 문제가 발생했어요."),
  });



  const removeMutation = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id, adminPassword } }),
    onSuccess: () => {
      invalidateList();
      toast.success("명단에서 삭제했어요.");
    },
    onError: () => toast.error("삭제 중 문제가 발생했어요."),
  });

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      toggleFn({ data: { id: board.id, enabled, adminPassword } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: () => toast.error("변경 중 문제가 발생했어요."),
  });

  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <UserCheck className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">평가자 명단</h2>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-xl bg-muted/50 p-4">
        <div className="min-w-0">
          <p className="font-medium text-foreground">
            명단에 있는 닉네임만 평가 허용
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            켜면 아래 명단의 닉네임만 이 카테고리 산출물을 평가할 수 있어요.
          </p>
        </div>
        <Switch
          checked={board.reviewAllowlistOnly}
          onCheckedChange={(v) => toggleMutation.mutate(v)}
          disabled={toggleMutation.isPending}
        />
      </div>

      {board.reviewAllowlistOnly && entries.length === 0 && (
        <p className="mt-3 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive">
          명단이 비어 있어 현재 아무도 평가할 수 없어요. 닉네임을 추가해 주세요.
        </p>
      )}
      {!board.reviewAllowlistOnly && (
        <p className="mt-3 text-sm text-muted-foreground">
          현재는 누구나 평가할 수 있어요. 명단으로 제한하려면 위 스위치를 켜세요.
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) {
            toast.error("닉네임을 입력해주세요.");
            return;
          }
          addMutation.mutate();
        }}
        className="mt-4 flex gap-2"
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="평가자 닉네임"
          className="rounded-xl"
        />
        <Button
          type="submit"
          disabled={addMutation.isPending}
          className="shrink-0 rounded-xl active:scale-95"
        >
          <Plus className="h-4 w-4" />
          추가
        </Button>
      </form>

      {entries.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm text-secondary-foreground"
            >
              <span className="truncate">{e.reviewerName}</span>
              <button
                type="button"
                onClick={() => removeMutation.mutate(e.id)}
                className="text-muted-foreground transition-colors hover:text-destructive"
                aria-label={`${e.reviewerName} 삭제`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CategoryReviewsCard({ categoryId }: { categoryId: string }) {
  const queryClient = useQueryClient();
  const adminPassword = getAdminPassword();
  const { data: reviews = [] } = useQuery(
    categoryReviewsQueryOptions(categoryId, adminPassword),
  );
  const deleteFn = useServerFn(deleteReview);
  const [expanded, setExpanded] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id, adminPassword } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-reviews", categoryId] });
      toast.success("평가를 삭제했어요.");
    },
    onError: () => toast.error("삭제 중 문제가 발생했어요."),
  });

  // 평가자별 집계 (닉네임 정규화 없이 표시명 그대로)
  const byReviewer = new Map<
    string,
    { count: number; latest: string }
  >();
  for (const r of reviews) {
    const cur = byReviewer.get(r.reviewerName);
    if (!cur) {
      byReviewer.set(r.reviewerName, { count: 1, latest: r.createdAt });
    } else {
      cur.count += 1;
      if (r.createdAt > cur.latest) cur.latest = r.createdAt;
    }
  }
  const reviewers = Array.from(byReviewer.entries()).sort((a, b) =>
    a[0].localeCompare(b[0], "ko"),
  );

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">평가 현황 점검</h2>
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">아직 제출된 평가가 없어요.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            참여 평가자{" "}
            <span className="font-semibold text-foreground">
              {reviewers.length}명
            </span>{" "}
            · 평가 {reviews.length}건
          </p>

          <ul className="mt-3 space-y-2">
            {reviewers.map(([rname, info]) => (
              <li
                key={rname}
                className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-2.5 text-sm"
              >
                <span className="truncate font-medium text-foreground">{rname}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {info.count}개 평가 · 최근 {fmtDate(info.latest)}
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-4 flex items-center gap-1 text-sm font-medium text-primary"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expanded && "rotate-180",
              )}
            />
            개별 평가 {expanded ? "접기" : "보기 / 삭제"}
          </button>

          {expanded && (
            <ul className="mt-3 space-y-2">
              {reviews.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {r.reviewerName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.postNo != null ? `#${r.postNo} ` : ""}
                      {r.postTitle} · {fmtDate(r.createdAt)}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 rounded-xl text-destructive hover:bg-destructive/10 active:scale-95"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>이 평가를 삭제할까요?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {r.reviewerName}님이 「{r.postTitle}」에 남긴 평가가
                          삭제됩니다. 되돌릴 수 없어요.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(r.id)}
                        >
                          삭제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
