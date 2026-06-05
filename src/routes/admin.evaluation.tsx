import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useSuspenseQuery,
  useQuery,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Shuffle, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

import {
  categoriesQueryOptions,
  postsQueryOptions,
} from "@/lib/platform.queries";
import {
  shuffleEvaluation,
  closeEvaluation,
} from "@/lib/platform.functions";
import type { CategoryDTO } from "@/lib/platform.functions";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/admin/evaluation")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(categoriesQueryOptions()),
  component: EvaluationAdmin,
});

function EvaluationAdmin() {
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const boards = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">평가 진행 관리</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          게시판별로 평가를 개시하거나 마감할 수 있어요. 셔플을 누르면 평가가
          시작되고, 평가자마다 산출물 순서가 새로 섞입니다.
        </p>
      </div>

      <div className="space-y-3">
        {boards.map((board) => (
          <BoardEvalCard key={board.id} board={board} />
        ))}
      </div>
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
      toast.success(
        board.evalOpen
          ? "평가 순서를 다시 섞었어요."
          : "평가를 개시했어요!",
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
    <div className="rounded-2xl bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-foreground">
              {board.name}
            </h3>
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
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {board.projectName} {projectCount}개
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
                  <AlertDialogAction
                    onClick={() => shuffleMutation.mutate()}
                  >
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
    </div>
  );
}
