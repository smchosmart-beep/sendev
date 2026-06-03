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
            variant="sec