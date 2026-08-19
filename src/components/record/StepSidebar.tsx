import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import { BLOCK_STATUS_LABEL, summarize, type ProgressBlock } from "@/lib/record-progress";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<ProgressBlock["status"], string> = {
  empty: "text-muted-foreground/70",
  done: "text-primary",
  partial: "text-amber-600 dark:text-amber-400",
};

function useActiveBlock(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (els.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = ids.find((id) => visible.has(id));
        if (first) setActive(first);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids.join("|")]);

  return active;
}

function scrollToBlock(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function BlockList({
  blocks,
  active,
  onSelect,
}: {
  blocks: ProgressBlock[];
  active: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ol className="space-y-1">
      {blocks.map((b) => (
        <li key={b.id}>
          <button
            type="button"
            onClick={() => onSelect(b.id)}
            className={cn(
              "flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-muted",
              active === b.id && "bg-muted",
            )}
          >
            <span className="mt-0.5 shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {b.no}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium leading-tight break-keep text-foreground">
                {b.title}
              </span>
              <span className={cn("block text-[11px]", STATUS_CLASS[b.status])}>
                {BLOCK_STATUS_LABEL[b.status]}
                {b.meta ? ` · ${b.meta}` : ""}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

export function StepSidebar({ blocks }: { blocks: ProgressBlock[] }) {
  const ids = blocks.map((b) => b.id);
  const active = useActiveBlock(ids);
  const { done, total } = summarize(blocks);
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 넓은 화면: 본문 왼쪽 여백에 sticky */}
      <aside
        aria-label="작성 현황"
        className="absolute right-full top-0 mr-6 hidden h-full w-[240px] 2xl:block"
      >
        <div className="sticky top-24 rounded-2xl bg-card p-3 shadow-sm">
          <div className="px-2.5 pb-2">
            <p className="text-xs font-semibold text-foreground">작성 현황</p>
            <p className="text-[11px] text-muted-foreground">
              전체 {done}/{total} 작성완료
            </p>
          </div>
          <BlockList blocks={blocks} active={active} onSelect={scrollToBlock} />
        </div>
      </aside>

      {/* 좁은 화면: 접이식 카드 */}
      <div className="rounded-2xl bg-card shadow-sm 2xl:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 px-4 py-3"
        >
          <span className="text-sm font-semibold text-foreground">작성 현황</span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            {done}/{total} 작성완료
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </span>
        </button>
        {open && (
          <div className="px-2 pb-3">
            <BlockList
              blocks={blocks}
              active={active}
              onSelect={(id) => {
                setOpen(false);
                scrollToBlock(id);
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}
