import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StickyNote, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { useConfirm } from "@/hooks/useConfirm";
import { useNicknameIdentity } from "@/hooks/useNicknameIdentity";
import { cn } from "@/lib/utils";
import { hackathonReviewsQueryOptions } from "@/lib/platform.queries";
import {
  createHackathonReview,
  updateHackathonReview,
  deleteHackathonReview,
  type HackathonReviewDTO,
  type HackathonParticipantType,
} from "@/lib/platform.functions";

const TYPE_LABELS: Record<HackathonParticipantType, string> = {
  intro: "입문형",
  growth: "성장형",
  challenge: "도전형",
};

const TYPE_OPTIONS: { value: HackathonParticipantType; label: string }[] = [
  { value: "intro", label: "입문형" },
  { value: "growth", label: "성장형" },
  { value: "challenge", label: "도전형" },
];

// Maps a stored color key to its postit background token. Falls back to yellow.
const COLOR_BG: Record<string, string> = {
  yellow: "bg-postit-yellow",
  pink: "bg-postit-pink",
  green: "bg-postit-green",
  blue: "bg-postit-blue",
  purple: "bg-postit-purple",
  orange: "bg-postit-orange",
};

function colorClass(color: string): string {
  return COLOR_BG[color] ?? COLOR_BG.yellow;
}

// A single sticky note. Slight rotation gives the casual postit feel.
function ReviewCard({
  review,
  rotate,
  onEdit,
}: {
  review: HackathonReviewDTO;
  rotate: string;
  onEdit: (r: HackathonReviewDTO) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onEdit(review)}
      className={cn(
        "group block w-full rounded-md p-4 text-left text-postit-foreground shadow-md transition-transform duration-200 hover:scale-[1.03] hover:shadow-lg",
        colorClass(review.color),
      )}
      title="후기 수정/삭제"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-bold">
          {TYPE_LABELS[review.participantType]}
        </span>
        <Pencil className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-70" />
      </div>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
        {review.content}
      </p>
      <p className="mt-3 text-right text-xs font-semibold opacity-80">
        — {review.nickname}
      </p>
    </button>
  );
}

// Rotations cycle so adjacent notes don't all tilt the same way.
const ROTATIONS = ["-2deg", "1.5deg", "-1deg", "2deg", "-1.5deg", "1deg"];

interface DialogState {
  open: boolean;
  editing: HackathonReviewDTO | null;
}

