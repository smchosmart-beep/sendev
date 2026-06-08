import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  LayoutGrid,
  ArrowRight,
  Lock,
  Folder,
  FolderOpen,
  ChevronRight,
} from "lucide-react";

import {
  categoriesQueryOptions,
  postStubsQueryOptions,
  readPostIdsQueryOptions,
} from "@/lib/platform.queries";
import { useStoredIdentity } from "@/hooks/useNicknameIdentity";
import type { CategoryDTO, TabGroup } from "@/lib/platform.functions";
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
      { title: "카테고리 — 교사 개발자 플랫폼" },
      { name: "description", content: "관리자가 만든 카테고리별로 공지사항과 산출물을 확인하세요." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(categoriesQueryOptions()),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      카테고리을 불러오지 못했어요: {error.message}
    </div>
  ),
  component: BoardListPage,
});

function BoardCard({ category }: { category: CategoryDTO }) {
  return (
    <Link
      to="/board/$slug"
      params={{ slug: category.slug }}
      className="group flex flex-col justify-between rounded-2xl bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-95"
    >
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          {category.name}
          {category.hasPassword && <Lock className="h-4 w-4 text-muted-foreground" />}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {category.description || "설명이 없습니다."}
        </p>
      </div>
      <div className="mt-6 flex items-center justify-between text-sm font-medium text-primary">
        <span>{category.hasPassword ? "비밀번호 입장" : "바로 입장"}</span>
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function FolderNode({
  group,
  childrenOf,
  depth,
}: {
  group: CategoryDTO;
  childrenOf: (parentId: string) => CategoryDTO[];
  depth: number;
}) {
  const [open, setOpen] = useState(true);
  const children = childrenOf(group.id);

  return (
    <div className="rounded-2xl bg-card/60 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-2xl p-4 text-left transition-colors hover:bg-accent/50 active:scale-[0.99]"
      >
        <ChevronRight
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
        {open ? (
          <FolderOpen className="h-5 w-5 shrink-0 text-primary" />
        ) : (
          <Folder className="h-5 w-5 shrink-0 text-primary" />
        )}
        <span className="flex-1 min-w-0">
          <span className="block truncate text-base font-semibold text-foreground">
            {group.name}
          </span>
          {group.description && (
            <span className="block truncate text-xs text-muted-foreground">
              {group.description}
            </span>
          )}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">{children.length}</span>
      </button>

      {open && children.length > 0 && (
        <div className="space-y-3 px-3 pb-3 pl-6 sm:pl-9">
          {children.map((child) =>
            child.isGroup ? (
              <FolderNode
                key={child.id}
                group={child}
                childrenOf={childrenOf}
                depth={depth + 1}
              />
            ) : (
              <BoardCard key={child.id} category={child} />
            ),
          )}
        </div>
      )}

      {open && children.length === 0 && (
        <p className="px-6 pb-4 pl-12 text-sm text-muted-foreground sm:pl-14">
          아직 하위 게시판이 없어요.
        </p>
      )}
    </div>
  );
}

function BoardListPage() {
  const { tab } = Route.useSearch();
  const activeTab = normalizeTab(tab);
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const visible = categories.filter((c) => (c.tabGroup ?? "hackathon") === activeTab);

  const visibleIds = new Set(visible.map((c) => c.id));
  // Roots: items without a parent, or whose parent is not in this tab.
  const roots = visible.filter(
    (c) => !c.parentId || !visibleIds.has(c.parentId),
  );
  const childrenOf = (parentId: string) =>
    visible.filter((c) => c.parentId === parentId);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{TAB_LABELS[activeTab]}</h1>
        <p className="text-sm text-muted-foreground">{TAB_DESCRIPTIONS[activeTab]}</p>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="아직 등록된 카테고리이 없어요."
          description="관리자 페이지에서 이 탭에 카테고리을 추가해보세요!"
        />
      ) : (
        <div className="space-y-4">
          {/* Folders first (full width), then standalone boards in a grid. */}
          {roots
            .filter((c) => c.isGroup)
            .map((group) => (
              <FolderNode key={group.id} group={group} childrenOf={childrenOf} depth={0} />
            ))}

          {roots.some((c) => !c.isGroup) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {roots
                .filter((c) => !c.isGroup)
                .map((c) => (
                  <BoardCard key={c.id} category={c} />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
