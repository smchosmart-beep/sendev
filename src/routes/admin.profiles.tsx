import { getProfileAdminPassword, setProfileAdminPassword } from "@/lib/admin-auth";
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { UserCog, Trophy, Trash2, Lock, AlertCircle, KeyRound, Plus, X, Search, Users, Settings2, Eye, EyeOff, icons as lucideIcons } from "lucide-react";

import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  userProfilesQueryOptions,
  awardIconQueryOptions,
  awardIconRulesQueryOptions,
} from "@/lib/platform.queries";
import {
  upsertUserProfile,
  addUserAward,
  deleteUserAward,
  deleteUserProfile,
  resetNicknamePassword,
  verifyProfileAdmin,
  setAwardIcon,
  addAwardIconRule,
  deleteAwardIconRule,
  resolveAwardIcon,
  AWARD_ICON_NAMES,
  type UserProfileDTO,
  type AwardIconName,
} from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";
import { useConfirm } from "@/hooks/useConfirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";


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
  const [showPw, setShowPw] = useState(false);

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
        setProfileAdminPassword(value);
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
        <div className="relative mt-6">
          <input
            type={showPw ? "text" : "password"}
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
              "w-full rounded-xl border bg-background px-4 py-3 pr-12 text-sm text-foreground outline-none transition-colors",
              error
                ? "border-destructive focus:border-destructive"
                : "border-border focus:border-primary",
            )}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
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
    mutationFn: (icon: AwardIconName) => save({ data: { icon, adminPassword: getProfileAdminPassword() } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["award-icon"] });
      toast.success("기본 배지 아이콘을 변경했어요.");
    },
    onError: () => toast.error("아이콘 저장 중 문제가 발생했어요."),
  });

  return (
    <div className="rounded-2xl bg-card p-6 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-foreground">
        <Trophy className="h-5 w-5 text-primary" />
        기본 배지 아이콘
      </h2>
      <p className="text-sm text-muted-foreground">
        어떤 키워드 규칙에도 맞지 않을 때 사용할 <b>기본 아이콘</b>입니다.
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

// Lets the admin manage keyword -> icon rules for award badges.
function AwardIconRules() {
  const queryClient = useQueryClient();
  const { data: rules = [] } = useQuery(awardIconRulesQueryOptions());
  const add = useServerFn(addAwardIconRule);
  const remove = useServerFn(deleteAwardIconRule);

  const [keyword, setKeyword] = useState("");
  const [icon, setIcon] = useState<AwardIconName>("Trophy");
  const { confirm, confirmDialog } = useConfirm();


  const addMutation = useMutation({
    mutationFn: () => add({ data: { keyword: keyword.trim(), icon, adminPassword: getProfileAdminPassword() } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["award-icon-rules"] });
      toast.success("규칙을 추가했어요.");
      setKeyword("");
      setIcon("Trophy");
    },
    onError: () => toast.error("규칙 추가 중 문제가 발생했어요."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id, adminPassword: getProfileAdminPassword() } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["award-icon-rules"] });
      toast.success("규칙을 삭제했어요.");
    },
    onError: () => toast.error("규칙 삭제 중 문제가 발생했어요."),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) {
      toast.error("키워드를 입력해 주세요.");
      return;
    }
    addMutation.mutate();
  };

  return (
    <div className="rounded-2xl bg-card p-6 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-foreground">
        <Trophy className="h-5 w-5 text-primary" />
        배지 키워드 규칙
      </h2>
      <p className="text-sm text-muted-foreground">
        수상명에 키워드가 포함되면 해당 아이콘을 사용합니다. (예: "대상" → 왕관)
        위쪽 규칙이 우선 적용됩니다.
      </p>

      {rules.length > 0 && (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border">
          {rules.map((rule) => {
            const Icon =
              (lucideIcons as Record<string, typeof Trophy>)[rule.icon] || Trophy;
            return (
              <li key={rule.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                  “{rule.keyword}”
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      await confirm({
                        description: `'${rule.keyword}' 규칙을 삭제할까요?`,
                        destructive: true,
                        confirmText: "삭제",
                      })
                    ) {
                      deleteMutation.mutate(rule.id);
                    }
                  }}
                  aria-label="규칙 삭제"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive text-destructive-foreground shadow-sm active:scale-95"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={handleAdd} className="mt-5 space-y-3">
        <div className="space-y-2">
          <Label htmlFor="rule-keyword">키워드</Label>
          <Input
            id="rule-keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="예: 대상"
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label>아이콘</Label>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
            {AWARD_ICON_NAMES.map((name) => {
              const Icon =
                (lucideIcons as Record<string, typeof Trophy>)[name] || Trophy;
              const selected = icon === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setIcon(name)}
                  aria-label={name}
                  aria-pressed={selected}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-xl border transition-all active:scale-95",
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
        <Button
          type="submit"
          disabled={addMutation.isPending}
          className="rounded-xl active:scale-95"
        >
          <Plus className="mr-1 h-4 w-4" />
          {addMutation.isPending ? "추가 중..." : "규칙 추가"}
        </Button>
      </form>
    </div>
  );
}



function ProfilesAdmin() {

  const queryClient = useQueryClient();
  const { data: profiles = [] as UserProfileDTO[] } = useQuery(
    userProfilesQueryOptions(),
  );
  const { data: awardIcon } = useQuery(awardIconQueryOptions());
  const { data: awardRules = [] } = useQuery(awardIconRulesQueryOptions());
  const upsert = useServerFn(upsertUserProfile);
  const addAward = useServerFn(addUserAward);
  const removeAward = useServerFn(deleteUserAward);
  const remove = useServerFn(deleteUserProfile);
  const resetPw = useServerFn(resetNicknamePassword);


  const [username, setUsername] = useState("");
  const [award, setAward] = useState("");

  // 사용자 목록 검색/필터/정렬/페이지네이션
  const PAGE_SIZE = 20;
  const [search, setSearch] = useState("");
  const [badgeFilter, setBadgeFilter] = useState<"all" | "with" | "without">("all");
  const [activityFilter, setActivityFilter] = useState<"all" | "active" | "inactive">("all");
  const [sort, setSort] = useState<"name" | "points-desc" | "points-asc">("name");
  const [page, setPage] = useState(1);

  // 목록 행 내 인라인 배지 추가
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [addingValue, setAddingValue] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (profiles as UserProfileDTO[]).filter((p) => {
      if (q && !p.username.toLowerCase().includes(q)) return false;
      if (badgeFilter === "with" && p.awards.length === 0) return false;
      if (badgeFilter === "without" && p.awards.length > 0) return false;
      if (activityFilter === "active" && p.level == null) return false;
      if (activityFilter === "inactive" && p.level != null) return false;
      return true;
    });
    list.sort((a, b) => {
      if (sort === "points-desc") return b.points - a.points;
      if (sort === "points-asc") return a.points - b.points;
      return a.username.localeCompare(b.username, "ko");
    });
    return list;
  }, [profiles, search, badgeFilter, activityFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [search, badgeFilter, activityFilter, sort]);


  const reset = () => {
    setUsername("");
    setAward("");
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["user-profiles"] });
    queryClient.invalidateQueries({ queryKey: ["profile-map"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const name = username.trim();
      const badge = award.trim();
      if (badge) {
        await addAward({ data: { username: name, name: badge, adminPassword: getProfileAdminPassword() } });
      } else {
        await upsert({ data: { username: name, adminPassword: getProfileAdminPassword() } });
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success(award.trim() ? "배지를 추가했어요." : "사용자를 등록했어요.");
      reset();
    },
    onError: () => toast.error("저장 중 문제가 발생했어요."),
  });

  const removeAwardMutation = useMutation({
    mutationFn: (id: string) => removeAward({ data: { id, adminPassword: getProfileAdminPassword() } }),
    onSuccess: () => {
      invalidate();
      toast.success("배지를 삭제했어요.");
    },
    onError: () => toast.error("삭제 중 문제가 발생했어요."),
  });

  const inlineAddMutation = useMutation({
    mutationFn: ({ username, name }: { username: string; name: string }) =>
      addAward({ data: { username, name, adminPassword: getProfileAdminPassword() } }),
    onSuccess: () => {
      invalidate();
      toast.success("배지를 추가했어요.");
      setAddingFor(null);
      setAddingValue("");
    },
    onError: () => toast.error("배지 추가 중 문제가 발생했어요."),
  });

  const submitInlineAdd = (p: UserProfileDTO) => {
    const name = addingValue.trim();
    if (!name) {
      toast.error("배지 이름을 입력해 주세요.");
      return;
    }
    inlineAddMutation.mutate({ username: p.username, name });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id, adminPassword: getProfileAdminPassword() } }),
    onSuccess: () => {
      invalidate();
      toast.success("프로필을 삭제했어요.");
    },
    onError: () => toast.error("삭제 중 문제가 발생했어요."),
  });

  const resetPwMutation = useMutation({
    mutationFn: (id: string) => resetPw({ data: { id, adminPassword: getProfileAdminPassword() } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profiles"] });
      toast.success("닉네임 비밀번호를 초기화했어요. 다음 작성자가 다시 등록합니다.");
    },
    onError: () => toast.error("초기화 중 문제가 발생했어요."),
  });




  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("사용자명을 입력해 주세요.");
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Tabs defaultValue="list" className="space-y-6">
      <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl">
        <TabsTrigger value="list" className="gap-1.5 rounded-lg">
          <Users className="h-4 w-4" />
          사용자 목록
        </TabsTrigger>
        <TabsTrigger value="settings" className="gap-1.5 rounded-lg">
          <Settings2 className="h-4 w-4" />
          관리 설정
        </TabsTrigger>
      </TabsList>

      <TabsContent value="settings" className="space-y-6">
      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-foreground">
          <UserCog className="h-5 w-5 text-primary" />
          사용자 프로필 관리
        </h2>
        <p className="text-sm text-muted-foreground">
          작성자 이름과 해커톤 수상 정보를 연결해 주세요. 레벨은{" "}
          <b>활동 점수(게시글×5 + 댓글×1)</b>로 자동 산정됩니다. 한 사용자에게{" "}
          <b>배지를 여러 개</b> 추가할 수 있고, 글·댓글에서 <b>이름이 정확히 일치</b>하면
          자동으로 뱃지가 표시됩니다.
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
            <Label htmlFor="p-award">배지 추가 (선택)</Label>
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
              {saveMutation.isPending
                ? "저장 중..."
                : award.trim()
                  ? "배지 추가"
                  : "사용자 등록"}
            </Button>
            {(username || award) && (
              <Button
                type="button"
                variant="secondary"
                onClick={reset}
                className="rounded-xl active:scale-95"
              >
                초기화
              </Button>
            )}
          </div>
        </form>
      </div>

      <AwardIconPicker />

      <AwardIconRules />
      </TabsContent>

      <TabsContent value="list" className="space-y-4">
        <div className="rounded-2xl bg-card p-4 shadow-sm sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="사용자명으로 검색"
              className="rounded-xl pl-9"
            />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Select value={badgeFilter} onValueChange={(v) => setBadgeFilter(v as typeof badgeFilter)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="배지" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">배지 전체</SelectItem>
                <SelectItem value="with">배지 있음</SelectItem>
                <SelectItem value="without">배지 없음</SelectItem>
              </SelectContent>
            </Select>
            <Select value={activityFilter} onValueChange={(v) => setActivityFilter(v as typeof activityFilter)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="활동" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">활동 전체</SelectItem>
                <SelectItem value="active">활동 있음</SelectItem>
                <SelectItem value="inactive">활동 없음</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="정렬" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">이름순</SelectItem>
                <SelectItem value="points-desc">점수 높은순</SelectItem>
                <SelectItem value="points-asc">점수 낮은순</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            전체 {profiles.length}명 중 검색 결과 {filtered.length}명
          </p>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title={profiles.length === 0 ? "등록된 프로필이 없어요." : "조건에 맞는 사용자가 없어요."}
            description={
              profiles.length === 0
                ? "관리 설정 탭에서 사용자명을 추가해 보세요."
                : "검색어나 필터를 변경해 보세요."
            }
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
              <ul className="divide-y divide-border">
                {paged.map((p: UserProfileDTO) => (
                  <li
                    key={p.id}
                    className="px-5 py-4"
                  >
                    <div className="flex items-center gap-3">
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
                        {p.awards.map((a) => {
                          const iconName = resolveAwardIcon(
                            a.name,
                            awardRules,
                            awardIcon ?? "Trophy",
                          );
                          const AwardIcon =
                            (lucideIcons as Record<string, typeof Trophy>)[iconName] ||
                            Trophy;
                          return (
                            <span
                              key={a.id}
                              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                            >
                              <AwardIcon className="h-3 w-3" />
                              {a.name}
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`'${a.name}' 배지를 삭제할까요?`)) {
                                    removeAwardMutation.mutate(a.id);
                                  }
                                }}
                                aria-label="배지 삭제"
                                className="ml-0.5 rounded-full p-0.5 text-muted-foreground transition hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          );
                        })}
                        <span className="text-xs text-muted-foreground">
                          게시글 {p.postCount} · 댓글 {p.commentCount} · {p.points}점
                        </span>
                      </div>

                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAddingFor((prev) => (prev === p.id ? null : p.id));
                        setAddingValue("");
                      }}
                      aria-label="이 사용자에 배지 추가"
                      title="이 사용자에 배지 추가"
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-sm active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
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
                    </div>
                    {addingFor === p.id && (
                      <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted/60 p-2">
                        <Input
                          autoFocus
                          value={addingValue}
                          onChange={(e) => setAddingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              submitInlineAdd(p);
                            }
                          }}
                          placeholder="배지 이름 (예: AI교육 부문 대상)"
                          className="rounded-lg bg-background"
                        />
                        <Button
                          type="button"
                          onClick={() => submitInlineAdd(p)}
                          disabled={inlineAddMutation.isPending}
                          className="rounded-lg active:scale-95"
                        >
                          추가
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setAddingFor(null);
                            setAddingValue("");
                          }}
                          className="rounded-lg active:scale-95"
                        >
                          취소
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((prev) => Math.max(1, prev - 1));
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <PaginationItem key={n}>
                      <PaginationLink
                        href="#"
                        isActive={n === currentPage}
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(n);
                        }}
                      >
                        {n}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((prev) => Math.min(totalPages, prev + 1));
                      }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}
