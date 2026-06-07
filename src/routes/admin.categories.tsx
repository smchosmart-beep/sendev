import { getAdminPassword } from "@/lib/admin-auth";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FolderPlus, Pencil, Trash2, LayoutGrid, Lock, Github, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { categoriesQueryOptions } from "@/lib/platform.queries";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryPassword,
  swapCategoryOrder,
} from "@/lib/platform.functions";
import type { CategoryDTO, TabGroup } from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TAB_OPTIONS: { value: TabGroup; label: string }[] = [
  { value: "hackathon", label: "해커톤" },
  { value: "resources", label: "자료집" },
  { value: "devground", label: "Dev Ground" },
  { value: "helloworld", label: "Hello, World" },
];

const TAB_LABEL: Record<TabGroup, string> = {
  hackathon: "해커톤",
  resources: "자료집",
  devground: "Dev Ground",
  helloworld: "Hello, World",
};
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

export const Route = createFileRoute("/admin/categories")({
  loader: ({ context }) => context.queryClient.ensureQueryData(categoriesQueryOptions()),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      카테고리을 불러오지 못했어요: {error.message}
    </div>
  ),
  component: CategoriesPage,
});

function CategoriesPage() {
  const queryClient = useQueryClient();
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const createFn = useServerFn(createCategory);
  const updateFn = useServerFn(updateCategory);
  const deleteFn = useServerFn(deleteCategory);
  const getPasswordFn = useServerFn(getCategoryPassword);
  const swapOrderFn = useServerFn(swapCategoryOrder);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["categories"] });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [githubRequired, setGithubRequired] = useState(false);
  const [enableNotice, setEnableNotice] = useState(true);
  const [enableQuestion, setEnableQuestion] = useState(true);
  const [enableGeneral, setEnableGeneral] = useState(true);
  const [enableProject, setEnableProject] = useState(true);
  const [enableLink, setEnableLink] = useState(false);
  const [generalName, setGeneralName] = useState("일반게시판");
  const [projectName, setProjectName] = useState("산출물");
  const [linkName, setLinkName] = useState("링크");
  const [tabGroup, setTabGroup] = useState<TabGroup>("hackathon");

  const [editing, setEditing] = useState<CategoryDTO | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editGithubRequired, setEditGithubRequired] = useState(false);
  const [editEnableNotice, setEditEnableNotice] = useState(true);
  const [editEnableQuestion, setEditEnableQuestion] = useState(true);
  const [editEnableGeneral, setEditEnableGeneral] = useState(true);
  const [editEnableProject, setEditEnableProject] = useState(true);
  const [editEnableLink, setEditEnableLink] = useState(false);
  const [editGeneralName, setEditGeneralName] = useState("일반게시판");
  const [editProjectName, setEditProjectName] = useState("산출물");
  const [editLinkName, setEditLinkName] = useState("링크");
  const [editTabGroup, setEditTabGroup] = useState<TabGroup>("hackathon");

  const [deleting, setDeleting] = useState<CategoryDTO | null>(null);

  const [listFilter, setListFilter] = useState<TabGroup | "all">("all");
  const visibleCategories =
    listFilter === "all"
      ? categories
      : categories.filter((c) => (c.tabGroup ?? "hackathon") === listFilter);

  const addMutation = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim(),
          password: password.trim(),
          githubRequired,
          enableNotice,
          enableQuestion,
          enableGeneral,
          enableProject,
          enableLink,
          generalName: generalName.trim(),
          projectName: projectName.trim(),
          linkName: linkName.trim(),
          tabGroup,
        },
      }),
    onSuccess: () => {
      invalidate();
      setName("");
      setSlug("");
      setDescription("");
      setPassword("");
      setGithubRequired(false);
      setEnableNotice(true);
      setEnableQuestion(true);
      setEnableGeneral(true);
      setEnableProject(true);
      setEnableLink(false);
      setGeneralName("일반게시판");
      setProjectName("산출물");
      setLinkName("링크");
      setTabGroup("hackathon");
      toast.success("새 카테고리이 추가되었어요.");
    },
    onError: () => toast.error("추가 중 문제가 발생했어요."),
  });

  const editMutation = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          id: editing!.id,
          name: editName.trim(),
          slug: editSlug.trim(),
          description: editDescription.trim(),
          password: editPassword,
          githubRequired: editGithubRequired,
          enableNotice: editEnableNotice,
          enableQuestion: editEnableQuestion,
          enableGeneral: editEnableGeneral,
          enableProject: editEnableProject,
          enableLink: editEnableLink,
          generalName: editGeneralName.trim(),
          projectName: editProjectName.trim(),
          linkName: editLinkName.trim(),
          tabGroup: editTabGroup,
        },
      }),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success("카테고리 정보가 수정되었어요.");
    },
    onError: () => toast.error("수정 중 문제가 발생했어요."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteFn({ data: { id: deleting!.id, adminPassword: getAdminPassword() } }),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
      toast.success("카테고리이 삭제되었어요.");
    },
    onError: () => toast.error("삭제 중 문제가 발생했어요."),
  });

  const swapMutation = useMutation({
    mutationFn: (vars: { id: string; otherId: string }) =>
      swapOrderFn({ data: vars }),
    onSuccess: () => invalidate(),
    onError: () => toast.error("순서 변경 중 문제가 발생했어요."),
  });

  // Same-tab neighbors sorted by sort_order, used to compute up/down swaps.
  const moveCategory = (c: CategoryDTO, dir: "up" | "down") => {
    const group = categories
      .filter((x) => (x.tabGroup ?? "hackathon") === (c.tabGroup ?? "hackathon"))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = group.findIndex((x) => x.id === c.id);
    const other = dir === "up" ? group[idx - 1] : group[idx + 1];
    if (!other) return;
    swapMutation.mutate({ id: c.id, otherId: other.id });
  };



  const openEdit = (c: CategoryDTO) => {
    setEditing(c);
    setEditName(c.name);
    setEditSlug(c.slug);
    setEditDescription(c.description);
    setEditPassword("");
    setEditGithubRequired(c.githubRequired);
    setEditEnableNotice(c.enableNotice);
    setEditEnableQuestion(c.enableQuestion);
    setEditEnableGeneral(c.enableGeneral);
    setEditEnableProject(c.enableProject);
    setEditEnableLink(c.enableLink);
    setEditGeneralName(c.generalName);
    setEditProjectName(c.projectName);
    setEditLinkName(c.linkName);
    setEditTabGroup(c.tabGroup ?? "hackathon");
    if (c.hasPassword) {
      getPasswordFn({ data: { id: c.id, adminPassword: getAdminPassword() } })
        .then((res) => setEditPassword(res.password))
        .catch(() => toast.error("비밀번호를 불러오지 못했어요."));
    }
  };



  return (
    <div className="space-y-8">
      {/* 추가 폼 */}
      <section className="rounded-2xl bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FolderPlus className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">새 카테고리 추가</h2>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              toast.error("카테고리 이름을 입력해주세요.");
              return;
            }
            addMutation.mutate();
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="tab-group">탭 선택</Label>
            <Select value={tabGroup} onValueChange={(v) => setTabGroup(v as TabGroup)}>
              <SelectTrigger id="tab-group" className="rounded-xl">
                <SelectValue placeholder="탭을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {TAB_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              이 카테고리이 상단 어느 탭에 표시될지 선택하세요.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">카테고리 이름</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 입문형"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw">입장 비밀번호 (선택)</Label>
            <Input
              id="pw"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비워두면 공개 카테고리"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="slug">짧은 주소 (URL용, 선택)</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="예: lv1 (영문 소문자·숫자·하이픈, 비우면 자동 생성)"
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              게시글 주소가 /board/{slug || "주소"}/번호 형태로 짧아져요.
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="desc">설명</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="카테고리에 대한 간단한 설명"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-3 rounded-xl bg-muted/40 p-4 sm:col-span-2">
            <p className="text-sm font-medium text-foreground">사용할 게시판 종류</p>
            <p className="text-xs text-muted-foreground">
              이 카테고리에 표시할 섹션만 켜주세요.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <SectionToggle id="add-sec-notice" label="공지사항" checked={enableNotice} onChange={setEnableNotice} />
              <SectionToggle id="add-sec-question" label="질문 게시판" checked={enableQuestion} onChange={setEnableQuestion} />
              <SectionToggle id="add-sec-general" label="일반게시판" checked={enableGeneral} onChange={setEnableGeneral} />
              <SectionToggle id="add-sec-project" label="산출물 게시판" checked={enableProject} onChange={setEnableProject} />
              <SectionToggle id="add-sec-link" label="링크 게시판" checked={enableLink} onChange={setEnableLink} />
            </div>
            {enableGeneral && (
              <div className="space-y-2 pt-1">
                <Label htmlFor="add-general-name">일반게시판 이름</Label>
                <Input
                  id="add-general-name"
                  value={generalName}
                  onChange={(e) => setGeneralName(e.target.value)}
                  placeholder="예: 자유게시판"
                  className="rounded-xl bg-background"
                />
              </div>
            )}
            {enableProject && (
              <div className="space-y-2 pt-1">
                <Label htmlFor="add-project-name">산출물 게시판 이름</Label>
                <Input
                  id="add-project-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="예: 프로젝트, 작품"
                  className="rounded-xl bg-background"
                />
              </div>
            )}
            {enableLink && (
              <div className="space-y-2 pt-1">
                <Label htmlFor="add-link-name">링크 게시판 이름</Label>
                <Input
                  id="add-link-name"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  placeholder="예: 추천 영상, 디자인 모음"
                  className="rounded-xl bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  링크 주소의 미리보기 썸네일이 카드에 크게 표시돼요.
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/40 p-4 sm:col-span-2">
            <div className="space-y-0.5">
              <Label htmlFor="gh-req" className="flex items-center gap-1.5">
                <Github className="h-4 w-4" />
                GitHub 링크 필수
              </Label>
              <p className="text-sm text-muted-foreground">
                켜면 이 카테고리에 산출물을 등록할 때 GitHub 링크를 반드시 입력해야 해요.
              </p>
            </div>
            <Switch
              id="gh-req"
              checked={githubRequired}
              onCheckedChange={setGithubRequired}
            />
          </div>
          <div className="sm:col-span-2">
            <Button
              type="submit"
              disabled={addMutation.isPending}
              className="rounded-xl shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
            >
              추가하기
            </Button>
          </div>
        </form>
      </section>

      {/* 목록 */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">카테고리 목록</h2>
          <Select
            value={listFilter}
            onValueChange={(v) => setListFilter(v as TabGroup | "all")}
          >
            <SelectTrigger className="w-44 rounded-xl">
              <SelectValue placeholder="탭으로 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {TAB_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {visibleCategories.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title="해당하는 카테고리이 없어요."
            description="다른 탭을 선택하거나 위 폼으로 카테고리을 만들어보세요!"
          />
        ) : (
          <div className="space-y-4">
            {visibleCategories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-4 rounded-2xl bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 truncate text-base font-semibold text-foreground">
                    {c.name}
                    {c.hasPassword && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </h3>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {c.description || "설명이 없습니다."}
                  </p>
                  {c.githubRequired && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-primary">
                      <Github className="h-3 w-3" />
                      GitHub 링크 필수
                    </span>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {TAB_LABEL[c.tabGroup ?? "hackathon"]}
                    </span>
                    {c.enableNotice && <SectionBadge label="공지사항" />}
                    {c.enableQuestion && <SectionBadge label="질문 게시판" />}
                    {c.enableGeneral && <SectionBadge label={c.generalName || "일반게시판"} />}
                    {c.enableProject && <SectionBadge label={c.projectName || "산출물"} />}
                    {c.enableLink && <SectionBadge label={c.linkName || "링크"} />}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {listFilter !== "all" && (() => {
                    const group = categories
                      .filter(
                        (x) =>
                          (x.tabGroup ?? "hackathon") === (c.tabGroup ?? "hackathon"),
                      )
                      .sort((a, b) => a.sortOrder - b.sortOrder);
                    const idx = group.findIndex((x) => x.id === c.id);
                    return (
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="secondary"
                          size="icon"
                          disabled={idx <= 0 || swapMutation.isPending}
                          onClick={() => moveCategory(c, "up")}
                          className="h-6 w-7 rounded-lg active:scale-95"
                          aria-label="위로 이동"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          disabled={idx >= group.length - 1 || swapMutation.isPending}
                          onClick={() => moveCategory(c, "down")}
                          className="h-6 w-7 rounded-lg active:scale-95"
                          aria-label="아래로 이동"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })()}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openEdit(c)}
                    className="rounded-xl transition-all duration-200 active:scale-95"
                  >
                    <Pencil className="h-4 w-4" />
                    수정
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleting(c)}
                    className="rounded-xl text-destructive transition-all duration-200 hover:bg-destructive/10 active:scale-95"
                  >
                    <Trash2 className="h-4 w-4" />
                    삭제
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 수정 다이얼로그 */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>카테고리 수정</DialogTitle>
            <DialogDescription>
              카테고리 이름, 설명, 비밀번호를 변경할 수 있어요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-tab-group">탭 선택</Label>
              <Select
                value={editTabGroup}
                onValueChange={(v) => setEditTabGroup(v as TabGroup)}
              >
                <SelectTrigger id="edit-tab-group" className="rounded-xl">
                  <SelectValue placeholder="탭을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {TAB_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">카테고리 이름</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">짧은 주소 (URL용)</Label>
              <Input
                id="edit-slug"
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
                placeholder="예: lv1 (영문 소문자·숫자·하이픈)"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">설명</Label>
              <Textarea
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pw">입장 비밀번호</Label>
              <Input
                id="edit-pw"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="비워두면 공개 카테고리으로 변경"
                className="rounded-xl"
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/40 p-4">
              <div className="space-y-0.5">
                <Label htmlFor="edit-gh-req" className="flex items-center gap-1.5">
                  <Github className="h-4 w-4" />
                  GitHub 링크 필수
                </Label>
                <p className="text-sm text-muted-foreground">
                  산출물 등록 시 GitHub 링크를 반드시 입력하게 해요.
                </p>
              </div>
              <Switch
                id="edit-gh-req"
                checked={editGithubRequired}
                onCheckedChange={setEditGithubRequired}
              />
            </div>
            <div className="space-y-3 rounded-xl bg-muted/40 p-4">
              <p className="text-sm font-medium text-foreground">사용할 게시판 종류</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <SectionToggle id="edit-sec-notice" label="공지사항" checked={editEnableNotice} onChange={setEditEnableNotice} />
                <SectionToggle id="edit-sec-question" label="질문 게시판" checked={editEnableQuestion} onChange={setEditEnableQuestion} />
                <SectionToggle id="edit-sec-general" label="일반게시판" checked={editEnableGeneral} onChange={setEditEnableGeneral} />
                <SectionToggle id="edit-sec-project" label="산출물 게시판" checked={editEnableProject} onChange={setEditEnableProject} />
                <SectionToggle id="edit-sec-link" label="링크 게시판" checked={editEnableLink} onChange={setEditEnableLink} />
              </div>
              {editEnableGeneral && (
                <div className="space-y-2 pt-1">
                  <Label htmlFor="edit-general-name">일반게시판 이름</Label>
                  <Input
                    id="edit-general-name"
                    value={editGeneralName}
                    onChange={(e) => setEditGeneralName(e.target.value)}
                    placeholder="예: 자유게시판"
                    className="rounded-xl bg-background"
                  />
                </div>
              )}
              {editEnableProject && (
                <div className="space-y-2 pt-1">
                  <Label htmlFor="edit-project-name">산출물 게시판 이름</Label>
                  <Input
                    id="edit-project-name"
                    value={editProjectName}
                    onChange={(e) => setEditProjectName(e.target.value)}
                    placeholder="예: 프로젝트, 작품"
                    className="rounded-xl bg-background"
                  />
                </div>
              )}
              {editEnableLink && (
                <div className="space-y-2 pt-1">
                  <Label htmlFor="edit-link-name">링크 게시판 이름</Label>
                  <Input
                    id="edit-link-name"
                    value={editLinkName}
                    onChange={(e) => setEditLinkName(e.target.value)}
                    placeholder="예: 추천 영상, 디자인 모음"
                    className="rounded-xl bg-background"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setEditing(null)}
              className="rounded-xl active:scale-95"
            >
              취소
            </Button>
            <Button
              onClick={() => {
                if (!editName.trim()) {
                  toast.error("카테고리 이름을 입력해주세요.");
                  return;
                }
                editMutation.mutate();
              }}
              disabled={editMutation.isPending}
              className="rounded-xl active:scale-95"
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>카테고리을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              '{deleting?.name}' 카테고리이 삭제됩니다. 이 작업은 되돌릴 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SectionToggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-background px-3 py-2">
      <Label htmlFor={id} className="text-sm font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SectionBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {label}
    </span>
  );
}
