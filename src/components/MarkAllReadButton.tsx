import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { markAllPostsRead } from "@/lib/platform.functions";
import { useStoredIdentity } from "@/hooks/useNicknameIdentity";
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
} from "@/components/ui/alert-dialog";

type Props = {
  /** 지정하면 해당 게시판만, 없으면 사이트 전체를 읽음 처리한다. */
  categoryId?: string;
  /** 읽지 않은 글 수 — 0이면 버튼을 비활성화한다. */
  unreadCount: number;
  label?: string;
  className?: string;
};

export function MarkAllReadButton({
  categoryId,
  unreadCount,
  label = "모두 읽음 처리",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { identity } = useStoredIdentity();
  const author = identity?.author?.trim() ?? "";
  const markAll = useServerFn(markAllPostsRead);

  const mutation = useMutation({
    mutationFn: () =>
      markAll({ data: categoryId ? { author, categoryId } : { author } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["read-post-ids"] });
      toast.success("읽음 처리했어요.");
      setOpen(false);
    },
    onError: (e: unknown) => {
      toast.error(
        e instanceof Error ? e.message : "읽음 처리에 실패했어요.",
      );
    },
  });

  // 닉네임이 등록되지 않았으면 읽음 표시 자체가 없으므로 버튼도 숨긴다.
  if (author.length === 0) return null;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className={className ?? "h-9 rounded-xl active:scale-95"}
        disabled={unreadCount === 0 || mutation.isPending}
        onClick={() => setOpen(true)}
        aria-label={label}
      >
        {mutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCheck className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">{label}</span>
        {unreadCount > 0 && (
          <span className="ml-1 text-xs font-semibold text-muted-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>모두 읽음으로 표시할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {categoryId
                ? "이 게시판의 모든 글을 읽음으로 표시합니다. 되돌릴 수 없어요."
                : "사이트의 모든 글을 읽음으로 표시합니다. 되돌릴 수 없어요."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "처리 중..." : "읽음 처리"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
