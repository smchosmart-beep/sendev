import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  CalendarDays,
  LinkIcon,
  Download,
} from "lucide-react";

import { eventsQueryOptions } from "@/lib/platform.queries";
import { type EventDTO } from "@/lib/platform.functions";
import { getHolidayName } from "@/lib/holidays";
import { EmptyState } from "@/components/EmptyState";
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
      { title: "Dev 캘린더 — 교사 개발자 플랫폼" },
      { name: "description", content: "교사 개발자 모임의 행사와 일정을 월간 달력으로 확인하세요." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQueryOptions()),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      일정을 불러오지 못했어요: {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-6 text-sm">페이지를 찾을 수 없어요.</div>,
  component: CalendarPage,
});

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function toIso(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function CalendarPage() {
  const { data: events } = useSuspenseQuery(eventsQueryOptions());

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<EventDTO | null>(null);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventDTO[]>();
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
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Dev 캘린더</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => goMonth(-1)}
            className="rounded-xl active:scale-95"
            aria-label="이전 달"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="w-36 text-center text-xl font-semibold text-foreground">
            {viewYear}년 {viewMonth + 1}월
          </span>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => goMonth(1)}
            className="rounded-xl active:scale-95"
            aria-label="다음 달"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col rounded-2xl bg-card p-6 shadow-sm">
        <div className="mb-3 grid grid-cols-7 gap-2">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={cn(
                "py-2 text-center text-sm font-semibold",
                i === 0 ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {w}
            </div>
          ))}
        </div>
        <div
          className="grid flex-1 grid-cols-7 gap-2"
          style={{ gridTemplateRows: `repeat(${cells.length / 7}, minmax(0, 1fr))` }}
        >
          {cells.map((day, idx) => {
            if (day === null) return <div key={idx} />;
            const iso = toIso(viewYear, viewMonth, day);
            const dayEvents = eventsByDate.get(iso) ?? [];
            const isToday = iso === todayIso;
            const weekday = (firstWeekday + day - 1) % 7;
            const holidayName = getHolidayName(iso);
            const isRed = weekday === 0 || !!holidayName;
            return (
              <div
                key={idx}
                className={cn(
                  "flex flex-col overflow-hidden rounded-xl p-2",
                  isToday ? "bg-accent" : "",
                )}
                title={holidayName ?? undefined}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex h-8 min-w-8 items-center justify-center rounded-full px-1 text-sm font-medium",
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : isRed
                          ? "text-destructive"
                          : "text-foreground",
                    )}
                  >
                    {day}
                  </span>
                </div>
                {holidayName && (
                  <span className="mb-1 truncate text-xs font-medium text-destructive">
                    {holidayName}
                  </span>
                )}
                <div className="space-y-1 overflow-y-auto">
                  {dayEvents.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setSelected(e)}
                      className="block w-full truncate rounded-lg bg-primary/10 px-2 py-1 text-left text-sm font-medium text-primary transition-all duration-200 hover:bg-primary/20 active:scale-95"
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

      {events.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title="아직 등록된 일정이 없어요."
          description="일정은 관리자 화면에서 등록할 수 있어요."
        />
      )}

      {/* Detail dialog */}
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
              {selected.time && (
                <div className="flex items-center gap-2 text-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  {selected.time}
                </div>
              )}
              {selected.location && (
                <div className="flex items-center gap-2 text-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  {selected.location}
                </div>
              )}
              {selected.description && (
                <p className="whitespace-pre-wrap rounded-xl bg-muted p-4 text-muted-foreground">
                  {selected.description}
                </p>
              )}
              {selected.attachments.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">첨부 파일</p>
                  {selected.attachments.map((a, i) => (
                    <a
                      key={i}
                      href={a.url.includes("download=") ? a.url : `${a.url}${a.url.includes("?") ? "&" : "?"}download=${encodeURIComponent(a.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full min-w-0 items-center gap-2 rounded-lg bg-muted px-3 py-2 text-foreground transition-colors hover:bg-accent"
                    >
                      <Download className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate">{a.name}</span>
                    </a>
                  ))}
                </div>
              )}
              {selected.links.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">링크</p>
                  {selected.links.map((l, i) => (
                    <a
                      key={i}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full min-w-0 items-center gap-2 rounded-lg bg-muted px-3 py-2 text-primary transition-colors hover:bg-accent"
                    >
                      <LinkIcon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{l.label}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
