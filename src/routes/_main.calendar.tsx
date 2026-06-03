import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  CalendarDays,
  Paperclip,
  LinkIcon,
  Plus,
  X,
  Loader2,
  Download,
} from "lucide-react";

import { eventsQueryOptions } from "@/lib/platform.queries";
import {
  createEvent,
  uploadEventFile,
  type EventDTO,
  type EventAttachment,
  type EventLink,
} from "@/lib/platform.functions";
import { getHolidayName } from "@/lib/holidays";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function CalendarPage() {
  const { data: events } = useSuspenseQuery(eventsQueryOptions());
  const queryClient = useQueryClient();
  const createEventFn = useServerFn(createEvent);
  const uploadFileFn = useServerFn(uploadEventFile);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<EventDTO | null>(null);

  // Create dialog state
  const [createDate, setCreateDate] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<EventAttachment[]>([]);
  const [links, setLinks] = useState<EventLink[]>([]);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const resetCreateForm = () => {
    setTitle("");
    setTime("");
    setLocation("");
    setDescription("");
    setAttachments([]);
    setLinks([]);
    setLinkLabel("");
    setLinkUrl("");
  };

  const openCreate = (iso: string) => {
    resetCreateForm();
    setCreateDate(iso);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}: 10MB를 넘는 파일은 업로드할 수 없어요.`);
          continue;
        }
        const dataBase64 = await fileToBase64(file);
        const att = await uploadFileFn({
          data: {
            name: file.name,
            contentType: file.type || "application/octet-stream",
            dataBase64,
          },
        });
        setAttachments((prev) => [...prev, att]);
      }
    } catch (err) {
      toast.error(`파일 업로드 실패: ${(err as Error).message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addLink = () => {
    if (!linkUrl.trim()) return;
    let url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    setLinks((prev) => [...prev, { label: linkLabel.trim() || url, url }]);
    setLinkLabel("");
    setLinkUrl("");
  };

  const submitCreate = async () => {
    if (!createDate || !title.trim()) {
      toast.error("제목을 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      await createEventFn({
        data: {
          title: title.trim(),
          date: createDate,
          time: time.trim(),
          location: location.trim(),
          description: description.trim(),
          attachments,
          links,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("일정을 추가했어요.");
      setCreateDate(null);
      resetCreateForm();
    } catch (err) {
      toast.error(`일정 추가 실패: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
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
              <button
                key={idx}
                type="button"
                onClick={() => openCreate(iso)}
                className={cn(
                  "group flex flex-col overflow-hidden rounded-xl p-2 text-left transition-all duration-200",
                  isToday ? "bg-accent" : "hover:bg-muted",
                )}
                title={holidayName ? `${holidayName} · 클릭하여 일정 추가` : "클릭하여 일정 추가"}
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
                  <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                {holidayName && (
                  <span className="mb-1 truncate text-xs font-medium text-destructive">
                    {holidayName}
                  </span>
                )}
                <div className="space-y-1 overflow-y-auto">
                  {dayEvents.map((e) => (
                    <span
                      key={e.id}
                      role="button"
                      tabIndex={0}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setSelected(e);
                      }}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter") {
                          ev.stopPropagation();
                          setSelected(e);
                        }
                      }}
                      className="block w-full truncate rounded-lg bg-primary/10 px-2 py-1 text-left text-sm font-medium text-primary transition-all duration-200 hover:bg-primary/20 active:scale-95"
                    >
                      {e.title}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {events.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title="아직 등록된 일정이 없어요."
          description="날짜 칸을 클릭해서 새 일정을 추가할 수 있어요."
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
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-foreground transition-colors hover:bg-accent"
                    >
                      <Download className="h-4 w-4 text-primary" />
                      <span className="truncate">{a.name}</span>
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
                      className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-primary transition-colors hover:bg-accent"
                    >
                      <LinkIcon className="h-4 w-4" />
                      <span className="truncate">{l.label}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={!!createDate} onOpenChange={(o) => !o && setCreateDate(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>새 일정 추가 · {createDate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="ev-title">제목 *</Label>
              <Input
                id="ev-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="행사 이름"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ev-time">시간</Label>
                <Input
                  id="ev-time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="예: 오후 2시"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-loc">장소</Label>
                <Input
                  id="ev-loc"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="예: 온라인 / 서울"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-desc">메모</Label>
              <Textarea
                id="ev-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="안내 사항을 적어주세요."
                rows={4}
              />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label>파일 첨부 (hwp, pdf 등 · 최대 10MB)</Label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <Button
                type="button"
                variant="secondary"
                className="w-full rounded-xl"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="mr-2 h-4 w-4" />
                )}
                파일 선택
              </Button>
              {attachments.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
                >
                  <Paperclip className="h-4 w-4 text-primary" />
                  <span className="flex-1 truncate">{a.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    aria-label="첨부 삭제"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>

            {/* Links */}
            <div className="space-y-2">
              <Label>링크 첨부</Label>
              <div className="flex gap-2">
                <Input
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  placeholder="이름 (선택)"
                  className="w-1/3"
                />
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addLink();
                    }
                  }}
                  placeholder="https://..."
                  className="flex-1"
                />
                <Button type="button" variant="secondary" onClick={addLink}>
                  추가
                </Button>
              </div>
              {links.map((l, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
                >
                  <LinkIcon className="h-4 w-4 text-primary" />
                  <span className="flex-1 truncate">{l.label}</span>
                  <button
                    type="button"
                    onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label="링크 삭제"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateDate(null)}>
              취소
            </Button>
            <Button onClick={submitCreate} disabled={saving || uploading}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              일정 저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
