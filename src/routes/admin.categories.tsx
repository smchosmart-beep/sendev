import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FolderPlus, Pencil, Trash2, LayoutGrid, Lock, Github } from "lucide-react";
import { toast } from "sonner";

import { categoriesQueryOptions } from "@/lib/platform.queries";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryPassword,
} from "@/lib/platform.functions";
import type { CategoryDTO } from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
      게시판을 불러오지 못했어요: {error.message}
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

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["categories"] });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [githubRequired, setGithubRequired] = useState(false);

  const [editing, setEditing] = useState<CategoryDTO | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editGithubRequired, setEditGithubRequired] = useState(false);

  const [deleting, setDeleting] = useState<CategoryDTO | null>(null);

  const addMutation = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim(),
          password: password.trim(),
          githubRequired,
        },
      }),
    onSuccess: () => {
      invalidate();
      setName("");
      setSlug("");
      setDescription("");
      setPassword("");
      setGithubRequired(false);
      toast.success("새 게시판이 추가되었어요.");
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
        },
      }),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success("게시판 정보가 수정되었어요.");
    },
    onError: () => toast.error("수정 중 문제가 발생했어요."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteFn({ data: { id: deleting!.id } }),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
      toast.success("게시판이 삭제되었어요.");
    },
    onError: () => toast.error("삭제 중 문제가 발생했어요."),
  });

  const openEdit = (c: CategoryDTO) => {
    setEditing(c);
    setEditName(c.name);
    setEditDescription(c.description);
    setEditPassword("");
    setEditGithubRequired(c.githubRequired);
    if (c.hasPassword) {
      getPasswordFn({ data: { id: c.id } })
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
          <h2 className="text-lg font-semibold text-foreground">새 게시판 추가</h2>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              toast.error("게시판 이름을 입력해주세요.");
              return;
            }
            addMutation.mutate();
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="space-y-2">
            <Label htmlFor="name">게시판 이름</Label>
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
              placeholder="비워두면 공개 게시판"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="desc">설명</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="게시판에 대한 간단한 설명"
              className="rounded-xl"
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/40 p-4 sm:col-span-2">
            <div className="space-y-0.5">
              <Label htmlFor="gh-req" className="flex items-center gap-1.5">
                <Github className="h-4 w-4" />
                GitHub 링크 필수
              </Label>
              <p className="text-sm text-muted-foreground">
                켜면 이 게시판에 산출물을 등록할 때 GitHub 링크를 반드시 입력해야 해요.
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
        <h2 className="text-lg font-semibold text-foreground">게시판 목록</h2>

        {categories.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title="아직 등록된 게시판이 없어요."
            description="위 폼을 이용해 첫 번째 게시판을 만들어보세요!"
          />
        ) : (
          <div className="space-y-4">
            {categories.map((c) => (
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
                </div>
                <div className="flex shrink-0 gap-2">
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
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>게시판 수정</DialogTitle>
            <DialogDescription>
              게시판 이름, 설명, 비밀번호를 변경할 수 있어요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">게시판 이름</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
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
                placeholder="비워두면 공개 게시판으로 변경"
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
                  toast.error("게시판 이름을 입력해주세요.");
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
            <AlertDialogTitle>게시판을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              '{deleting?.name}' 게시판이 삭제됩니다. 이 작업은 되돌릴 수 없어요.
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
