import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FolderPlus, Pencil, Trash2, LayoutGrid } from "lucide-react";
import { toast } from "sonner";

import { useAdminStore, type Category } from "@/lib/admin-store";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/SkeletonList";
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

export const Route = createFileRoute("/admin/categories")({
  component: CategoriesPage,
});

function CategoriesPage() {
  const { categories, addCategory, updateCategory, removeCategory } = useAdminStore();
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [deleting, setDeleting] = useState<Category | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("게시판 이름을 입력해주세요.");
      return;
    }
    addCategory({ name: name.trim(), description: description.trim() });
    setName("");
    setDescription("");
    toast.success("새 게시판이 추가되었어요.");
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setEditName(c.name);
    setEditDescription(c.description);
  };

  const handleEditSave = () => {
    if (!editing) return;
    if (!editName.trim()) {
      toast.error("게시판 이름을 입력해주세요.");
      return;
    }
    updateCategory(editing.id, {
      name: editName.trim(),
      description: editDescription.trim(),
    });
    setEditing(null);
    toast.success("게시판 정보가 수정되었어요.");
  };

  const handleDelete = () => {
    if (!deleting) return;
    removeCategory(deleting.id);
    setDeleting(null);
    toast.success("게시판이 삭제되었어요.");
  };

  return (
    <div className="space-y-8">
      {/* 추가 폼 */}
      <section className="rounded-2xl bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FolderPlus className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">새 게시판 추가</h2>
        </div>
        <form onSubmit={handleAdd} className="grid gap-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
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
            <Label htmlFor="desc">설명</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="게시판에 대한 간단한 설명"
              className="rounded-xl"
            />
          </div>
          <Button
            type="submit"
            className="rounded-xl shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
          >
            추가하기
          </Button>
        </form>
      </section>

      {/* 목록 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">게시판 목록</h2>

        {loading ? (
          <SkeletonList count={2} />
        ) : categories.length === 0 ? (
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
                  <h3 className="truncate text-base font-semibold text-foreground">{c.name}</h3>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {c.description || "설명이 없습니다."}
                  </p>
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
            <DialogDescription>게시판 이름과 설명을 변경할 수 있어요.</DialogDescription>
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
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setEditing(null)}
              className="rounded-xl active:scale-95"
            >
              취소
            </Button>
            <Button onClick={handleEditSave} className="rounded-xl active:scale-95">
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
              onClick={handleDelete}
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
