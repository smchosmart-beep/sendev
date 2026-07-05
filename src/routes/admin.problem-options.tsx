import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, PackageOpen } from "lucide-react";
import { toast } from "sonner";

import { problemOptionsQueryOptions } from "@/lib/platform.queries";
import { setProblemOptions } from "@/lib/platform.functions";
import { getAdminPassword } from "@/lib/admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/problem-options")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(problemOptionsQueryOptions()),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      선택지를 불러오지 못했어요: {error.message}
    </div>
  ),
  component: ProblemOptionsAdmin,
});

function ProblemOptionsAdmin() {
  const { data: options } = useSuspenseQuery(problemOptionsQueryOptions());
  const queryClient = useQueryClient();
  const save = useServerFn(setProblemOptions);

  const [areas, setAreas] = useState<string[]>(options.areas);
  const [frequencies, setFrequencies] = useState<string[]>(options.frequencies);

  useEffect(() => {
    setAreas(options.areas);
    setFrequencies(options.frequencies);
  }, [options]);

  const mutation = useMutation({
    mutationFn: () => {
      const cleanAreas = areas.map((a) => a.trim()).filter(Boolean);
      const cleanFreq = frequencies.map((f) => f.trim()).filter(Boolean);
      if (cleanAreas.length === 0 || cleanFreq.length === 0) {
        throw new Error("영역과 빈도를 각각 최소 1개 이상 입력해주세요.");
      }
      return save({
        data: {
          areas: cleanAreas,
          frequencies: cleanFreq,
          adminPassword: getAdminPassword(),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["problem-options"] });
      toast.success("선택지를 저장했어요!");
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "저장 중 문제가 발생했어요."),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <PackageOpen className="h-5 w-5 text-primary" />
          문제ZIP 선택지 관리
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          문제ZIP 게시판의 Q1(영역)·Q2(빈도) 버튼 항목을 편집해요. 이모지를 함께
          입력할 수 있어요.
        </p>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <OptionList
            title="Q1. 고통 영역"
            items={areas}
            setItems={setAreas}
            placeholder="예: 💊보건/건강"
          />
          <OptionList
            title="Q2. 발생 빈도"
            items={frequencies}
            setItems={setFrequencies}
            placeholder="예: 숨 쉴 때마다 (매일)"
          />
        </div>

        <div className="mt-8 flex justify-end">
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="rounded-xl active:scale-95"
          >
            {mutation.isPending ? "저장 중..." : "저장하기"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function OptionList({
  title,
  items,
  setItems,
  placeholder,
}: {
  title: string;
  items: string[];
  setItems: (v: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold text-foreground">{title}</Label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item}
              placeholder={placeholder}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                setItems(next);
              }}
              className="rounded-xl bg-background"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setItems(items.filter((_, idx) => idx !== i))}
              aria-label="삭제"
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setItems([...items, ""])}
        className="rounded-xl active:scale-95"
      >
        <Plus className="h-4 w-4" />
        항목 추가
      </Button>
    </div>
  );
}
