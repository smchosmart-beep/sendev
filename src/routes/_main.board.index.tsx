import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { LayoutGrid, ArrowRight, Lock } from "lucide-react";

import { categoriesQueryOptions } from "@/lib/platform.queries";
import type { TabGroup } from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";

const TAB_LABELS: Record<TabGroup, string> = {
  hackathon: "해커톤",
  resources: "자료집",
  devground: "Dev Ground",
  helloworld: "Hello, World",
};

const TAB_DESCRIPTIONS: Record<TabGroup, string> = {
  hackathon:
    "교사들이 함께 모여 정해진 기간 동안 아이디어를 코드로 만들고 결과물을 나누는 공간이에요.",
  resources:
    "수업과 바이브코딩에 바로 활용할 수 있는 자료와 가이드를 모아둔 공간이에요.",
  devground: "교사들이 서로 소통, 공유하는 바이브코딩 문화 조성을 위한 공간이에요.",
  helloworld:
    "처음 시작하는 분들을 위한 입문 가이드와 첫걸음 정보를 담은 공간이에요.",
};

const VALID_TABS: TabGroup[] = ["hackathon", "resources", "devground", "helloworld"];

function normalizeTab(value: unknown): TabGroup {
  return VALID_TABS.includes(value as TabGroup) ? (value as TabGroup) : "hackathon";
}

export const Route = createFileRoute("/_main/board/")({
  validateSearch: (search: Record<string, unknown>): { tab: TabGroup } => ({
    tab: normalizeTab(search.tab),
  }),
  head: () => ({
    meta: [
      { title: "게시판 — 교사 개발자 플랫폼" },
      { name: "description", content: "관리자가 만든 게시판별로 공지사항과 산출물을 확인하세요." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(categoriesQueryOptions()),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      게시판을 불러오지 못했어요: {error.message}
    </div>
  ),
  component: BoardListPage,
});

function BoardListPage() {
  const { tab } = Route.useSearch();
  const activeTab = normalizeTab(tab);
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const visible = categories.filter((c) => (c.tabGroup ?? "hackathon") === activeTab);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{TAB_LABELS[activeTab]}</h1>
        <p className="text-sm text-muted-foreground">{TAB_DESCRIPTIONS[activeTab]}</p>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="아직 등록된 게시판이 없어요."
          description="관리자 페이지에서 이 탭에 게시판을 추가해보세요!"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((c) => (
            <Link
              key={c.id}
              to="/board/$slug"
              params={{ slug: c.slug }}
              className="group flex flex-col justify-between rounded-2xl bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-95"
            >
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  {c.name}
                  {c.hasPassword && <Lock className="h-4 w-4 text-muted-foreground" />}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {c.description || "설명이 없습니다."}
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between text-sm font-medium text-primary">
                <span>{c.hasPassword ? "비밀번호 입장" : "바로 입장"}</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
