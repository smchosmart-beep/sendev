import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ClipboardList,
  FileSpreadsheet,
  FileArchive,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Users,
  Loader2,
  AlertCircle,
  Table2,
} from "lucide-react";

import { categoriesQueryOptions } from "@/lib/platform.queries";
import { getRecordOverview } from "@/lib/record.functions";
import type { RecordOverviewTeam } from "@/lib/record.functions";
import { getAdminPassword } from "@/lib/admin-auth";
import { cn } from "@/lib/utils";
import {
  buildRecordReadme,
  buildPublicReadme,
  buildOverviewReadme,
  sanitizeFolderName,
} from "@/lib/record-readme";
import { RECORD_FINAL_KEYS } from "@/lib/record-readme";
import { STANCE_QUESTIONS } from "@/lib/record-schema";


export const Route = createFileRoute("/admin/records")({
  head: () => ({
    meta: [
      { title: "활동기록 현황 — 관리자 대시보드" },
      {
        name: "description",
        content: "도전형 활동기록 팀별 작성 현황을 확인하고 엑셀/ZIP으로 내려받습니다.",
      },
      { property: "og:title", content: "활동기록 현황 — 관리자 대시보드" },
      {
        property: "og:description",
        content: "도전형 활동기록 팀별 작성 현황을 확인하고 엑셀/ZIP으로 내려받습니다.",
      },
    ],
  }),
  component: RecordOverviewPage,
});

const ROW_SECTIONS: {
  kind: RecordOverviewRowKind;
  title: string;
  short: string;
}[] = [
  { kind: "process", title: "문제 정의", short: "문제정의" },
  { kind: "feature", title: "핵심 기능", short: "핵심" },
  { kind: "flow", title: "사용 흐름", short: "흐름" },
  { kind: "limit", title: "지금의 한계", short: "한계" },
  { kind: "plan", title: "다음 계획", short: "계획" },
  { kind: "maker", title: "제작자", short: "제작자" },
  { kind: "devlog", title: "개발 과정", short: "개발" },
  { kind: "decision", title: "바꾼 판단", short: "판단" },
  { kind: "stuck", title: "막혔던 순간", short: "막힘" },
  { kind: "ai_use", title: "AI 활용", short: "AI활용" },
  { kind: "ai_error", title: "AI 실수", short: "AI실수" },
  { kind: "privacy", title: "정보 항목", short: "정보" },
] as const;

type RecordOverviewRowKind = RecordOverviewTeam["rows"][number]["kind"];

const FINAL_FIELDS_COUNT = RECORD_FINAL_KEYS.length;
const CHECK_ITEMS_COUNT = STANCE_QUESTIONS.length;

function finalFilledCount(final: RecordOverviewTeam["final"]): number {
  if (!final) return 0;
  return RECORD_FINAL_KEYS.filter(
    (k: string) => ((final as Record<string, string>)[k] ?? "").trim().length > 0,
  ).length;
}

function rowCountByKind(team: RecordOverviewTeam, kind: RecordOverviewRowKind): number {
  return team.rows.filter((r) => r.kind === kind).length;
}

function checkFilledCount(team: RecordOverviewTeam): number {
  return team.rows.filter(
    (r) => r.kind === "stance" && (r.col1 ?? "").trim().length > 0,
  ).length;
}


