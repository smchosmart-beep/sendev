import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Megaphone, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  categoriesQueryOptions,
  postsQueryOptions,
} from "@/lib/platform.queries";
import { createPost, deletePost } from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";
import { PostEditor } from "@/components/PostEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/notices")({
  component: NoticesAdmin,
});

function NoticesAdmin() {
  const { data: categories = [] } = useQuery(categoriesQueryOptions());
  const [categoryId, setCategoryId] = useState<string>("");

  const selectedId = categoryId || categories[0]?.id || "";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Megaphone className="h-5 w-5 text-primary" />
          공지사항 관리
        </h2>
        <p className="text-sm text-muted-foreground">
          게시판을 선택해 공지사항을 작성하세요. 작성자는 자동으로 “운영진”으로
          표시됩니다.
        </p>

        <div className="mt-4 space-y-2">
          <Label htmlFor="n-board">게시판 선택</Label>
          <select
            id="n-board"
            value={selectedId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedId ? (
        <>
          <NoticeForm categoryId={selectedId} />
          <NoticeList categoryId={selectedId} />
        </>
      ) : (
        <EmptyState
          icon={Megaphone}
          title="게시판이 없어요."
          description="먼저 ‘게시판 관리’에서 게시판을 만들어 주세요."
        />
      )}
    </div>
  );
}

function NoticeForm({ categoryId }: { categoryId: string }) {
  const queryClient = useQueryClient();
  const create = useServerFn(createPost);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          categoryId,
          type: "notice",
          title,
          content,
          author: "운영진",
          githubUrl: "",
          deployUrl: "",
          editPassword: password,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", categoryId] });
      toast.success("공지사항이 등록되었어요!");
      setTitle("");
      setContent("");
      setPassword("");
    },
    onError: () => toast.error("등록 중 문제가 발생했어요."),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) {
          toast.error("제목을 입력해주세요.");
          return;
        }
        if (!password.trim()) {
          toast.error("관리자 비밀번호를 입력해주세요.");
          return;
        }
        mutation.mutate();
      }}
      className="space-y-4 rounded-2xl bg-card p-6 shadow-sm"
    >
      <div className="space-y-2">
        <Label htmlFor="n-title">제목</Label>
        <Input
          id="n-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label>내용</Label>
        <PostEditor
          value={content}
          onChange={setContent}
          placeholder="공지 내용을 입력해 주세요."
          rows={8}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="n-pw">관리자 비밀번호</Label>
        <Input
          id="n-pw"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="수정·삭제 시 사용할 관리자 비밀번호"
          className="rounded-xl"
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-xl active:scale-95"
        >
          {mutation.isPending ? "등록 중..." : "공지 등록"}
        </Button>
      </div>
    </form>
  );
}

function NoticeList({ categoryId }: { categoryId: string }) {
  const queryClient = useQueryClient();
  const { data: posts = [] } = useQuery(postsQueryOptions(categoryId));
  const remove = useServerFn(deletePost);
  const notices = posts.filter((p) => p.type === "notice");

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [deletePw, setDeletePw] = useState("");

  const deleteMutation = useMutation({
    mutationFn: (vars: { id: string; password: string }) =>
      remove({ data: vars }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("비밀번호가 일치하지 않아요.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["posts", categoryId] });
      toast.success("공지사항이 삭제되었어요.");
      setDeleteTarget(null);
      setDeletePw("");
    },
    onError: () => toast.error("삭제 중 문제가 발생했어요."),
  });

  if (notices.length === 0) {
    return (
      <EmptyState
        icon={Megaphone}
        title="등록된 공지가 없어요."
        description="위 양식으로 첫 공지를 작성해 보세요."
      />
    );
  }

  return (
    <div className="rounded-2xl bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-foreground">등록된 공지</h3>
      <ul className="divide-y divide-border">
        {notices.map((n) => (
          <li
            key={n.id}
            className="flex items-center justify-between gap-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{n.title}</p>
              <p className="text-xs text-muted-foreground">
                {n.author} · {new Date(n.createdAt).toLocaleDateString("ko-KR")}
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                setDeletePw("");
                setDeleteTarget({ id: n.id, title: n.title });
              }}
              className="rounded-xl active:scale-95"
            >
              <Trash2 className="h-4 w-4" />
              삭제
            </Button>
          </li>
        ))}
      </ul>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(null);
            setDeletePw("");
          }
        }}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>공지 삭제</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.title}” 공지를 삭제하려면 관리자 비밀번호를
              입력하세요. 이 작업은 되돌릴 수 없어요.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!deletePw.trim()) {
                toast.error("관리자 비밀번호를 입력해주세요.");
                return;
              }
              if (deleteTarget) {
                deleteMutation.mutate({
                  id: deleteTarget.id,
                  password: deletePw,
                });
              }
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-2">
              <Label htmlFor="nd-pw">관리자 비밀번호</Label>
              <Input
                id="nd-pw"
                type="password"
                value={deletePw}
                onChange={(e) => setDeletePw(e.target.value)}
                className="rounded-xl"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeletePw("");
                }}
                className="rounded-xl active:scale-95"
              >
                취소
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={deleteMutation.isPending}
                className="rounded-xl active:scale-95"
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
