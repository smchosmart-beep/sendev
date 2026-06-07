import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  CalendarDays,
  Users,
  LinkIcon,
  Download,
  List,
  LayoutGrid,
} from "lucide-react";

import { eventsQueryOptions } from "@/lib/platform.queries";
import { type EventDTO } from "@/lib/platform.functions";
import { getHolidayName } from "@/lib/holidays";
import { EmptyState } from "@/components/EmptyState";
import { KakaoMap } from "@/components/KakaoMap";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_main/calendar")({
  validateSearch: (search: Record<string, unknown>) => {
    const date =
      typeof search.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.date)
        ? search.date
        : undefined;
    return { date };
  },
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
  const { date: dateParam } = Route.useSearch();

  const today = new Date();
  const initial = dateParam
    ? (() => {
        const [y, m] = dateParam.split("-").map(Number);
        return { year: y, month: m - 1 };
      })()
    : { year: today.getFullYear(), month: today.getMonth() };
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const [selected, setSelected] = useState<EventDTO | null>(null);
  const [mobileView, setMobileView] = useState<"calendar" | "list">("calendar");
  const [selectedDay, setSelectedDay] = useState<string | null>(dateParam ?? null);


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
    setSelectedDay(null);
  };

  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const monthEvents = useMemo(
    () =>
      events
        .filter((e) => e.date.startsWith(monthPrefix))
        .sort((a, b) =>
          a.date === b.date
            ? (a.time ?? "").localeCompare(b.time ?? "")
            : a.date.localeCompare(b.date),
        ),
    [events, monthPrefix],
  );

  const activeDay =
    selectedDay ?? (todayIso.startsWith(monthPrefix) ? todayIso : null);
  const activeDayEvents = activeDay ? eventsByDate.get(activeDay) ?? [] : [];

  const isoWeekday = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).getDay();
  };

  const formatDayLabel = (iso: string) => {
    const d = Number(iso.split("-")[2]);
    return `${d}일 (${WEEKDAYS[isoWeekday(iso)]})`;
  };



  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col gap-4 sm:h-[calc(100vh-6rem)]">
      <div className="flex flex-nowrap items-center justify-between gap-2">
        <h1 className="whitespace-nowrap text-xl font-bold text-foreground sm:text-3xl">
          Dev 캘린더
        </h1>
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
          <span className="w-28 text-center text-base font-semibold text-foreground sm:w-36 sm:text-xl">
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

      {/* Mobile view toggle */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 sm:hidden">
        <button
          type="button"
          onClick={() => setMobileView("calendar")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors",
            mobileView === "calendar"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground",
          )}
        >
          <LayoutGrid className="h-4 w-4" />
          달력
        </button>
        <button
          type="button"
          onClick={() => setMobileView("list")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors",
            mobileView === "list"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground",
          )}
        >
          <List className="h-4 w-4" />
          목록
        </button>
      </div>



      <div className="hidden flex-1 flex-col rounded-2xl bg-card p-2 shadow-sm sm:flex sm:p-6">
        <div className="mb-2 grid grid-cols-7 gap-1 sm:mb-3 sm:gap-2">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={cn(
                "py-1 text-center text-xs font-semibold sm:py-2 sm:text-sm",
                i === 0 ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {w}
            </div>
          ))}
        </div>
        <div
          className="grid flex-1 grid-cols-7 gap-1 sm:gap-2"
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
                  "flex flex-col overflow-hidden rounded-lg p-1 sm:rounded-xl sm:p-2",
                  isToday ? "bg-accent/50" : "",
                )}
                title={holidayName ?? undefined}
              >
                <div className="mb-0.5 flex items-center justify-between sm:mb-1">
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium sm:h-8 sm:min-w-8 sm:px-1 sm:text-sm",
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
                  <span className="mb-0.5 truncate text-[10px] font-medium text-destructive sm:mb-1 sm:text-xs">
                    {holidayName}
                  </span>
                )}
                <div className="space-y-0.5 overflow-y-auto sm:space-y-1">
                  {dayEvents.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setSelected(e)}
                      className="block w-full truncate rounded-md bg-primary/10 px-1 py-0.5 text-left text-[10px] font-medium text-primary transition-all duration-200 hover:bg-primary/20 active:scale-95 sm:rounded-lg sm:px-2 sm:py-1 sm:text-sm"
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

      {/* Mobile: calendar view (dot markers + selected day list) */}
      {mobileView === "calendar" && (
        <div className="flex flex-col gap-4 sm:hidden">
          <div className="rounded-2xl bg-card p-2 shadow-sm">
            <div className="mb-2 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((w, i) => (
                <div
                  key={w}
                  className={cn(
                    "py-1 text-center text-xs font-semibold",
                    i === 0 ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => {
                if (day === null) return <div key={idx} />;
                const iso = toIso(viewYear, viewMonth, day);
                const dayEvents = eventsByDate.get(iso) ?? [];
                const isToday = iso === todayIso;
                const isActive = iso === activeDay;
                const weekday = (firstWeekday + day - 1) % 7;
                const holidayName = getHolidayName(iso);
                const isRed = weekday === 0 || !!holidayName;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDay(iso)}
                    title={holidayName ?? undefined}
                    className={cn(
                      "flex aspect-square flex-col items-center justify-start gap-1 rounded-lg py-1.5 transition-colors",
                      isActive ? "bg-accent" : "active:bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : isRed
                            ? "text-destructive"
                            : "text-foreground",
                      )}
                    >
                      {day}
                    </span>
                    <span className="flex h-1.5 items-center gap-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          className="h-1.5 w-1.5 rounded-full bg-primary"
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-foreground">
              {activeDay ? formatDayLabel(activeDay) : "날짜를 선택하세요"} 일정
            </h2>
            {activeDay && activeDayEvents.length > 0 ? (
              <div className="space-y-2">
                {activeDayEvents.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setSelected(e)}
                    className="flex w-full flex-col gap-1 rounded-xl bg-muted/60 p-3 text-left transition-colors active:bg-muted"
                  >
                    <span className="font-medium text-foreground">{e.title}</span>
                    {(e.time || e.location) && (
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {e.time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {e.time}
                          </span>
                        )}
                        {e.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {e.location}
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                등록된 일정이 없어요.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Mobile: month list view */}
      {mobileView === "list" && (
        <div className="rounded-2xl bg-card p-4 shadow-sm sm:hidden">
          {monthEvents.length > 0 ? (
            <div className="space-y-2">
              {monthEvents.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelected(e)}
                  className="flex w-full items-start gap-3 rounded-xl bg-muted/60 p-3 text-left transition-colors active:bg-muted"
                >
                  <span className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-primary/10 py-1 text-primary">
                    <span className="text-base font-bold leading-none">
                      {Number(e.date.split("-")[2])}
                    </span>
                    <span className="text-[10px]">
                      {WEEKDAYS[isoWeekday(e.date)]}
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-medium text-foreground">
                      {e.title}
                    </span>
                    {(e.time || e.location) && (
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {e.time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {e.time}
                          </span>
                        )}
                        {e.location && (
                          <span className="flex min-w-0 items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{e.location}</span>
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              이번 달 등록된 일정이 없어요.
            </p>
          )}
        </div>
      )}




      {events.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title="아직 등록된 일정이 없어요."
          description="일정은 관리자 화면에서 등록할 수 있어요."
        />
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-[90vw] overflow-hidden rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 overflow-hidden pt-2 text-sm">
              {/* 모바일: 세로 1줄씩 / PC: 1열 날짜·시간, 2열 장소·대상 */}
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-foreground">
                  <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                  {selected.date}
                </div>
                {selected.time && (
                  <div className="flex items-center gap-2 text-foreground">
                    <Clock className="h-4 w-4 shrink-0 text-primary" />
                    {selected.time}
                  </div>
                )}
              </div>
              {selected.location && (
                <div className="flex items-center gap-2 text-foreground">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  {selected.location}
                </div>
              )}
              {selected.latitude != null && selected.longitude != null && (
                <div className="space-y-1">
                  {selected.placeAddress && (
                    <p className="pl-6 text-sm text-muted-foreground">
                      {selected.placeAddress}
                    </p>
                  )}
                  <KakaoMap
                    lat={selected.latitude}
                    lng={selected.longitude}
                    name={selected.location}
                    className="h-48 w-full rounded-md border border-border"
                  />
                </div>
              )}
              {selected.target && (
                <div className="flex items-center gap-2 text-foreground">
                  <Users className="h-4 w-4 shrink-0 text-primary" />
                  {selected.target}
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