function reflectionStatus(team: RecordOverviewTeam) {
  const count = team.reflections.length;
  const memberCount = team.members.length;
  return { count, memberCount };
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function RecordOverviewPage() {
  const fetchOverview = useServerFn(getRecordOverview);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: categories, isLoading: categoriesLoading } = useQuery(
    categoriesQueryOptions(),
  );

  const recordCategories = useMemo(
    () => (categories ?? []).filter((c) => c.enableRecord),
    [categories],
  );

  const selectedCategory = useMemo(
    () => recordCategories.find((c) => c.id === categoryId),
    [recordCategories, categoryId],
  );

  const {
    data: overview,
    isLoading: overviewLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["recordOverview", categoryId],
    queryFn: () =>
      fetchOverview({
        data: { categoryId: categoryId!, adminPassword: getAdminPassword() },
      }),
    enabled: !!categoryId,
  });

  const toggleExpand = (postId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const handleExcelDownload = async () => {
    if (!overview || overview.teams.length === 0) return;
    const XLSX = await import("xlsx");

    const headers = [
      "팀번호",
      "팀이름",
      "팀원",
      "서비스 이름",
      "한 줄 소개",
      "누구를 위한 것인가요?",
      "어떤 문제를 풀었나요?",
      "어떻게 풀었나요?",
      "대표 이미지 주소",
      "배포 주소",
      "GitHub 주소",
      "사용한 도구",
      "환경변수 이름만",
      "마지막수정자",
      "마지막수정일",
      "핵심 기능",
      "사용 흐름",
      "지금의 한계",
      "다음 계획",
      "제작자",
      "문제 정의",
      "개발 과정",
      "교육적 점검",
      "개인 후기",
      "팀원 약속",
    ];

    const rows = overview.teams.map((team) => {
      const f = team.final;
      const counts = {
        feature: rowCountByKind(team, "feature"),
        flow: rowCountByKind(team, "flow"),
        limit: rowCountByKind(team, "limit"),
        plan: rowCountByKind(team, "plan"),
        maker: rowCountByKind(team, "maker"),
        process: rowCountByKind(team, "process"),
        devlog: rowCountByKind(team, "devlog"),
        check: checkFilledCount(team),
        reflection: reflectionStatus(team),
      };
      return [
        team.postNo,
        team.teamName,
        team.members.map((m) => m.username).join(", "),
        f?.serviceName ?? "",
        f?.oneLiner ?? "",
        f?.targetUser ?? "",
        f?.problem ?? "",
        f?.solution ?? "",
        f?.heroImageUrl ?? "",
        f?.deployUrl ?? "",
        f?.githubUrl ?? "",
        f?.techScreen ?? "",
        f?.envNames ?? "",
        f?.updatedBy ?? "",
        f?.updatedAt ? formatDateTime(f.updatedAt) : "",
        counts.feature,
        counts.flow,
        counts.limit,
        counts.plan,
        counts.maker,
        counts.process,
        counts.devlog,
        `${counts.check}/${CHECK_ITEMS_COUNT}`,
        counts.reflection.count,
        counts.reflection.count,
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "팀별 현황");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    downloadBlob(blob, `활동기록_${overview.slug}.xlsx`);
  };

  const handleZipDownload = async () => {
    if (!overview || overview.teams.length === 0) return;
    const JSZip = await import("jszip").then((m) => m.default || m);
    const zip = new JSZip();

    zip.file("README.md", buildOverviewReadme(overview));
    for (const team of overview.teams) {
      const folder = zip.folder(sanitizeFolderName(team.teamName));
      if (folder) {
        folder.file("README.md", buildPublicReadme(team));
        folder.file("RECORD.md", buildRecordReadme(team));
      }
    }

    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, `활동기록_${overview.slug}.zip`);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-foreground">활동기록 현황</h1>
              <p className="text-xs text-muted-foreground">
                도전형 활동기록 팀별 작성 진행률을 확인하고 원료를 내려받습니다.
              </p>
            </div>
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
              onClick={() => void handleExcelDownload()}
              disabled={!overview || overview.teams.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              엑셀
            </button>
            <button
              type="button"
              onClick={() => void handleZipDownload()}
              disabled={!overview || overview.teams.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <FileArchive className="h-4 w-4" />
              ZIP
            </button>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="record-category" className="sr-only">
            활동기록 게시판 선택
          </label>
          <select
            id="record-category"
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value || null)}
            disabled={categoriesLoading}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">활동기록 게시판을 선택하세요</option>
            {recordCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {recordCategories.length === 0 && !categoriesLoading && (
            <p className="mt-2 text-xs text-muted-foreground">
              활동기록 유형이 활성화된 카테고리가 없습니다. 카테고리 관리에서 활동기록을 켜주세요.
            </p>
          )}
        </div>
      </div>

      {overviewLoading && (
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

      {overview && !overviewLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Table2 className="h-4 w-4" />
            <span>
              총 {overview.teams.length}팀
              {selectedCategory ? ` · ${selectedCategory.name}` : ""}
            </span>
          </div>

          {overview.teams.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              아직 이 게시판에 활동기록 팀이 없어요.
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="sticky left-0 z-10 bg-muted/60 px-3 py-3 text-left font-semibold text-foreground">
                        팀
                      </th>
                      <th className="whitespace-nowrap px-3 py-3 text-center font-semibold text-foreground">
                        최종결과물
                      </th>
                      {ROW_SECTIONS.map((s) => (
                        <th
                          key={s.kind}
                          className="whitespace-nowrap px-3 py-3 text-center font-semibold text-foreground"
                        >
                          {s.short}
                        </th>
                      ))}
                      <th className="whitespace-nowrap px-3 py-3 text-center font-semibold text-foreground">
                        후기
                      </th>
                      <th className="whitespace-nowrap px-3 py-3 text-center font-semibold text-foreground">
                        수정일
                      </th>
                      <th className="px-3 py-3 text-center font-semibold text-foreground">보기</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {overview.teams.map((team) => {
                      const finalCount = finalFilledCount(team.final);
                      const isExpanded = expanded.has(team.postId);
                      const { count: reflectionCount, memberCount } = reflectionStatus(team);
                      return (
                        <>
                          <tr key={team.postId} className="hover:bg-muted/30">
                            <td className="sticky left-0 z-10 bg-card px-3 py-3 align-middle">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(team.postId)}
                                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                  aria-label={isExpanded ? "접기" : "펼치기"}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </button>
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-foreground">
                                    {team.teamName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">#{team.postNo}</p>
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-center align-middle">
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                                  finalCount === FINAL_FIELDS_COUNT
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                                )}
                              >
                                {finalCount}/{FINAL_FIELDS_COUNT}칸
                              </span>
                            </td>
                            {ROW_SECTIONS.map((s) => {
                              const count = rowCountByKind(team, s.kind);
                              if (s.kind === "stance") {
                                return (
                                  <td
                                    key={s.kind}
                                    className="whitespace-nowrap px-3 py-3 text-center align-middle"
                                  >
                                    <span
                                      className={cn(
                                        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                                        count === CHECK_ITEMS_COUNT
                                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                                      )}
                                    >
                                      {count}/{CHECK_ITEMS_COUNT}개
                                    </span>
                                  </td>
                                );
                              }
                              return (
                                <td
                                  key={s.kind}
                                  className="whitespace-nowrap px-3 py-3 text-center align-middle text-muted-foreground"
                                >
                                  {count}개
                                </td>
                              );
                            })}
                            <td className="whitespace-nowrap px-3 py-3 text-center align-middle">
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                                  reflectionCount === memberCount && memberCount > 0
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                                )}
                              >
                                {reflectionCount}/{memberCount}명
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-center align-middle text-xs text-muted-foreground">
                              {formatDateTime(team.final?.updatedAt)}
                            </td>
                            <td className="px-3 py-3 text-center align-middle">
                              <Link
                                to="/board/$slug/$postNo"
                                params={{ slug: team.slug, postNo: String(team.postNo) }}
                                className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                글보기
                              </Link>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td
                                colSpan={ROW_SECTIONS.length + 5}
                                className="bg-muted/30 px-3 py-3"
                              >
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  <div className="rounded-xl border border-border bg-card p-3">
                                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                      <Users className="h-3.5 w-3.5" />
                                      팀원 ({team.members.length}명)
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {team.members.length === 0 ? (
                                        <span className="text-xs text-muted-foreground">
                                          등록된 팀원 없음
                                        </span>
                                      ) : (
                                        team.members.map((m) => (
                                          <span
                                            key={m.id}
                                            className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground"
                                          >
                                            {m.username}
                                          </span>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                  <div className="rounded-xl border border-border bg-card p-3">
                                    <div className="mb-2 text-xs font-medium text-muted-foreground">
                                      후기 현황
                                    </div>
                                    <div className="space-y-1">
                                      {team.members.length === 0 ? (
                                        <span className="text-xs text-muted-foreground">
                                          팀원이 없어요
                                        </span>
                                      ) : (
                                        team.members.map((m) => {
                                          const r = team.reflections.find(
                                            (r) => r.usernameKey === m.usernameKey,
                                          );
                                          return (
                                            <div
                                              key={m.id}
                                              className="flex items-center justify-between text-xs"
                                            >
                                              <span className="text-foreground">{m.username}</span>
                                              <span
                                                className={cn(
                                                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                                                  r
                                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                                    : "bg-muted text-muted-foreground",
                                                )}
                                              >
                                                {r ? "작성" : "미작성"}
                                              </span>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </div>
                                  <div className="rounded-xl border border-border bg-card p-3">
                                    <div className="mb-2 text-xs font-medium text-muted-foreground">
                                      최종결과물 마지막 수정
                                    </div>
                                    <p className="text-xs text-foreground">
                                      {team.final?.updatedBy?.trim() || "-"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDateTime(team.final?.updatedAt)}
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
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