export function HackathonReviewDialog({
  state,
  onOpenChange,
}: {
  state: DialogState;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const {
    author,
    setAuthor,
    nicknamePassword,
    setNicknamePassword,
    persistIdentity,
  } = useNicknameIdentity();

  const [participantType, setParticipantType] =
    useState<HackathonParticipantType>("intro");
  const [content, setContent] = useState("");

  const editing = state.editing;
  const isEdit = !!editing;

  // Sync form fields when opening for edit (or reset for create).
  useEffect(() => {
    if (!state.open) return;
    if (editing) {
      setAuthor(editing.nickname);
      setParticipantType(editing.participantType);
      setContent(editing.content);
    } else {
      setParticipantType("intro");
      setContent("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, editing?.id]);

  const createFn = useServerFn(createHackathonReview);
  const updateFn = useServerFn(updateHackathonReview);
  const deleteFn = useServerFn(deleteHackathonReview);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["hackathon-reviews"] });

  const createMut = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      persistIdentity();
      invalidate();
      toast.success("후기를 남겼어요. 고마워요!");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "저장 실패"),
  });

  const updateMut = useMutation({
    mutationFn: updateFn,
    onSuccess: () => {
      persistIdentity();
      invalidate();
      toast.success("후기를 수정했어요.");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "수정 실패"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => {
      invalidate();
      toast.success("후기를 삭제했어요.");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "삭제 실패"),
  });

  const busy = createMut.isPending || updateMut.isPending || deleteMut.isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = author.trim();
    if (!name) {
      toast.error("닉네임을 입력해주세요.");
      return;
    }
    if (!content.trim()) {
      toast.error("후기 내용을 입력해주세요.");
      return;
    }
    if (isEdit && editing) {
      updateMut.mutate({
        data: {
          id: editing.id,
          nickname: name,
          nicknamePassword,
          participantType,
          content: content.trim(),
        },
      });
    } else {
      createMut.mutate({
        data: {
          nickname: name,
          nicknamePassword,
          participantType,
          content: content.trim(),
        },
      });
    }
  };

  const onDelete = async () => {
    if (!editing) return;
    const ok = await confirm({
      title: "후기 삭제",
      description: "이 후기를 삭제할까요? 되돌릴 수 없어요.",
      confirmText: "삭제",
      destructive: true,
    });
    if (!ok) return;
    deleteMut.mutate({
      data: {
        id: editing.id,
        nickname: author.trim(),
        nicknamePassword,
      },
    });
  };

  return (
    <>
      <Dialog open={state.open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "후기 수정" : "해커톤 참가 후기 작성"}
            </DialogTitle>
            <DialogDescription>
              해커톤(입문형·성장형·도전형)에 글을 1개 이상 쓴 닉네임만 후기를 남길
              수 있어요. 닉네임과 비밀번호로 본인 확인을 합니다.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hr-nickname">닉네임</Label>
              <Input
                id="hr-nickname"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="닉네임"
                maxLength={100}
                disabled={isEdit}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hr-password">닉네임 비밀번호</Label>
              <PasswordInput
                id="hr-password"
                value={nicknamePassword}
                onChange={(e) => setNicknamePassword(e.target.value)}
                placeholder="닉네임 비밀번호 (4자 이상)"
                maxLength={100}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label>참가 유형</Label>
              <div className="flex gap-2">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setParticipantType(opt.value)}
                    className={cn(
                      "flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                      participantType === opt.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hr-content">후기 내용</Label>
              <textarea
                id="hr-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="해커톤에 참가한 소감을 자유롭게 적어주세요."
                maxLength={1000}
                rows={5}
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-right text-xs text-muted-foreground">
                {content.length}/1000
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              {isEdit && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onDelete}
                  disabled={busy}
                  className="rounded-xl text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  삭제
                </Button>
              )}
              <Button type="submit" disabled={busy} className="rounded-xl">
                {isEdit ? "수정 완료" : "후기 등록"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </>
  );
}

// Entry-point button placed next to the "해커톤" heading.
export function HackathonReviewButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="해커톤 후기 작성"
      title="해커톤 후기 작성"
      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-postit-yellow px-3 text-sm font-semibold text-postit-foreground shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
    >
      <StickyNote className="h-4 w-4" />
      후기
    </button>
  );
}

// Mobile: horizontal scrolling strip above the category list.
export function HackathonReviewStripMobile({
  onEdit,
}: {
  onEdit: (r: HackathonReviewDTO) => void;
}) {
  const { data: reviews = [] } = useQuery(hackathonReviewsQueryOptions());
  if (reviews.length === 0) return null;
  return (
    <div className="2xl:hidden">
      <div className="flex gap-3 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {reviews.map((r, i) => (
          <div key={r.id} className="w-56 shrink-0">
            <ReviewCard
              review={r}
              rotate={ROTATIONS[i % ROTATIONS.length]}
              onEdit={onEdit}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Desktop: two Padlet-style walls floating in the left/right margins, each a
// 2-column masonry. Only shown at 2xl and up, where there is room beside the
// max-w-5xl (32rem half-width) content so cards never cover the body.
export function HackathonReviewSideColumns({
  onEdit,
}: {
  onEdit: (r: HackathonReviewDTO) => void;
}) {
  const { data: reviews = [] } = useQuery(hackathonReviewsQueryOptions());

  const { left, right } = useMemo(() => {
    const left: HackathonReviewDTO[] = [];
    const right: HackathonReviewDTO[] = [];
    reviews.forEach((r, i) => (i % 2 === 0 ? left : right).push(r));
    return { left, right };
  }, [reviews]);

  if (reviews.length === 0) return null;

  const wall = (items: HackathonReviewDTO[], side: "left" | "right") => (
    <div
      className={cn(
        "fixed top-28 bottom-6 hidden w-[calc(50%-33rem)] overflow-y-auto px-1 xl:block [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        side === "left" ? "left-1" : "right-1",
      )}
    >
      <div className="columns-2 gap-2">
        {items.map((r) => (
          <div key={r.id} className="mb-2 break-inside-avoid">
            <ReviewCard review={r} rotate="0deg" onEdit={onEdit} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {wall(left, "left")}
      {wall(right, "right")}
    </>
  );
}

export type { HackathonReviewDTO };
