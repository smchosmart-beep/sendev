import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronRight, Circle } from "lucide-react";

import { voteVoterStatusQueryOptions } from "@/lib/platform.queries";
import { cn } from "@/lib/utils";

type Voter = { name: string; voted: boolean };

function VoterList({ voters }: { voters: Voter[] }) {
  return (
    <ul className="space-y-1">
      {voters.map((v) => (
        <li
          key={v.name}
          className={cn(
            "flex items-center gap-1.5 text-xs truncate",
            v.voted ? "font-semibold text-foreground" : "text-muted-foreground",
          )}
        >
          {v.voted ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          ) : (
            <Circle className="h-3 w-3 shrink-0 text-muted-foreground/50" />
          )}
          <span className="truncate">{v.name}</span>
        </li>
      ))}
    </ul>
  );
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-emerald-500 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

interface Props {
  categoryId: string;
  boardPassword?: string;
  adminPassword?: string;
  /** 진행 중일 때만 노출한다. */
  active: boolean;
}

export function VoteVoterPanel({
  categoryId,
  boardPassword = "",
  adminPassword = "",
  active,
}: Props) {
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    ...voteVoterStatusQueryOptions(categoryId, boardPassword, adminPassword),
    enabled: active,
  });

  const voters = data?.voters ?? [];
  if (!active || voters.length === 0) return null;

  const done = voters.filter((v) => v.voted).length;
  const total = voters.length;
  const half = Math.ceil(total / 2);
  const left = voters.slice(0, half);
  const right = voters.slice(half);

  return (
    <>
      {/* 2xl(1536px) 이상에서만 화면 좌우 가장자리에 고정 배치 */}
      <aside className="fixed left-3 top-28 z-20 hidden max-h-[70vh] w-56 overflow-y-auto rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur 2xl:block">
        <p className="mb-1 text-xs font-semibold">
          투표 현황 {done} / {total}
        </p>
        <div className="mb-2">
          <ProgressBar done={done} total={total} />
        </div>
        <VoterList voters={left} />
      </aside>
      <aside className="fixed right-3 top-28 z-20 hidden max-h-[70vh] w-56 overflow-y-auto rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur 2xl:block">
        <p className="mb-1 text-xs font-semibold text-transparent select-none">
          투표 현황 {done} / {total}
        </p>
        <div className="mb-2 opacity-0">
          <ProgressBar done={done} total={total} />
        </div>
        <VoterList voters={right} />
      </aside>

      {/* 1536px 미만에서는 목록 위 접이식 요약 패널로 대체 */}
      <div className="rounded-xl border bg-card p-3 2xl:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 text-sm font-semibold"
        >
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          투표 현황 {done} / {total} 완료
        </button>
        <div className="mt-2">
          <ProgressBar done={done} total={total} />
        </div>
        {open && (
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            <VoterList voters={left} />
            <VoterList voters={right} />
          </div>
        )}
      </div>
    </>
  );
}
