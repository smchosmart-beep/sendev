// 나눔(온라인 갤러리 워크) — 성장형 활동기록 게시판 전용 화면
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Heart,
  Loader2,
  Trophy,
  Users,
} from "lucide-react";

import { categoriesQueryOptions } from "@/lib/platform.queries";
import { useStoredIdentity } from "@/hooks/useNicknameIdentity";
import { getAdminPassword } from "@/lib/admin-auth";
import {
  addGalleryStageComment,
  getGalleryOverview,
  getGalleryRecord,
  getGalleryStage,
  getGroupResult,
  pickGalleryQuotes,
  sendGalleryHeart,
  submitGalleryEvaluation,
  type GalleryOverviewDTO,
  type GalleryRecordDTO,
} from "@/lib/record-gallery.functions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PasswordInput } from "@/components/PasswordInput";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_main/board/$slug/gallery")({
  head: () => ({
    meta: [
      { title: "나눔 · 온라인 갤러리 워크 | SenDev" },
      {
        name: "description",
        content:
          "모둠 동료의 활동기록과 배포 주소를 직접 열어 보고, 세 항목으로 평가해 모둠 대표를 정하는 온라인 갤러리 워크입니다.",
      },
      { property: "og:title", content: "나눔 · 온라인 갤러리 워크 | SenDev" },
      {
        property: "og:description",
        content: "설명 없이 직접 써 보고, 동료 평가로 발표자를 정하는 나눔 활동입니다.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      나눔을 불러오지 못했어요: {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-6 text-sm">게시판을 찾을 수 없어요.</div>,
  component: GalleryPage,
});

interface Auth {
  author: string;
  nicknamePassword: string;
  adminPassword: string;
}

function GalleryPage() {
  const { slug } = useParams({ from: "/_main/board/$slug/gallery" });
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const category = categories.find((c) => c.slug === slug);
  const { identity } = useStoredIdentity();

  const [auth, setAuth] = useState<Auth | null>(null);
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");

  useEffect(() => {
    if (identity) {
      setName((v) => v || identity.author);
      setPw((v) => v || identity.nicknamePassword);
    }
  }, [identity]);

  if (!category) return null;
  if (category.recordKind !== "growth") {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        나눔은 성장형 활동기록 게시판에서만 사용할 수 있어요.
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <h1 className="text-xl font-bold text-foreground">온라인 갤러리 워크</h1>
        <p className="text-sm text-muted-foreground">
          평소 쓰던 닉네임과 닉네임 비밀번호로 본인 확인을 해 주세요.
        </p>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setAuth({
              author: name.trim(),
              nicknamePassword: pw,
              adminPassword: getAdminPassword(),
            });
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="닉네임"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          <PasswordInput
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="닉네임 비밀번호"
          />
          <Button type="submit" className="w-full" disabled={!name.trim()}>
            들어가기
          </Button>
        </form>
        <Link
          to="/board/$slug"
          params={{ slug }}
          className="block text-center text-xs text-muted-foreground underline"
        >
          기록 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return <GalleryInner slug={slug} categoryId={category.id} auth={auth} />;
}

function GalleryInner({
  slug,
  categoryId,
  auth,
}: {
  slug: string;
  categoryId: string;
  auth: Auth;
}) {
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getGalleryOverview);
  const {
    data: overview,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["gallery", categoryId, auth.author],
    queryFn: () => fetchOverview({ data: { categoryId, ...auth } }),
  });

  const [showRoster, setShowRoster] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">불러오는 중...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6 text-sm text-destructive">나눔을 열지 못했어요: {error.message}</div>
    );
  }
  if (!overview) return null;

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["gallery"] });

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">온라인 갤러리 워크</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              참가 {overview.totalCount}명 · 모둠 {overview.groupCount}개 · 자리 이동 없음 · 내
              모둠을 한 사람당 3분씩
            </p>
          </div>
          <Link
            to="/board/$slug"
            params={{ slug }}
            className="rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
          >
            기록 목록
          </Link>
        </div>
        {!overview.open && (
          <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
            아직 나눔이 열리지 않았어요. 관리자가 열면 평가를 제출할 수 있습니다.
          </p>
        )}
        <button
          type="button"
          onClick={() => setShowRoster((v) => !v)}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {showRoster ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          전체 편성표
        </button>
        {showRoster && (
          <div className="mt-3 space-y-3">
            {overview.groups.map((g) => (
              <div key={g.id} className="rounded-2xl border border-border p-3">
                <p className="text-xs font-bold text-foreground">{g.number}모둠</p>
                <ul className="mt-2 space-y-1.5">
                  {g.members.map((m) => (
                    <li key={m.postId} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{m.author}</span>
                      {m.projectName ? ` · ${m.projectName}` : ""}
                      {m.oneLine ? ` · ${m.oneLine}` : ""}
                      {m.resultUrl && (
                        <a
                          href={m.resultUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-1.5 inline-flex items-center gap-0.5 text-primary underline"
                        >
                          배포 주소 <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {overview.groups.length === 0 && (
              <p className="text-xs text-muted-foreground">아직 모둠이 편성되지 않았어요.</p>
            )}
          </div>
        )}
      </header>

      <Tabs defaultValue="walk">
        <TabsList className="w-full">
          <TabsTrigger value="walk" className="flex-1">
            01 갤러리 워크
          </TabsTrigger>
          <TabsTrigger value="result" className="flex-1">
            02 우리 모둠 결과
          </TabsTrigger>
          <TabsTrigger value="stage" className="flex-1">
            03 전체 발표 4인
          </TabsTrigger>
        </TabsList>

        <TabsContent value="walk" className="mt-4">
          <WalkPanel
            categoryId={categoryId}
            auth={auth}
            overview={overview}
            onSaved={invalidate}
          />
        </TabsContent>
        <TabsContent value="result" className="mt-4">
          <ResultPanel categoryId={categoryId} auth={auth} />
        </TabsContent>
        <TabsContent value="stage" className="mt-4">
          <StagePanel categoryId={categoryId} auth={auth} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------ 01 갤러리 워크 ------------------------------ */

function WalkPanel({
  categoryId,
  auth,
  overview,
  onSaved,
}: {
  categoryId: string;
  auth: Auth;
  overview: GalleryOverviewDTO;
  onSaved: () => void;
}) {
  const myGroup = overview.groups.find((g) =>
    g.members.some((m) => m.postId === overview.myPostId),
  );
  const members = myGroup?.members ?? [];
  const others = members.filter((m) => m.postId !== overview.myPostId);
  const [selected, setSelected] = useState<string | null>(others[0]?.postId ?? null);

  if (!myGroup) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        아직 모둠에 편성되지 않았어요. 편성 후 다시 열어 주세요.
      </div>
    );
  }

  const doneCount = others.filter((m) => overview.myDonePostIds.includes(m.postId)).length;

  return (
    <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
      <aside className="rounded-2xl border border-border bg-card p-3">
        <p className="px-1 pb-2 text-xs font-bold text-foreground">
          {doneCount} / {others.length}명 둘러봄
        </p>
        <ul className="space-y-1">
          {members.map((m) => {
            const isMe = m.postId === overview.myPostId;
            const done = overview.myDonePostIds.includes(m.postId);
            return (
              <li key={m.postId}>
                <button
                  type="button"
                  disabled={isMe}
                  onClick={() => setSelected(m.postId)}
                  className={cn(
                    "w-full rounded-xl px-3 py-2 text-left text-sm transition-colors",
                    selected === m.postId ? "bg-primary/10 text-foreground" : "hover:bg-muted",
                    isMe && "opacity-60",
                  )}
                >
                  <span className="font-medium">{m.author}</span>
                  {isMe && <span className="ml-1 text-xs text-muted-foreground">평가 제외</span>}
                  {!isMe && done && <span className="ml-1 text-xs text-primary">✓ 둘러봄</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section>
        {selected ? (
          <RecordPanel
            key={selected}
            categoryId={categoryId}
            postId={selected}
            auth={auth}
            open={overview.open}
            onSaved={onSaved}
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            왼쪽에서 둘러볼 사람을 골라 주세요.
          </div>
        )}
      </section>
    </div>
  );
}

const SCORE_ITEMS: { key: "problem" | "effect" | "accuracy"; label: string }[] = [
  { key: "problem", label: "문제의 적절성" },
  { key: "effect", label: "기대 효과" },
  { key: "accuracy", label: "동작의 정확성" },
];

function RecordPanel({
  categoryId,
  postId,
  auth,
  open,
  onSaved,
}: {
  categoryId: string;
  postId: string;
  auth: Auth;
  open: boolean;
  onSaved: () => void;
}) {
  const fetchRecord = useServerFn(getGalleryRecord);
  const submit = useServerFn(submitGalleryEvaluation);
  const { data, isLoading } = useQuery({
    queryKey: ["galleryRecord", categoryId, postId, auth.author],
    queryFn: () => fetchRecord({ data: { categoryId, postId, ...auth } }),
  });

  const [scores, setScores] = useState({ problem: 0, effect: 0, accuracy: 0 });
  const [notVisited, setNotVisited] = useState(false);
  const [takeaway, setTakeaway] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const ev = data?.myEvaluation;
    if (ev) {
      setScores({ problem: ev.problem, effect: ev.effect, accuracy: ev.accuracy });
      setNotVisited(ev.notVisited);
      setTakeaway(ev.takeaway);
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중...
      </div>
    );
  }
  if (!data) return null;

  const record: GalleryRecordDTO = data;
  const canSubmit =
    scores.problem > 0 && scores.effect > 0 && (notVisited || scores.accuracy > 0);

  const handleSubmit = async () => {
    setSaving(true);
    setMsg("");
    try {
      await submit({
        data: {
          categoryId,
          postId,
          problem: scores.problem,
          effect: scores.effect,
          accuracy: notVisited ? 0 : scores.accuracy,
          notVisited,
          takeaway,
          ...auth,
        },
      });
      setMsg("평가를 제출했어요.");
      onSaved();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "제출하지 못했어요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs font-bold text-muted-foreground">01 · 02 프로젝트와 문제</p>
        <h2 className="mt-1 text-lg font-bold text-foreground">
          {record.projectName || record.author}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{record.oneLine}</p>
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="text-xs font-semibold text-muted-foreground">해결하려는 문제</dt>
            <dd className="whitespace-pre-wrap text-foreground">{record.problemText}</dd>
          </div>
          {record.evidence && (
            <div>
              <dt className="text-xs font-semibold text-muted-foreground">문제를 발견한 경험</dt>
              <dd className="whitespace-pre-wrap text-foreground">{record.evidence}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs font-bold text-muted-foreground">03 결과물</p>
        {record.features.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
            {record.features.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        )}
        {record.flow.length > 0 && (
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {record.flow.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ol>
        )}
        {record.resultUrl && (
          <a
            href={record.resultUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            열어서 직접 써 보기 <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs font-bold text-muted-foreground">04 검토 및 개선</p>
        <ul className="mt-2 space-y-2 text-sm">
          {record.fixes.map((f) => (
            <li key={f.label}>
              <span className="text-xs font-semibold text-muted-foreground">{f.label}</span>
              <p className="text-foreground">{f.what || "—"}</p>
              {f.how && <p className="text-xs text-muted-foreground">어떻게: {f.how}</p>}
              {f.skipped && (
                <p className="text-xs text-muted-foreground">고치지 않기로 한 것: {f.skipped}</p>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs font-bold text-muted-foreground">05 성찰과 성장</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{record.learned}</p>
        {record.nextPlan && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            다음에 보완하고 싶은 것: {record.nextPlan}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={notVisited}
            onChange={(e) => setNotVisited(e.target.checked)}
          />
          배포 주소를 아직 안 열어 봤어요
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          체크하면 동작의 정확성은 집계에서 빠집니다.
        </p>

        <div className="mt-4 space-y-3">
          {SCORE_ITEMS.map((item) => (
            <div key={item.key} className="flex flex-wrap items-center gap-2">
              <span className="w-28 text-sm text-foreground">{item.label}</span>
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={item.key === "accuracy" && notVisited}
                  onClick={() => setScores((s) => ({ ...s, [item.key]: n }))}
                  className={cn(
                    "h-9 w-9 rounded-lg border text-sm transition-colors",
                    scores[item.key] === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted",
                    item.key === "accuracy" && notVisited && "opacity-40",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold text-muted-foreground">
            내가 가져갈 한 줄 (선택 · 40자)
          </label>
          <input
            value={takeaway}
            maxLength={40}
            onChange={(e) => setTakeaway(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <Button
          className="mt-4 w-full"
          disabled={!canSubmit || saving || !open}
          onClick={() => void handleSubmit()}
        >
          {saving ? "제출 중..." : "평가 제출 · 둘러봄 기록"}
        </Button>
        {!open && (
          <p className="mt-2 text-xs text-muted-foreground">나눔이 열리면 제출할 수 있어요.</p>
        )}
        {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
      </div>
    </div>
  );
}

/* ---------------------------- 02 우리 모둠 결과 ---------------------------- */

function ResultPanel({ categoryId, auth }: { categoryId: string; auth: Auth }) {
  const qc = useQueryClient();
  const fetchResult = useServerFn(getGroupResult);
  const pick = useServerFn(pickGalleryQuotes);
  const { data, isLoading } = useQuery({
    queryKey: ["galleryResult", categoryId, auth.author],
    queryFn: () => fetchResult({ data: { categoryId, ...auth } }),
  });

  const [picked, setPicked] = useState<string[] | null>(null);
  const current = picked ?? data?.pickedIds ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중...
      </div>
    );
  }
  if (!data || data.groupNumber === null) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        아직 모둠 결과가 없어요.
      </div>
    );
  }

  const toggle = async (id: string) => {
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id].slice(-2);
    setPicked(next);
    await pick({ data: { categoryId, evaluationIds: next, ...auth } });
    void qc.invalidateQueries({ queryKey: ["galleryResult"] });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-bold text-foreground">
            {data.groupNumber}모둠 결과 · 12점 만점
          </h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          배포 주소를 열지 않은 사람의 동작 정확성은 해당 항목 평균에서 제외됩니다. (제출{" "}
          {data.submittedCount}/{data.memberCount}명)
        </p>
        <ol className="mt-3 space-y-2">
          {data.scores.map((s, i) => (
            <li
              key={s.postId}
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm",
                i === 0 && "border-primary/40 bg-primary/5",
              )}
            >
              <span className="font-medium text-foreground">
                {i + 1}. {s.author}
                {i === 0 && (
                  <span className="ml-1.5 inline-flex items-center gap-1 text-xs text-primary">
                    <Trophy className="h-3 w-3" /> 모둠 1위
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {s.problem} + {s.effect} + {s.accuracy} ={" "}
                <span className="font-bold text-foreground">{s.total}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold text-foreground">내가 받은 “내가 가져갈 한 줄”</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          2개를 고르면 07 성장 사례집에 익명 인용으로 실립니다.
        </p>
        {data.myQuotes.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">아직 받은 한 줄이 없어요.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.myQuotes.map((q) => (
              <li key={q.evaluationId}>
                <button
                  type="button"
                  onClick={() => void toggle(q.evaluationId)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                    current.includes(q.evaluationId)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted",
                  )}
                >
                  “{q.takeaway}”
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------------------------- 03 전체 발표 4인 ---------------------------- */

function StagePanel({ categoryId, auth }: { categoryId: string; auth: Auth }) {
  const qc = useQueryClient();
  const fetchStage = useServerFn(getGalleryStage);
  const heart = useServerFn(sendGalleryHeart);
  const comment = useServerFn(addGalleryStageComment);
  const { data, isLoading } = useQuery({
    queryKey: ["galleryStage", categoryId, auth.author],
    queryFn: () => fetchStage({ data: { categoryId, ...auth } }),
  });
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["galleryStage"] });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중...
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        집계하기를 누르면 문제 영역별 상대점수 1위가 표시됩니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((s) => (
        <div key={s.stageId} className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-bold text-muted-foreground">
            발표 {s.orderNo} · {s.area}
          </p>
          <h2 className="mt-1 text-lg font-bold text-foreground">
            {s.projectName || s.author}
          </h2>
          <p className="text-sm text-muted-foreground">
            {s.author}
            {s.oneLine ? ` · ${s.oneLine}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {s.resultUrl && (
              <a
                href={s.resultUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                배포 주소 열기 <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button
              type="button"
              disabled={s.hearted}
              onClick={async () => {
                await heart({ data: { categoryId, stageId: s.stageId, ...auth } });
                invalidate();
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm",
                s.hearted ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
              )}
            >
              <Heart className={cn("h-4 w-4", s.hearted && "fill-current")} /> 하트 {s.hearts}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">내 화면 공유 준비</p>

          <div className="mt-4 space-y-2">
            {s.comments.map((c) => (
              <p key={c.id} className="rounded-xl bg-muted px-3 py-2 text-sm text-foreground">
                <span className="mr-1.5 text-xs text-muted-foreground">{c.author}</span>
                {c.content}
              </p>
            ))}
            <div className="flex gap-2">
              <input
                value={drafts[s.stageId] ?? ""}
                maxLength={80}
                onChange={(e) => setDrafts((d) => ({ ...d, [s.stageId]: e.target.value }))}
                placeholder="코멘트 한 줄 (80자)"
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Button
                variant="outline"
                disabled={!(drafts[s.stageId] ?? "").trim()}
                onClick={async () => {
                  await comment({
                    data: {
                      categoryId,
                      stageId: s.stageId,
                      content: (drafts[s.stageId] ?? "").trim(),
                      ...auth,
                    },
                  });
                  setDrafts((d) => ({ ...d, [s.stageId]: "" }));
                  invalidate();
                }}
              >
                남기기
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
