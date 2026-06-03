import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, MapPin, Clock, CalendarDays } from "lucide-react";

import { useAdminStore, type AppEvent } from "@/lib/admin-store";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_main/calendar")({
  head: () => ({
    meta: [
      { title: "행사 캘린더 — 교사 개발자 플랫폼" },
      { name: "description", content: "교사 개발자 모임의 행사와 일정을 월간 달력으로 확인하세요." },
    ],
  }),
  component: CalendarPage,
});

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function toIso(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function CalendarPage() {
  const { events } = useAdminStore();
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<AppEvent | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, AppEvent[]>();
    for (const e of events) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [events]);

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayIso = toIso(today.getFullYear(), today.getMonth(), today.getDate());

  const goMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">행사 캘린더</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => goMonth(-1)}
            className="rounded-xl active:scale-95"
            aria-label="이전 달"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="w-32 text-center text-lg font-semibold text-foreground">
            {viewYear}년 {viewMonth + 1}월
          </span>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => goMonth(1)}
            className="rounded-xl active:scale-95"
            aria-label="다음 달"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-[28rem] w-full rounded-2xl" />
      ) : (
        <div className="rounded-2xl bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-2">
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className={cn(
                  "py-2 text-center text-xs font-semibold sm:text-sm",
                  i === 0 ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {cells.map((day, idx) => {
              if (day === null) return <div key={idx} className="min-h-16 sm:min-h-24" />;
              const iso = toIso(viewYear, viewMonth, day);
              const dayEvents = eventsByDate.get(iso) ?? [];
              const isToday = iso === todayIso;
              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-16 rounded-xl p-1.5 transition-all duration-200 sm:min-h-24 sm:p-2",
                    isToday ? "bg-accent" : "hover:bg-muted",
                  )}
                >
                  <div
                    className={cn(
                      "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium sm:text-sm",
                      isToday ? "bg-primary text-primary-foreground" : "text-foreground",
                    )}
                  >
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setSelected(e)}
                        className="block w-full truncate rounded-lg bg-primary/10 px-1.5 py-0.5 text-left text-[11px] font-medium text-primary transition-all duration-200 hover:bg-primary/20 active:scale-95"
                      >
                        {e.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && events.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title="아직 등록된 일정이 없어요."
          description="관리자 페이지에서 행사 일정을 추가할 수 있어요."
        />
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 pt-2 text-sm">
              <div className="flex items-center gap-2 text-foreground">
                <CalendarDays className="h-4 w-4 text-primary" />
                {selected.date}
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                {selected.time}
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                {selected.location}
              </div>
              <p className="rounded-xl bg-muted p-4 text-muted-foreground">
                {selected.description}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
