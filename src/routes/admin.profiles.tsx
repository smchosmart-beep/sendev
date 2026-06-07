import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { UserCog, Trophy, Pencil, Trash2, Lock, AlertCircle, KeyRound, icons as lucideIcons } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { userProfilesQueryOptions, awardIconQueryOptions } from "@/lib/platform.queries";
import {
  upsertUserProfile,
  deleteUserProfile,
  resetNicknamePassword,
  verifyProfileAdmin,
  setAwardIcon,
  AWARD_ICON_NAMES,
  type UserProfileDTO,
  type AwardIconName,
} from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


// 한글 자모/완성형 음절 제거 (영문 비밀번호 강제)
const stripKorean = (s: string) =>
  s.replace(/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3]/g, "");

const PROFILE_SESSION_KEY = "profile-admin-granted";

export const Route = createFileRoute("/admin/profiles")({
  component: ProfilesGate,
});

// Second-level password gate: the password lives only in the server secret
// PROFILE_ADMIN_PASSWORD and is verified server-side.
function ProfilesGate() {
  const verify = useServerFn(verifyProfileAdmin);
  const [mounted, setMounted] = useState(false);
  const [granted, setGranted] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setGranted(sessionStorage.getItem(PROFILE_SESSION_KEY) === "1");
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (granted) return <ProfilesAdmin />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checking) return;
    setChecking(true);
    setError(false);
    try {
      const res = await verify({ data: { password: value } });
      if (res.ok) {
        sessionStorage.setItem(PROFILE_SESSION_KEY, "1");
        setGranted(true);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm rounded-3xl bg-card p-8 shadow-md">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
        <Lock className="h-7 w-7" />
      </div>
      <h1 className="text-center text-xl font-bold text-foreground">
        시스템 관리자 인증
      </h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        사용자 프로필 관리는 별도의 시스템 관리자 비밀번호가 필요합니다.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          autoFocus
          lang="en"
          inputMode="text"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(e) => {
            setValue(stripKorean(e.target.value));
            setError(false);
          }}
          onCompositionEnd={(e) => {
            setValue(stripKorean((e.target as HTMLInputElement).value));
          }}
          placeholder="영문 비밀번호를 입력해 주세요"
          className={cn(
            "mt-6 w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors",
            error
              ? "border-destructive focus:border-destructive"
              : "border-border focus:border-primary",
          )}
        />
        {error && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-destructive">
            <AlertCircle className="h-4 w-4" />
            비밀번호가 올바르지 않습니다. 다시 입력해 주세요.
          </p>
        )}
        <button
          type="submit"
          disabled={checking}
          className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
        >
          {checking ? "확인 중..." : "입장하기"}
        </button>
      </form>
    </div>
  );
}

// Lets the admin pick a single global icon for award badges.
function AwardIconPicker() {
  const queryClient = useQueryClient();
  const { data: current } = useQuery(awardIconQueryOptions());
  const save = useServerFn(setAwardIcon);

  const mutation = useMutation({
    mutationFn: (icon: AwardIconName) => save({ data: { icon } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["award-icon"] });
      toast.success("수상 배지 아이콘을 변경했어요.");
    },
    onError: () => toast.error("아이콘 저장 중 문제가 발생했어요."),
  });

  return (
    <div className="rounded-2xl bg-card p-6 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-foreground">
        <Trophy className="h-5 w-5 text-primary" />
        수상 배지 아이콘
      </h2>
      <p className="text-sm text-muted-foreground">
        수상 배지에 표시될 아이콘을 선택해 주세요. 모든 사용자에게 공통으로 적용됩니다.
      </p>
      <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-7">
        {AWARD_ICON_NAMES.map((name) => {
          const Icon =
            (lucideIcons as Record<string, typeof Trophy>)[name] || Trophy;
          const selected = current === name;
          return (
            <button
              key={name}
              type="button"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(name)}
              aria-label={name}
              aria-pressed={selected}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl border transition-all active:scale-95 disabled:opacity-60",
                selected
                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                  : "border-border bg-background text-foreground hover:border-primary",
              )}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProfilesAdmin() {

  const queryClient = useQueryClient();
  const { data: profiles = [] as UserProfileDTO[] } = useQuery(
    userProfilesQueryOptions(),
  );
  const upsert = useServerFn(upsertUserProfile);
  const remove = useServerFn(deleteUserProfile);
  const resetPw = useServerFn(resetNicknamePassword);


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

  const resetPwMutation = useMutation({
    mutationFn: (id: string) => resetPw({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profiles"] });
      toast.success("닉네임 비밀번호를 초기화했어요. 다음 작성자가 다시 등록합니다.");
    },
    onError: () => toast.error("초기화 중 문제가 발생했어요."),
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
          작성자 이름과 해커톤 수상 정보를 연결해 주세요. 레벨은{" "}
          <b>활동 점수(게시글×5 + 댓글×1)</b>로 자동 산정됩니다. 글·댓글에서{" "}
          <b>이름이 정확히 일치</b>하면 자동으로 뱃지가 표시됩니다.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-12">
          <div className="space-y-2 sm:col-span-5">
            <Label htmlFor="p-name">사용자명</Label>
            <Input
              id="p-name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="예: 홍길동"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2 sm:col-span-7">
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

      <AwardIconPicker />


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
                    {p.level != null ? (
                      <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                        Lv.{p.level}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">활동 없음</span>
                    )}
                    {p.award.trim() && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        <Trophy className="h-3 w-3" />
                        {p.award}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      게시글 {p.postCount} · 댓글 {p.commentCount} · {p.points}점
                    </span>
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
                    if (confirm(`'${p.username}'의 닉네임 비밀번호를 초기화할까요? 분실 시에만 사용하세요.`)) {
                      resetPwMutation.mutate(p.id);
                    }
                  }}
                  aria-label="닉네임 비밀번호 초기화"
                  title="닉네임 비밀번호 초기화"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-sm active:scale-95"
                >
                  <KeyRound className="h-4 w-4" />
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
