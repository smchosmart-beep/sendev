import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  Clock,
  MapPin,
  Paperclip,
  LinkIcon,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { eventsQueryOptions } from "@/lib/platform.queries";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  uploadEventFile,
  type EventDTO,
  type EventAttachment,
  type EventLink,
} from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export const Route = createFileRoute("/admin/calendar")({
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQueryOptions()),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      일정을 불러오지 못했어요: {error.message}
    </div>
  ),
  component: AdminCalendarPage,
});

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

type Editing = { mode: "create" } | { mode: "edit"; event: EventDTO };

function AdminCalendarPage() {
  const queryClient = useQueryClient();
  const { data: events } = useSuspenseQuery(eventsQueryOptions());
  const createFn = useServerFn(createEvent);
  const updateFn = useServerFn(updateEvent);
  const deleteFn = useServerFn(deleteEvent);
  const uploadFileFn = useServerFn(uploadEventFile);

  const [editing, setEditing] = useState<Editing | null>(null);
  const [pendingDelete, setPendingDelete] = useState<EventDTO | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
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

  const sorted = useMemo(
    () => [...events].sort((a, b) => a.date.localeCompare(b.date)),
    [events],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["events"] });

  const openCreate = () => {
    setTitle("");
    setDate("");
    setTime("");
    setLocation("");
    setDescription("");
    setAttachments([]);
    setLinks([]);
    setLinkLabel("");
    setLinkUrl("");
    setEditing({ mode: "create" });
  };

  const openEdit = (event: EventDTO) => {
    setTitle(event.title);
    setDate(event.date);
    setTime(event.time);
    setLocation(event.location);
    setDescription(event.description);
    setAttachments(event.attachments);
    setLinks(event.links);
    setLinkLabel("");
    setLinkUrl("");
    setEditing({ mode: "edit", event });
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

  const submit = async () => {
    if (!editing) return;
    if (!title.trim()) {
      toast.error("제목을 입력해 주세요.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      toast.error("날짜를 선택해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        date,
        time: time.trim(),
        location: location.trim(),
        description: description.trim(),
        attachments,
        links,
      };
      if (editing.mode === "edit") {
        await updateFn({ data: { id: editing.event.id, ...payload } });
        toast.success("일정을 수정했어요.");
      } else {
        await createFn({ data: payload });
        toast.success("일정을 추가했어요.");
      }
      await invalidate();
      setEditing(null);
    } catch (err) {
      toast.error(`저장 실패: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteFn({ data: { id: pendingDelete.id } });
      await invalidate();
      toast.success("일정을 삭제했어요.");
    } catch (err) {
      toast.error(`삭제 실패: ${(err as Error).message}`);
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">캘린더 관리</h2>
          <p className="text-sm text-muted-foreground">
            행사 일정을 추가, 수정, 삭제할 수 있어요.
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          일정 추가
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="아직 등록된 일정이 없어요."
          description="‘일정 추가’ 버튼을 눌러 첫 일정을 등록해 보세요."
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-4 rounded-2xl bg-card p-5 shadow-sm"
            >
              <div className="flex-1 space-y-1">
                <h3 className="font-semibold text-foreground">{event.title}</h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    {event.date}
                  </span>
                  {event.time && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-primary" />
                      {event.time}
                    </span>
                  )}
                  {event.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-primary" />
                      {event.location}
                    </span>
                  )}
                  {event.attachments.length > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Paperclip className="h-4 w-4" />
                      {event.attachments.length}
                    </span>
                  )}
                  {event.links.length > 0 && (
                    <span className="flex items-center gap-1.5">
                      <LinkIcon className="h-4 w-4" />
                      {event.links.length}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-xl"
                  onClick={() => openEdit(event)}
                  aria-label="수정"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-xl text-destructive hover:text-destructive"
                  onClick={() => setPendingDelete(event)}
                  aria-label="삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-[90vw] overflow-y-auto overflow-x-hidden rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing?.mode === "edit" ? "일정 수정" : "새 일정 추가"}
            </DialogTitle>
            <DialogDescription>
              날짜, 시간, 장소, 메모와 파일/링크 첨부를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="min-w-0 space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="ev-title">제목 *</Label>
              <Input
                id="ev-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="행사 이름"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-date">날짜 *</Label>
              <Input
                id="ev-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
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
                  className="flex w-full min-w-0 items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
                >
                  <Paperclip className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate">{a.name}</span>
                  <button
                    type="button"
                    className="shrink-0"
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
                  className="flex w-full min-w-0 items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
                >
                  <LinkIcon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate">{l.label}</span>
                  <button
                    type="button"
                    className="shrink-0"
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
            <Button variant="ghost" onClick={() => setEditing(null)}>
              취소
            </Button>
            <Button onClick={submit} disabled={saving || uploading}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>일정을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title}” 일정을 삭제합니다. 이 작업은 되돌릴 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
