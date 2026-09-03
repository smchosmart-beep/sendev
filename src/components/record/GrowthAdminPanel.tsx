// 관리자 활동기록 현황 — 성장형(개인) 전용 패널
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, FileSpreadsheet, Loader2, RefreshCw, Table2 } from "lucide-react";

import { categoriesQueryOptions } from "@/lib/platform.queries";
import { getGrowthOverview } from "@/lib/record-growth.functions";
import {
  GROWTH_ALL_FIELDS,
  growthCompletionPercent,
  GROWTH_STEP_META,
  growthStepProgress,
} from "@/lib/record-growth-schema";
import { getAdminPassword } from "@/lib/admin-auth";
import { cn } from "@/lib/utils";

const INPUT_STEPS = GROWTH_STEP_META.filter((s) => s.id !== "readme" && s.id !== "casebook");

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function GrowthAdminPanel() {
  const fetchOverview = useServerFn(getGrowthOverview);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const { data: categories, isLoading: categoriesLoading } = useQuery(categoriesQueryOptions());

  const growthCategories = useMemo(
    () => (categories ?? []).filter((c) => c.enableRecord && c.recordKind === "growth"),
    [categories],
  );
  const selected = growthCategories.find((c) => c.id === categoryId);

  const { data: items, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["growthOverview", categoryId],
    queryFn: () =>
      fetchOverview({ data: { categoryId: categoryId!, adminPassword: getAdminPassword() } }),
    enabled: !!categoryId,
  });

  const handleExcel = async () => {
    if (!items || items.length === 0) return;
    const XLSX = await import("xlsx");
    const rows = items.map((it) => {
      const base: Record<string, string | number> = {
        번호: it.postNo,
        제목: it.title,
        작성자: it.author,
        "완성도(%)": growthCompletionPercent(it.data),
        "최종 수정자": it.updatedBy,
        "최종 수정 시각": it.updatedAt
          ? new Date(it.updatedAt).toLocaleString("ko-KR")
          : "",
      };
      for (const step of INPUT_STEPS) {
        const p = growthStepProgress(it.data, step.id);
        base[`${step.no} ${step.name}`] = `${p.done}/${p.total}`;
      }
      for (const f of GROWTH_ALL_FIELDS) base[f.label] = it.data[f.key] ?? "";
      base["핵심 기능"] = it.data.features.join(" | ");
      base["사용 흐름"] = it.data.flow.join(" | ");
      base["윤리 원칙"] = it.data.ethics.join(", ");
      base["대표 이미지"] = it.data.heroImageUrl;
      return base;
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "성장형 활동기록");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    downloadBlob(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `활동기록_성장형_${selected?.slug ?? "board"}.xlsx`,
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">성장형 활동기록 현황</h2>
            <p className="text-xs text-muted-foreground">
              개인별 6단계 작성 진행률을 확인하고 원자료를 내려받습니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching || !categoryId}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              새로고침
            </button>
            <button
              type="button"
              onClick={() => void handleExcel()}
              disabled={!items || items.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              엑셀
            </button>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="growth-category" className="sr-only">
            성장형 활동기록 게시판 선택
          </label>
          <select
            id="growth-category"
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value || null)}
            disabled={categoriesLoading}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">성장형 게시판을 선택하세요</option>
            {growthCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {growthCategories.length === 0 && !categoriesLoading && (
            <p className="mt-2 text-xs text-muted-foreground">
              성장형 활동기록 게시판이 없습니다. 게시판 관리에서 유형을 성장형으로 설정해 주세요.
            </p>
          )}
        </div>
      </div>

      {isLoading && categoryId && (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">불러오는 중...</span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>현황을 불러오지 못했어요: {error.message}</span>
          </div>
        </div>
      )}

      {items && !isLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Table2 className="h-4 w-4" />
            <span>
              총 {items.length}명{selected ? ` · ${selected.name}` : ""}
            </span>
          </div>
          {items.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              아직 이 게시판에 성장형 활동기록이 없어요.
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[46rem] text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">번호</th>
                      <th className="px-3 py-2 text-left">제목</th>
                      <th className="px-3 py-2 text-left">작성자</th>
                      {INPUT_STEPS.map((s) => (
                        <th key={s.id} className="px-3 py-2 text-center">
                          {s.no} {s.name}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-center">완성도</th>
                      <th className="px-3 py-2 text-left">최종 수정</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.postId} className="border-t border-border">
                        <td className="px-3 py-2 text-muted-foreground">{it.postNo}</td>
                        <td className="px-3 py-2 font-medium text-foreground">{it.title}</td>
                        <td className="px-3 py-2 text-muted-foreground">{it.author}</td>
                        {INPUT_STEPS.map((s) => {
                          const p = growthStepProgress(it.data, s.id);
                          return (
                            <td
                              key={s.id}
                              className={cn(
                                "px-3 py-2 text-center text-xs",
                                p.complete ? "text-primary" : "text-muted-foreground",
                              )}
                            >
                              {p.done}/{p.total}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center font-semibold text-foreground">
                          {growthCompletionPercent(it.data)}%
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {it.updatedBy}
                          {it.updatedAt
                            ? ` · ${new Date(it.updatedAt).toLocaleString("ko-KR")}`
                            : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
