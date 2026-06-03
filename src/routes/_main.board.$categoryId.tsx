import { useEffect, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Megaphone, FolderGit2, User } from "lucide-react";

import { useAdminStore } from "@/lib/admin-store";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_main/board/$categoryId")({
  component: BoardDetailPage,
});

function BoardDetailPage() {
  const { categoryId } = useParams({ from: "/_main/board/$categoryId" });
  const { categories, posts } = useAdminStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const category = categories.find((c) => c.id === categoryId);
  const notices = posts.filter((p) => p.categoryId === categoryId && p.type === "notice");
  const projects = posts.filter((p) => p.categoryId === categoryId && p.type === "project");

  if (!loading && !category) {
    return (
      <div className="space-y-6">
        <BackLink />
        <EmptyState
          icon={FolderGit2}
          title="게시판을 찾을 수 없어요."
          description="삭제되었거나 잘못된 주소일 수 있어요."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink />

      {loading ? (
        <Skeleton className="h-20 w-full rounded-2xl" />
      ) : (
        <div className="rounded-2xl bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-foreground">{category?.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {category?.description || "설명이 없습니다."}
          </p>
        </div>
      )}

      {!loading && category && (
        <Tabs defaultValue="project">
          <TabsList className="rounded-2xl">
            <TabsTrigger value="notice" className="rounded-xl">
              <Megaphone className="mr-1.5 h-4 w-4" />
              공지사항
            </TabsTrigger>
            <TabsTrigger value="project" className="rounded-xl">
              <FolderGit2 className="mr-1.5 h-4 w-4" />
              산출물
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notice" className="mt-4">
            {notices.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="아직 등록된 공지사항이 없어요."
                description="관리자 페이지에서 공지사항을 작성할 수 있어요."
              />
            ) : (
              <div className="space-y-3">
                {notices.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center justify-between rounded-2xl bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span className="font-medium text-foreground">{n.title}</span>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      {n.author}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="project" className="mt-4">
            {projects.length === 0 ? (
              <EmptyState
                icon={FolderGit2}
                title="아직 등록된 산출물이 없어요. 첫 번째 개발자가 되어주세요!"
                description="GitHub 링크와 함께 프로젝트를 공유해보세요."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className="overflow-hidden rounded-2xl bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="flex h-32 items-center justify-center bg-accent text-primary">
                      <FolderGit2 className="h-10 w-10" />
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-foreground">{p.title}</h3>
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        {p.author}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/board"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:-translate-x-0.5 hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      게시판 목록
    </Link>
  );
}
