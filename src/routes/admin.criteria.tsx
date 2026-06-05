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
} from "lucide-react";
import { toast } from "sonner";

import {
  categoriesQueryOptions,
  criteriaQueryOptions,
  postsQueryOptions,
} from "@/lib/platform.queries";
import {
  createCriterion,
  updateCriterion,
  deleteCriterion,
  shuffleEvaluation,
  closeEvaluation,
} from "@/lib/platform.functions";
import type { CategoryDTO } from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  // 산출물 게시판이 활성화된 게시판만 평가 기준 대상으로 노출합니다.
  const projectCategories = categories.filter((c) => c.enableProject);
  const [selected, setSelected] = useState<string | null>(
    projectCategories[0]?.id ?? null,
  );

  if (projectCategories.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="산출물 게시판이 있는 게시판이 없어요."
        description="평가 기준은 산출물 게시판이 활성화된 게시판에서만 설정할 수 있어요."
      />
    );
  }

  const activeBoard =
    projectCategories.find((c) => c.id === selected) ?? projectCategories[0];
  const activeId = activeBoard.id;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-card p-6 shadow-sm">
        <Label htmlFor="c-board" className="mb-3 block">게시판 선택</Label>
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
    </div>
  );
}

function BoardEvalCard({ board }: { board: CategoryDTO }) {
  const queryClient = useQueryClient();
  const shuffle = useServerFn(shuffleEvaluation);
  const close = useServerFn(closeEvaluation);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: posts = [] } = useQuery(postsQueryOptions(board.id));
  const projectCount = posts.filter((p) => p.type === "project").length;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const shuffleMutation = useMutation({
    mutationFn: () => shuffle({ data: { id: board.id } }),
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
    mutationFn: () => close({ data: { id: board.id } }),
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
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

        <div className="flex items-center gap-2">
          {board.evalOpen ? (
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="secondary"
                  className="rounded-xl active:scale-95"
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
              className="rounded-xl active:scale-95"
              disabled={busy}
              onClick={() => shuffleMutation.mutate()}
            >
              <Shuffle className="h-4 w-4" /> 평가 셔플 & 개시
            </Button>
          )}

          {board.evalOpen && (
            <Button
              variant="outline"
              className="rounded-xl active:scale-95"
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
        data: { categoryId, criterionName: name.trim(), maxScore },
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
      updateFn({ data: { id: v.id, isActive: v.isActive } }),
    onSuccess: invalidate,
    onError: () => toast.error("변경 중 문제가 발생했어요."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
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
