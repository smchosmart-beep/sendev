import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useSuspenseQuery,
  useQuery,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SlidersHorizontal, Plus, Trash2, LayoutGrid } from "lucide-react";
import { toast } from "sonner";

import {
  categoriesQueryOptions,
  criteriaQueryOptions,
} from "@/lib/platform.queries";
import {
  createCriterion,
  updateCriterion,
  deleteCriterion,
} from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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
  const [selected, setSelected] = useState<string | null>(
    categories[0]?.id ?? null,
  );

  if (categories.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="먼저 게시판을 만들어주세요."
        description="평가 기준은 게시판별로 설정됩니다."
      />
    );
  }

  const activeId = selected ?? categories[0].id;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-card p-6 shadow-sm">
        <Label className="mb-3 block">게시판 선택</Label>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={
                "rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 " +
                (c.id === activeId
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted text-muted-foreground hover:text-foreground")
              }
            >
              {c.name}
            </button>
          ))}
        </div>
      </section>

      <CriteriaManager key={activeId} categoryId={activeId} />
    </div>
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
