import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { UserCog, Trophy, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { userProfilesQueryOptions } from "@/lib/platform.queries";
import {
  upsertUserProfile,
  deleteUserProfile,
  type UserProfileDTO,
} from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/profiles")({
  component: ProfilesAdmin,
});

function ProfilesAdmin() {
  const queryClient = useQueryClient();
  const { data: profiles = [] as UserProfileDTO[] } = useQuery(
    userProfilesQueryOptions(),
  );
  const upsert = useServerFn(upsertUserProfile);
  const remove = useServerFn(deleteUserProfile);

  const [username, setUsername] = useState("");
  const [award, setAward] = useState("");
  const [editing, setEditing] = useState<UserProfileDTO | null>(null);

  const reset = () => {
    setUsername("");
    setAward("");
    setEditing(null);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      upsert({
        data: {
          username: username.trim(),
          award: award.trim(),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["profile-map"] });
      toast.success(editing ? "프로필을 수정했어요." : "프로필을 추가했어요.");
      reset();
    },
    onError: () => toast.error("저장 중 문제가 발생했어요."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["profile-map"] });
      toast.success("프로필을 삭제했어요.");
    },
    onError: () => toast.error("삭제 중 문제가 발생했어요."),
  });

  const startEdit = (p: UserProfileDTO) => {
    setEditing(p);
    setUsername(p.username);
    setAward(p.award);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("사용자명을 입력해 주세요.");
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-foreground">
          <UserCog className="h-5 w-5 text-primary" />
          사용자 프로필 관리
        </h2>
        <p className="text-sm text-muted-foreground">
          작성자 이름과 레벨·해커톤 수상 정보를 연결해 주세요. 글·댓글에서{" "}
          <b>이름이 정확히 일치</b>하면 자동으로 뱃지가 표시됩니다.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-12">
          <div className="space-y-2 sm:col-span-4">
            <Label htmlFor="p-name">사용자명</Label>
            <Input
              id="p-name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="예: 홍길동"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="p-level">레벨 (1~99)</Label>
            <Input
              id="p-level"
              type="number"
              min={1}
              max={99}
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="예: 3"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2 sm:col-span-6">
            <Label htmlFor="p-award">해커톤 수상</Label>
            <Input
              id="p-award"
              value={award}
              onChange={(e) => setAward(e.target.value)}
              placeholder="예: AI교육 부문 대상"
              className="rounded-xl"
            />
          </div>
          <div className="flex items-end gap-2 sm:col-span-12">
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-xl active:scale-95"
            >
              {saveMutation.isPending ? "저장 중..." : editing ? "수정 저장" : "추가"}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="secondary"
                onClick={reset}
                className="rounded-xl active:scale-95"
              >
                취소
              </Button>
            )}
          </div>
        </form>
      </div>

      {profiles.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="등록된 프로필이 없어요."
          description="위 양식에서 사용자명을 추가해 보세요."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
          <ul className="divide-y divide-border">
            {profiles.map((p: UserProfileDTO) => (
              <li
                key={p.id}
                className="flex items-center gap-3 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{p.username}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {p.level != null && (
                      <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                        Lv.{p.level}
                      </span>
                    )}
                    {p.award.trim() && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        <Trophy className="h-3 w-3" />
                        {p.award}
                      </span>
                    )}
                    {p.level == null && !p.award.trim() && (
                      <span className="text-xs text-muted-foreground">정보 없음</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(p)}
                  aria-label="수정"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-sm active:scale-95"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`'${p.username}' 프로필을 삭제할까요?`)) {
                      deleteMutation.mutate(p.id);
                    }
                  }}
                  aria-label="삭제"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive text-destructive-foreground shadow-sm active:scale-95"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
