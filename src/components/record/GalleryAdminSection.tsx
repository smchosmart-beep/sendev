// 관리자 활동기록 현황 — 나눔(온라인 갤러리 워크) 관리
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Shuffle, Sparkles, Undo2 } from "lucide-react";

import {
  aggregateGalleryStage,
  assignGalleryGroups,
  getGalleryAdminStatus,
  resetGalleryStage,
  setGalleryOpen,
} from "@/lib/record-gallery.functions";
import { getAdminPassword } from "@/lib/admin-auth";
import { Button } from "@/components/ui/button";

export function GalleryAdminSection({ categoryId }: { categoryId: string }) {
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getGalleryAdminStatus);
  const assign = useServerFn(assignGalleryGroups);
  const aggregate = useServerFn(aggregateGalleryStage);
  const reset = useServerFn(resetGalleryStage);
  const setOpen = useServerFn(setGalleryOpen);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["galleryAdmin", categoryId],
    queryFn: () => fetchStatus({ data: { categoryId, adminPassword: getAdminPassword() } }),
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["galleryAdmin", categoryId] });

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setMsg("");
    try {
      await fn();
      setMsg(done);
      refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "실패했어요.");
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = () => {
    if (
      data &&
      data.submittedTotal > 0 &&
      !window.confirm(
        `이미 제출된 평가 ${data.submittedTotal}건이 있습니다. 모둠을 다시 짜도 평가는 지워지지 않지만, 모둠이 바뀐 사람의 평가는 집계에서 빠집니다. 계속할까요?`,
      )
    ) {
      return;
    }
    void run(
      () => assign({ data: { categoryId, size: 6, adminPassword: getAdminPassword() } }),
      "모둠을 편성했어요.",
    );
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">나눔 관리 (온라인 갤러리 워크)</h3>
          <p className="text-xs text-muted-foreground">
            모둠 자동 편성 · 나눔 열기/닫기 · 전체 발표 4인 집계
          </p>
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {data && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy} onClick={handleAssign}>
              <Shuffle className="h-4 w-4" /> 자동 편성
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run(
                  () =>
                    setOpen({
                      data: {
                        categoryId,
                        open: !data.open,
                        adminPassword: getAdminPassword(),
                      },
                    }),
                  data.open ? "나눔을 닫았어요." : "나눔을 열었어요.",
                )
              }
            >
              {data.open ? "나눔 닫기" : "나눔 열기"}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run(
                  () => aggregate({ data: { categoryId, adminPassword: getAdminPassword() } }),
                  "전체 발표자를 확정했어요.",
                )
              }
            >
              <Sparkles className="h-4 w-4" /> 집계하기
            </Button>
            {data.stageCount > 0 && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => reset({ data: { categoryId, adminPassword: getAdminPassword() } }),
                    "집계를 되돌렸어요.",
                  )
                }
              >
                <Undo2 className="h-4 w-4" /> 집계 되돌리기
              </Button>
            )}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            참가 {data.participantCount}명 · 모둠 {data.groups.length}개 · 나눔{" "}
            {data.open ? "열림" : "닫힘"} · 발표자 {data.stageCount}명
          </p>
          {data.groups.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {data.groups.map((g) => (
                <li
                  key={g.number}
                  className="rounded-xl border border-border px-3 py-1.5 text-xs text-muted-foreground"
                >
                  {g.number}모둠 {g.memberCount}명 · 제출 {g.submittedCount}명
                </li>
              ))}
            </ul>
          )}
          {msg && <p className="mt-3 text-xs text-muted-foreground">{msg}</p>}
        </>
      )}
    </div>
  );
}
