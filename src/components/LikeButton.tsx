import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { getLikeState, toggleLike } from "@/lib/platform.functions";
import { useStoredIdentity } from "@/hooks/useNicknameIdentity";
import { cn } from "@/lib/utils";

type LikeTarget = "post" | "comment";

// A like toggle button.
//
// Two modes:
// - Uncontrolled (default): fetches its own count/liked state keyed by the
//   target. Used on post detail and comments.
// - Controlled: when `count`/`liked` props are provided, the parent supplies
//   the initial state (e.g. from a single batched getLikeState call for a whole
//   list). The component skips its own query entirely and keeps count/liked in
//   local state, updating optimistically on toggle. This avoids N per-card
//   requests when rendering large lists (e.g. 문제ZIP boards).
//
// The liker is identified by the browser-stored nickname; if none is set we
// prompt the user to set one (no forced login).
export function LikeButton({
  targetType,
  targetId,
  size = "md",
  count,
  liked,
}: {
  targetType: LikeTarget;
  targetId: string;
  size?: "sm" | "md";
  count?: number;
  liked?: boolean;
}) {
  const controlled = count !== undefined || liked !== undefined;
  const { identity } = useStoredIdentity();
  const likerName = identity?.author ?? "";
  const queryClient = useQueryClient();
  const fetchState = useServerFn(getLikeState);
  const toggle = useServerFn(toggleLike);
  const [busy, setBusy] = useState(false);

  const queryKey = ["likeState", targetType, targetId, likerName];
  const { data } = useQuery({
    queryKey,
    queryFn: () =>
      fetchState({ data: { targetType, targetIds: [targetId], likerName } }),
    staleTime: 30_000,
    enabled: !controlled,
  });

  // Local state for controlled mode (seeded from props).
  const [local, setLocal] = useState<{ count: number; liked: boolean }>({
    count: count ?? 0,
    liked: liked ?? false,
  });

  const entry = controlled
    ? local
    : (data?.[targetId] ?? { count: 0, liked: false });

  const onClick = async () => {
    if (!likerName.trim()) {
      toast.error("좋아요를 누르려면 먼저 닉네임을 설정해주세요.", {
        description: "상단 메뉴의 ‘내 닉네임 설정’에서 등록할 수 있어요.",
      });
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const res = await toggle({
        data: { targetType, targetId, likerName },
      });
      if (controlled) {
        setLocal({ count: res.count, liked: res.liked });
      } else {
        queryClient.setQueryData(queryKey, {
          [targetId]: { count: res.count, liked: res.liked },
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "좋아요에 실패했어요.");
    } finally {
      setBusy(false);
    }
  };

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={entry.liked}
      aria-label="좋아요"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition-colors disabled:opacity-60",
        entry.liked
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-muted",
        size === "sm" && "px-2 py-0.5 text-xs",
      )}
    >
      <Heart
        className={cn(iconSize, entry.liked && "fill-current")}
      />
      <span className="tabular-nums">{entry.count}</span>
    </button>
  );
}
