// 성장형(개인) 활동기록 편집기 — 7단계 위저드.
// 도전형 RecordEditor와 동일한 UI 패턴(단계 탭 · 1초 지연 자동 저장 · 관리자 잠금 해제)을 사용한다.
// 04 검토 및 개선은 원본 HTML 구조를 따른다: 1차 자기 점검 · 2차 AI 점검 · 3차 동료 점검 탭.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  ChevronDown,
  Copy,
  ImagePlus,
  Import,
  Loader2,
  MessageSquare,
  Plus,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  classifyGrowthPeerFeedback,
  getGrowthPeerAssignments,
  getGrowthPeerSummaries,
  getGrowthRecord,
  listGrowthPeerFeedbacks,
  saveGrowthRecord,
  sendGrowthPeerFeedback,
} from "@/lib/record-growth.functions";
import { isRecordAdmin } from "@/lib/record.functions";
import {
  
  GROWTH_ANGLE_CHOICES,
  GROWTH_ANGLE_ITEMS,
  GROWTH_CHECK_CHOICES,
  GROWTH_EDUCATION_FIELD,
  GROWTH_EMPTY,
  GROWTH_EMPTY_REVIEW,
  GROWTH_ERROR_GUIDE,
  GROWTH_ETHICS_PRINCIPLES,
  GROWTH_FIELD_MAX,
  GROWTH_FIX_KIND_LABELS,
  GROWTH_FIX_MAX,
  GROWTH_FIX_TYPES,
  GROWTH_GROWTH_FIELDS_A,
  GROWTH_GROWTH_FIELDS_B,
  GROWTH_HERO_MAX_BYTES,
  GROWTH_PRIVACY_CHOICES,
  GROWTH_PROBLEM_FIELDS,
  GROWTH_PROJECT_FIELDS,
  GROWTH_REPEATER_ITEM_MAX,
  GROWTH_REPEATER_MAX,
  GROWTH_RESULT_FIELDS,
  GROWTH_SELF_CHECK_ITEMS,
  GROWTH_STEP_META,
  growthAiQuestions,
  growthCompletionPercent,
  growthFixDone,
  growthLaterItems,
  growthStatusSuggestion,
  growthStepProgress,
  type GrowthAngleKey,
  type GrowthAngleValue,
  type GrowthCheckValue,
  type GrowthField,
  type GrowthFieldKey,
  type GrowthFix,
  type GrowthFixType,
  type GrowthReceivedFeedback,
  type GrowthRecordData,
  type GrowthReviewData,
  type GrowthReviewKind,
  type GrowthSelfCheckKey,
} from "@/lib/record-growth-schema";
import { GrowthReadmeOutput } from "@/components/record/GrowthReadmeOutput";
import { GrowthCasebookOutput } from "@/components/record/GrowthCasebookDocument";
import { rotateImageBlob, uploadCommentImage } from "@/lib/image-upload";
import { getAdminPassword, setAdminPassword } from "@/lib/admin-auth";
import { getMyGalleryQuotes } from "@/lib/record-gallery.functions";
import { useStoredIdentity } from "@/hooks/useNicknameIdentity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Patch = Record<string, unknown>;

export function GrowthRecordEditor({ postId }: { postId: string }) {
  const queryClient = useQueryClient();
  const fetchGrowth = useServerFn(getGrowthRecord);
  const saveGrowth = useServerFn(saveGrowthRecord);
  const checkAdmin = useServerFn(isRecordAdmin);
  const { identity } = useStoredIdentity();

  const [step, setStep] = useState(0);
  const [data, setData] = useState<GrowthRecordData | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "unsaved">("idle");

  const { data: bundle, isLoading } = useQuery({
    queryKey: ["record-growth", postId],
    queryFn: () => fetchGrowth({ data: { postId } }),
  });

  const [adminPw, setAdminPw] = useState("");
  useEffect(() => {
    setAdminPw(getAdminPassword());
    const handler = () => setAdminPw(getAdminPassword());
    window.addEventListener("admin-password-changed", handler);
    return () => window.removeEventListener("admin-password-changed", handler);
  }, []);

  const auth = useMemo(
    () => ({
      author: identity?.author ?? "",
      nicknamePassword: identity?.nicknamePassword ?? "",
      adminPassword: adminPw || getAdminPassword(),
    }),
    [identity?.author, identity?.nicknamePassword, adminPw],
  );

  // 07 사례집: 나눔에서 내가 고른 인용 2줄 (없으면 빈 배열)
  const fetchQuotes = useServerFn(getMyGalleryQuotes);
  const { data: galleryQuotes } = useQuery({
    queryKey: ["galleryQuotes", bundle?.categoryId, auth.author],
    queryFn: () =>
      fetchQuotes({ data: { categoryId: bundle!.categoryId, ...auth } }).catch(() => []),
    enabled: !!bundle?.categoryId && !!auth.author && step === 6,
  });

  const isOwner = useMemo(() => {
    if (!bundle) return false;
    const me = (identity?.author ?? "").trim().toLowerCase();
    return !!me && bundle.author.trim().toLowerCase() === me;
  }, [bundle, identity?.author]);

  const canEdit = isOwner || !!auth.adminPassword;
  const isAdminEditing = !isOwner && !!auth.adminPassword;

  const [adminOpen, setAdminOpen] = useState(false);
  const [adminInput, setAdminInput] = useState("");
  const [adminChecking, setAdminChecking] = useState(false);

  const unlockAdmin = async () => {
    const pw = adminInput.trim();
    if (!pw) return;
    setAdminChecking(true);
    try {
      const res = await checkAdmin({ data: { adminPassword: pw } });
      if (!res.ok) {
        toast.error("관리자 비밀번호가 올바르지 않아요.");
        return;
      }
      setAdminPassword(pw);
      setAdminPw(pw);
      setAdminOpen(false);
      setAdminInput("");
      toast.success("관리자 권한으로 편집할 수 있어요.");
    } catch (err) {
      console.error("growth admin unlock failed", err);
      toast.error("확인에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setAdminChecking(false);
    }
  };

  const knownUpdatedAt = useRef("");
  const pending = useRef<Patch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!bundle) return;
    knownUpdatedAt.current = bundle.data.updatedAt ?? "";
    setData({ ...GROWTH_EMPTY, ...bundle.data, review: bundle.data.review ?? GROWTH_EMPTY_REVIEW });
  }, [bundle]);

  const saving = useRef(false);

  const flush = useCallback(async (): Promise<void> => {
    if (saving.current) return; // 진행 중이면 끝난 뒤 이어서 보냄
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    saving.current = true;
    setStatus("saving");
    try {
      let res: { updatedAt: string };
      try {
        res = await saveGrowth({
          data: { postId, knownUpdatedAt: knownUpdatedAt.current, patch, ...auth },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (!msg.includes("다른 곳에서 먼저")) throw err;
        // 최신 저장 시각만 다시 받아 한 번 재시도
        const fresh = await fetchGrowth({ data: { postId } });
        knownUpdatedAt.current = fresh?.data?.updatedAt ?? "";
        res = await saveGrowth({
          data: { postId, knownUpdatedAt: knownUpdatedAt.current, patch, ...auth },
        });
      }
      knownUpdatedAt.current = res.updatedAt;
      setStatus(Object.keys(pending.current).length > 0 ? "unsaved" : "saved");
    } catch (err) {
      pending.current = { ...patch, ...pending.current };
      setStatus("unsaved");
      toast.error(err instanceof Error ? err.message : "저장 중 문제가 발생했어요.");
    } finally {
      saving.current = false;
      if (Object.keys(pending.current).length > 0) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void flush(), 600);
      }
    }
  }, [auth, fetchGrowth, postId, saveGrowth]);

  const queue = useCallback(
    (key: string, value: unknown) => {
      pending.current[key] = value;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 1000);
    },
    [flush],
  );

  const onField = useCallback(
    (key: GrowthFieldKey, value: string) => {
      const max = GROWTH_FIELD_MAX.get(key) ?? 500;
      const next = value.slice(0, max);
      setData((prev) => (prev ? { ...prev, [key]: next } : prev));
      queue(key, next);
    },
    [queue],
  );

  const onList = useCallback(
    (key: "features" | "flow" | "ethics", next: string[]) => {
      setData((prev) => (prev ? { ...prev, [key]: next } : prev));
      queue(key, next);
    },
    [queue],
  );

  const onHero = useCallback(
    (url: string) => {
      setData((prev) => (prev ? { ...prev, heroImageUrl: url } : prev));
      queue("heroImageUrl", url);
    },
    [queue],
  );

  const onReview = useCallback(
    (nextReview: GrowthReviewData) => {
      setData((prev) => (prev ? { ...prev, review: nextReview } : prev));
      queue("review", nextReview);
    },
    [queue],
  );

  const goStep = (i: number) => {
    if (timer.current) clearTimeout(timer.current);
    void flush();
    setStep(i);
  };

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-card p-6 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        활동기록을 불러오는 중이에요.
      </div>
    );
  }
  if (!bundle) {
    return (
      <p className="rounded-2xl bg-card p-6 text-sm text-muted-foreground shadow-sm">
        활동기록을 찾을 수 없어요.
      </p>
    );
  }

  const percent = growthCompletionPercent(data);
  const meta = GROWTH_STEP_META[step]!;
  const review = data.review ?? GROWTH_EMPTY_REVIEW;

  const importLater = () => {
    const items = growthLaterItems(review, receivedRef.current);
    if (items.length === 0) {
      toast.info("04에서 '다음에 고침'으로 분류한 항목이 아직 없어요.");
      return;
    }
    const joined = items.map((t) => `- ${t}`).join("\n");
    const base = data.nextPlan.trim();
    onField("nextPlan", (base ? `${base}\n` : "") + joined);
    toast.success("04의 '다음에 고침' 항목을 이어 붙였어요.");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">전체 작성률 {percent}%</p>
          <p className="text-xs text-muted-foreground">
            {status === "saving" ? "저장 중..." : status === "saved" ? "자동 저장됨" : "\u00a0"}
          </p>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <nav aria-label="작성 단계" className="rounded-2xl bg-card p-3 shadow-sm">
        <ol className="grid grid-cols-4 gap-2 sm:flex sm:flex-nowrap sm:overflow-x-auto">
          {GROWTH_STEP_META.map((s, i) => {
            const p = growthStepProgress(data, s.id);
            const hasRequired = !!p && p.total > 0 && s.id !== "readme" && s.id !== "casebook";
            return (
              <li key={s.no} className="min-w-0 sm:flex-1">
                <button
                  type="button"
                  onClick={() => goStep(i)}
                  className={cn(
                    "flex min-h-[3.5rem] w-full flex-col justify-center rounded-xl px-2 py-2 text-left transition-colors",
                    i === step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted",
                  )}
                >
                  <span className="flex items-center gap-1 text-[10px] font-semibold opacity-80">
                    {s.no}
                    {hasRequired && p.complete && <Check className="h-3 w-3" />}
                  </span>
                  <span className="block text-[10px] font-medium leading-tight break-keep sm:text-[11px]">
                    {s.name}
                  </span>
                  {hasRequired && (
                    <span className="block text-[9px] opacity-70">
                      {s.id === "review" ? `${p.done} / ${p.total} 점검` : `${p.done} / ${p.total} 작성`}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {!canEdit && (
        <div className="space-y-2 rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <p>이 기록은 작성자 본인과 관리자만 수정할 수 있어요.</p>
          {adminOpen ? (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void unlockAdmin();
              }}
            >
              <Input
                type="password"
                value={adminInput}
                onChange={(e) => setAdminInput(e.target.value)}
                placeholder="관리자 비밀번호"
                autoFocus
                className="h-9 w-52 rounded-xl bg-background"
              />
              <Button type="submit" size="sm" className="rounded-xl" disabled={adminChecking}>
                {adminChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : "확인"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-xl"
                onClick={() => setAdminOpen(false)}
              >
                취소
              </Button>
            </form>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => setAdminOpen(true)}
            >
              <ShieldCheck className="h-4 w-4" />
              관리자로 수정하기
            </Button>
          )}
        </div>
      )}

      {isAdminEditing && (
        <p className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">
          관리자 권한으로 편집 중이에요.
        </p>
      )}

      <section className="space-y-5 rounded-2xl bg-card p-5 shadow-sm">
        <header className="space-y-1">
          <h3 className="text-lg font-bold text-foreground">
            {meta.no} {meta.title}
          </h3>
          <p className="text-sm text-muted-foreground">{meta.hint}</p>
        </header>

        {step === 0 && (
          <FieldGrid fields={GROWTH_PROJECT_FIELDS} data={data} canEdit={canEdit} onChange={onField} />
        )}

        {step === 1 && (
          <FieldGrid fields={GROWTH_PROBLEM_FIELDS} data={data} canEdit={canEdit} onChange={onField} />
        )}

        {step === 2 && (
          <div className="space-y-5">
            <FieldGrid fields={GROWTH_RESULT_FIELDS} data={data} canEdit={canEdit} onChange={onField} />
            <Repeater
              label="핵심 기능"
              hint={`최대 ${GROWTH_REPEATER_MAX}줄까지 적을 수 있어요.`}
              placeholder="예) 질문 카드를 자동으로 만들어 줍니다."
              items={data.features}
              canEdit={canEdit}
              onChange={(next) => onList("features", next)}
            />
            <Repeater
              label="사용 흐름"
              hint={`최대 ${GROWTH_REPEATER_MAX}단계까지 적을 수 있어요.`}
              placeholder="예) 주제를 입력한다."
              items={data.flow}
              canEdit={canEdit}
              numbered
              onChange={(next) => onList("flow", next)}
            />
            <div className="space-y-2">
              <Label>대표 이미지</Label>
              <p className="text-xs text-muted-foreground">2MB 이하의 이미지를 등록해 주세요.</p>
              <HeroImageInput value={data.heroImageUrl} canEdit={canEdit} onChange={onHero} />
            </div>
          </div>
        )}

        {step === 3 && (
          <ReviewStep
            data={data}
            postId={postId}
            canEdit={canEdit}
            auth={auth}
            onReview={onReview}
          />
        )}

        {step === 4 && (
          <div className="space-y-5">
            <FieldGrid
              fields={GROWTH_GROWTH_FIELDS_A}
              data={data}
              canEdit={canEdit}
              onChange={onField}
            />
            <div className="space-y-2">
              <Label>개인정보 처리 여부</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {GROWTH_PRIVACY_CHOICES.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => onField("privacy", choice)}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left text-sm transition-colors",
                      data.privacy === choice
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
            <FieldGrid
              fields={[GROWTH_EDUCATION_FIELD]}
              data={data}
              canEdit={canEdit}
              onChange={onField}
            />
            <div className="space-y-2">
              <Label>중요하게 생각한 윤리 원칙</Label>
              <div className="flex flex-wrap gap-2">
                {GROWTH_ETHICS_PRINCIPLES.map((item) => {
                  const on = data.ethics.includes(item);
                  return (
                    <Button
                      key={item}
                      type="button"
                      size="sm"
                      disabled={!canEdit}
                      variant={on ? "default" : "outline"}
                      className="rounded-full active:scale-95"
                      onClick={() =>
                        onList(
                          "ethics",
                          GROWTH_ETHICS_PRINCIPLES.filter((x) =>
                            x === item ? !on : data.ethics.includes(x),
                          ),
                        )
                      }
                    >
                      {item}
                    </Button>
                  );
                })}
              </div>
            </div>
            <FieldGrid
              fields={GROWTH_GROWTH_FIELDS_B.filter((f) => f.key !== "nextPlan")}
              data={data}
              canEdit={canEdit}
              onChange={onField}
            />
            {/* 다음에 보완하고 싶은 것 — 04에서 가져오기 연계 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="growth-nextPlan">
                  다음에 보완하고 싶은 것<span className="ml-1 text-destructive">*</span>
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  {data.nextPlan.length} / 240
                </span>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canEdit}
                  className="rounded-xl active:scale-95"
                  onClick={importLater}
                >
                  <Import className="h-3.5 w-3.5" />
                  04에서 가져오기
                </Button>
              </div>
              <Textarea
                id="growth-nextPlan"
                value={data.nextPlan}
                disabled={!canEdit}
                placeholder="다음 행동이 보이도록 적어 주세요."
                onChange={(e) => onField("nextPlan", e.target.value)}
                className="min-h-24 rounded-xl"
              />
            </div>
          </div>
        )}

        {step === 5 && <GrowthReadmeOutput data={data} />}
        {step === 6 && (
          <GrowthCasebookOutput
            data={data}
            author={bundle.author}
            received={receivedRef.current}
            quotes={galleryQuotes ?? []}
          />
        )}
      </section>
    </div>
  );
}

/** 07 사례집에서 쓸 받은 피드백을 ReviewStep이 채워 두는 공유 저장소 */
const receivedRef: { current: GrowthReceivedFeedback[] } = { current: [] };

/* ------------------------------ 04 · 검토 및 개선 ---------------------------- */

function ReviewStep({
  data,
  postId,
  canEdit,
  auth,
  onReview,
}: {
  data: GrowthRecordData;
  postId: string;
  canEdit: boolean;
  auth: { author: string; nicknamePassword: string; adminPassword: string };
  onReview: (next: GrowthReviewData) => void;
}) {
  const review = data.review ?? GROWTH_EMPTY_REVIEW;
  const [tab, setTab] = useState<GrowthReviewKind>("self");
  const fetchPeers = useServerFn(getGrowthPeerAssignments);
  const fetchFeedbacks = useServerFn(listGrowthPeerFeedbacks);
  const fetchSummaries = useServerFn(getGrowthPeerSummaries);
  const sendFeedback = useServerFn(sendGrowthPeerFeedback);
  const classifyFeedback = useServerFn(classifyGrowthPeerFeedback);

  const { data: peerData, isLoading: peersLoading, refetch: refetchPeers } = useQuery({
    queryKey: ["growth-peers", postId],
    queryFn: () => fetchPeers({ data: { postId, ...auth } }),
    enabled: canEdit,
  });

  const assignments = useMemo(
    () => (peerData?.assignments?.length ? peerData.assignments : review.peer.assigned),
    [peerData?.assignments, review.peer.assigned],
  );

  const { data: feedbackData, isLoading: feedbacksLoading, refetch: refetchFeedbacks } = useQuery({
    queryKey: ["growth-feedbacks", postId],
    queryFn: () => fetchFeedbacks({ data: { postId, ...auth } }),
    enabled: canEdit,
  });

  useEffect(() => {
    if (feedbackData) receivedRef.current = feedbackData.received;
  }, [feedbackData]);

  const { data: summaries } = useQuery({
    queryKey: ["growth-peer-summaries", postId, assignments.map((a) => a.postId).join(",")],
    queryFn: () =>
      fetchSummaries({ data: { postId, postIds: assignments.map((a) => a.postId), ...auth } }),
    enabled: canEdit && assignments.length > 0,
  });

  const [assigning, setAssigning] = useState(false);
  const assignPeers = async () => {
    setAssigning(true);
    try {
      await refetchPeers();
      toast.success("점검 짝을 배정받았어요.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "배정에 실패했어요.");
    } finally {
      setAssigning(false);
    }
  };

  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const submitFeedback = async (toPostId: string, toName: string) => {
    const given = review.peer.given.find((g) => g.toPostId === toPostId);
    if (!given || (!given.expected.trim() && !given.actual.trim())) {
      toast.error("기대한 것과 실제로 나온 것을 적어 주세요.");
      return;
    }
    setSendingTo(toPostId);
    try {
      await sendFeedback({
        data: {
          fromPostId: postId,
          toPostId,
          toName,
          expected: given.expected,
          actual: given.actual,
          receiverType: "",
          ...auth,
        },
      });
      onReview({
        ...review,
        peer: {
          ...review.peer,
          given: review.peer.given.map((g) => (g.toPostId === toPostId ? { ...g, sent: true } : g)),
        },
      });
      toast.success("피드백을 전달했어요.");
      await refetchFeedbacks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "피드백 전달에 실패했어요.");
    } finally {
      setSendingTo(null);
    }
  };

  const setClassify = async (fb: GrowthReceivedFeedback, t: GrowthFixType) => {
    try {
      await classifyFeedback({ data: { feedbackId: fb.id, receiverType: t, ...auth } });
      await refetchFeedbacks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "분류에 실패했어요.");
    }
  };

  const doneCount = [review.self.fix, review.ai.fix, review.peer.fix].filter(growthFixDone).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          세 점검을 모두 마치고 점검마다 수정 기록을 남겨 주세요.
        </p>
        <p className="shrink-0 text-sm font-semibold text-foreground">{doneCount} / 3 점검</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as GrowthReviewKind)}>
        <TabsList className="grid w-full grid-cols-3 rounded-xl">
          {(["self", "ai", "peer"] as const).map((k) => (
            <TabsTrigger key={k} value={k} className="gap-1.5 rounded-lg text-xs sm:text-sm">
              {GROWTH_FIX_KIND_LABELS[k]}
              {growthFixDone(review[k].fix) && <Check className="h-3.5 w-3.5 text-primary" />}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="self" className="mt-5">
          <SelfPanel data={data} canEdit={canEdit} onReview={onReview} />
        </TabsContent>
        <TabsContent value="ai" className="mt-5">
          <AiPanel data={data} canEdit={canEdit} onReview={onReview} />
        </TabsContent>
        <TabsContent value="peer" className="mt-5">
          <PeerPanel
            data={data}
            canEdit={canEdit}
            onReview={onReview}
            assignments={assignments}
            summaries={summaries ?? []}
            peersLoading={peersLoading}
            onAssign={assignPeers}
            assigning={assigning}
            received={feedbackData?.received ?? []}
            feedbacksLoading={feedbacksLoading}
            onSend={submitFeedback}
            sendingTo={sendingTo}
            onClassify={setClassify}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------ 공통 수정 기록 ----------------------------- */

function FixBlock({
  kind,
  fix,
  title,
  canEdit,
  onChange,
}: {
  kind: GrowthReviewKind;
  fix: GrowthFix;
  title: string;
  canEdit: boolean;
  onChange: (fix: GrowthFix) => void;
}) {
  const promptText = `① 아직 수정하지 말고, 가능한 원인과 가장 먼저 확인할 한 가지를 알려 줘.
② 원인이 좁혀지면 그때 아래 한 가지만 고쳐 줘.
[증상] ${fix.what.trim() || "…"}
[기대] [여기에 기대한 동작을 적으세요]
[범위] 이 화면에서 이 한 가지만. 바꾼 내용을 먼저 알려 주고 배포하지 마.`;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h5 className="text-sm font-semibold text-foreground">{title}</h5>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="rounded-lg"
          onClick={() => {
            void navigator.clipboard.writeText(promptText);
            toast.success("수정 프롬프트를 복사했어요.");
          }}
        >
          <Copy className="h-3.5 w-3.5" />
          수정 프롬프트 복사
        </Button>
      </div>
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs">고친 것 · 무엇을</Label>
            <span className="text-[11px] text-muted-foreground">
              {fix.what.length} / {GROWTH_FIX_MAX.what}
            </span>
          </div>
          <Input
            value={fix.what}
            disabled={!canEdit}
            placeholder="예) 빈 카드를 저장할 수 있던 문제"
            onChange={(e) => onChange({ ...fix, what: e.target.value.slice(0, GROWTH_FIX_MAX.what) })}
            className="rounded-xl bg-background"
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs">어떻게 고쳤나(전 → 후)</Label>
            <span className="text-[11px] text-muted-foreground">
              {fix.how.length} / {GROWTH_FIX_MAX.how}
            </span>
          </div>
          <Textarea
            value={fix.how}
            disabled={!canEdit}
            placeholder="예) 전: 바로 저장 → 후: 빈 내용이면 저장하지 않고 안내 문구 표시"
            onChange={(e) => onChange({ ...fix, how: e.target.value.slice(0, GROWTH_FIX_MAX.how) })}
            className="min-h-16 rounded-xl bg-background"
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs">고치지 않기로 한 것과 이유</Label>
            <span className="text-[11px] text-muted-foreground">
              {fix.skipped.length} / {GROWTH_FIX_MAX.skipped}
            </span>
          </div>
          <Textarea
            value={fix.skipped}
            disabled={!canEdit}
            placeholder="예) 알림 소리는 학교 컴퓨터 환경 때문에 다음에 검토"
            onChange={(e) =>
              onChange({ ...fix, skipped: e.target.value.slice(0, GROWTH_FIX_MAX.skipped) })
            }
            className="min-h-16 rounded-xl bg-background"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">분류</Label>
          <div className="flex flex-wrap gap-2">
            {GROWTH_FIX_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                disabled={!canEdit}
                onClick={() => onChange({ ...fix, type: t.value })}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  fix.type === t.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">{GROWTH_FIX_KIND_LABELS[kind]}의 수정 기록입니다.</p>
    </div>
  );
}

/* ------------------------------ 1차 · 자기 점검 ---------------------------- */

function SelfPanel({
  data,
  canEdit,
  onReview,
}: {
  data: GrowthRecordData;
  canEdit: boolean;
  onReview: (next: GrowthReviewData) => void;
}) {
  const review = data.review ?? GROWTH_EMPTY_REVIEW;
  const [anglesOpen, setAnglesOpen] = useState(false);

  const quoted: Record<GrowthSelfCheckKey, string> = {
    oneLiner: data.oneLine,
    firstScreen: data.primaryUser ? `주 사용자: ${data.primaryUser}` : "",
    feature1: data.features[0] ?? "",
    feature2: data.features[1] ?? "",
    feature3: data.features[2] ?? "",
    flow: data.flow.filter(Boolean).join(" → "),
  };

  const setCheck = (key: GrowthSelfCheckKey, value: GrowthCheckValue) =>
    onReview({ ...review, self: { ...review.self, checks: { ...review.self.checks, [key]: value } } });

  const setAngle = (key: GrowthAngleKey, value: GrowthAngleValue) =>
    onReview({ ...review, self: { ...review.self, angles: { ...review.self.angles, [key]: value } } });

  const suggestion = growthStatusSuggestion(review);
  const hasIssue = Object.values(review.self.checks).includes("no") ||
    Object.values(review.self.angles).includes("issue");

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        01~03에 적은 내용이 이 앱의 PRD입니다. 기억이 아니라 기록과 실제 화면을 비교합니다.
      </p>

      <div className="space-y-3">
        {GROWTH_SELF_CHECK_ITEMS.map((item) => (
          <div key={item.key} className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-sm font-medium text-foreground">{item.text}</p>
            {quoted[item.key].trim() && (
              <p className="mt-1 text-xs text-muted-foreground">내 기록: {quoted[item.key]}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {GROWTH_CHECK_CHOICES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setCheck(item.key, c.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    review.self.checks[item.key] === c.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-primary/5 px-4 py-3 text-sm text-primary">
        완성 상태 제안: <strong>{suggestion}</strong>
        <span className="block text-xs text-primary/80">
          제안만 표시합니다. 03의 값은 직접 바꿔 주세요.
        </span>
      </div>

      <div className="rounded-xl border border-border">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
          onClick={() => setAnglesOpen((v) => !v)}
        >
          안 되는 길도 걸어 보기(선택)
          <ChevronDown className={cn("h-4 w-4 transition-transform", anglesOpen && "rotate-180")} />
        </button>
        {anglesOpen && (
          <div className="space-y-3 border-t border-border p-4">
            {GROWTH_ANGLE_ITEMS.map((a) => (
              <div key={a.key} className="rounded-xl bg-muted/30 p-3">
                <p className="text-sm font-medium text-foreground">
                  {a.name}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{a.desc}</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {GROWTH_ANGLE_CHOICES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setAngle(a.key, c.value)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        review.self.angles[a.key] === c.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {hasIssue && (
        <p className="text-xs text-muted-foreground">
          문제 있음으로 표시한 것 중 하나를 골라 고치고 아래에 남겨 주세요.
        </p>
      )}

      <FixBlock
        kind="self"
        fix={review.self.fix}
        title="수정 기록"
        canEdit={canEdit}
        onChange={(fix) => onReview({ ...review, self: { ...review.self, fix } })}
      />
    </div>
  );
}

/* ------------------------------- 2차 · AI 점검 ------------------------------ */

function AiPanel({
  data,
  canEdit,
  onReview,
}: {
  data: GrowthRecordData;
  canEdit: boolean;
  onReview: (next: GrowthReviewData) => void;
}) {
  const review = data.review ?? GROWTH_EMPTY_REVIEW;
  const allQuestions = useMemo(() => growthAiQuestions(data.problemArea), [data.problemArea]);

  const visible = allQuestions.slice(0, review.ai.revealed);
  const answered = review.ai.questions.filter((q) => q.a.trim() && !q.unanswered).length;
  const unanswered = review.ai.questions.filter((q) => q.unanswered).length;

  const revealNext = () => {
    const next = Math.min(allQuestions.length, review.ai.revealed + 1);
    const questions = [...review.ai.questions];
    const q = allQuestions[next - 1]!;
    if (!questions.some((x) => x.q === q)) questions.push({ q, a: "", unanswered: false });
    onReview({ ...review, ai: { ...review.ai, revealed: next, questions } });
  };

  const updateQ = (q: string, patch: Partial<{ a: string; unanswered: boolean }>) => {
    onReview({
      ...review,
      ai: {
        ...review.ai,
        questions: review.ai.questions.map((x) => (x.q === q ? { ...x, ...patch } : x)),
      },
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          AI가 내 기록을 읽고 질문합니다. 답하지 못한 질문이 곧 고칠 곳입니다.
        </p>
        <Button
          type="button"
          size="sm"
          disabled={!canEdit || review.ai.revealed >= allQuestions.length}
          className="rounded-xl active:scale-95"
          onClick={revealNext}
        >
          <Sparkles className="h-4 w-4" />
          질문 받기
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>
          답함 <strong className="text-foreground">{answered}</strong> / {allQuestions.length}
        </span>
        <span>
          답하지 못함 <strong className="text-foreground">{unanswered}</strong>
        </span>
        <span>문제 영역: {data.problemArea || "미선택"}</span>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          '질문 받기'를 눌러 AI 점검 질문을 한 개씩 받아 보세요.
        </p>
      ) : (
        <div className="space-y-4">
          {visible.map((q, i) => {
            const entry = review.ai.questions.find((x) => x.q === q);
            return (
              <div key={q} className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-2">
                  <Label className="text-sm font-medium leading-snug text-foreground">
                    {i + 1}. {q}
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 shrink-0 rounded-lg"
                    onClick={() => {
                      void navigator.clipboard.writeText(q);
                      toast.success("질문을 복사했어요.");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    복사
                  </Button>
                </div>
                <Textarea
                  value={entry?.a ?? ""}
                  disabled={!canEdit || entry?.unanswered}
                  placeholder="여기에 답변을 적어 주세요."
                  onChange={(e) => updateQ(q, { a: e.target.value.slice(0, 200) })}
                  className="min-h-20 rounded-xl bg-background"
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={entry?.unanswered ?? false}
                    onChange={(e) => updateQ(q, { unanswered: e.target.checked })}
                    className="h-3.5 w-3.5 rounded accent-primary"
                  />
                  지금은 답하지 못함
                </label>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-border p-4">
        <p className="mb-2 text-xs font-semibold text-foreground">오류가 나면 이 다섯 단계만</p>
        <ol className="flex flex-wrap gap-2">
          {GROWTH_ERROR_GUIDE.map((g, i) => (
            <li key={g.name} className="rounded-lg bg-muted/50 px-3 py-2 text-xs">
              <span className="font-semibold text-foreground">
                {i + 1}. {g.name}
              </span>
              {g.desc && <span className="ml-1 text-muted-foreground">{g.desc}</span>}
            </li>
          ))}
        </ol>
      </div>

      <FixBlock
        kind="ai"
        fix={review.ai.fix}
        title="답하지 못한 질문 중 하나를 골라 고칩니다."
        canEdit={canEdit}
        onChange={(fix) => onReview({ ...review, ai: { ...review.ai, fix } })}
      />
    </div>
  );
}

/* ------------------------------ 3차 · 동료 점검 ----------------------------- */

type PeerSummary = {
  postId: string;
  postNo: number;
  author: string;
  projectName: string;
  oneLine: string;
  resultUrl: string;
  features: string[];
  flow: string[];
};

function PeerPanel({
  data,
  canEdit,
  onReview,
  assignments,
  summaries,
  peersLoading,
  onAssign,
  assigning,
  received,
  feedbacksLoading,
  onSend,
  sendingTo,
  onClassify,
}: {
  data: GrowthRecordData;
  canEdit: boolean;
  onReview: (next: GrowthReviewData) => void;
  assignments: { postId: string; postNo: number; author: string }[];
  summaries: PeerSummary[];
  peersLoading: boolean;
  onAssign: () => void;
  assigning: boolean;
  received: GrowthReceivedFeedback[];
  feedbacksLoading: boolean;
  onSend: (toPostId: string, toName: string) => void;
  sendingTo: string | null;
  onClassify: (fb: GrowthReceivedFeedback, t: GrowthFixType) => void;
}) {
  const review = data.review ?? GROWTH_EMPTY_REVIEW;
  const [openRecord, setOpenRecord] = useState<string | null>(null);

  const setGiven = (toPostId: string, to: string, patch: Partial<{ expected: string; actual: string }>) => {
    const rest = review.peer.given.filter((g) => g.toPostId !== toPostId);
    const cur = review.peer.given.find((g) => g.toPostId === toPostId) ?? {
      toPostId,
      to,
      expected: "",
      actual: "",
      sent: false,
    };
    onReview({ ...review, peer: { ...review.peer, given: [...rest, { ...cur, to, ...patch }] } });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          짝은 무작위로 정해집니다. 마주 앉아 설명하지 않고, 링크만 열어 직접 써 봅니다.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canEdit || assigning || peersLoading}
          className="rounded-xl active:scale-95"
          onClick={onAssign}
        >
          {assigning || peersLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Users className="h-4 w-4" />
          )}
          짝 배정 받기
        </Button>
      </div>

      {assignments.length === 0 ? (
        <p className="rounded-xl bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          '짝 배정 받기'를 누르면 같은 게시판의 다른 기록 2개가 배정됩니다.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {assignments.map((p) => {
            const s = summaries.find((x) => x.postId === p.postId);
            const given = review.peer.given.find((g) => g.toPostId === p.postId);
            return (
              <div key={p.postId} className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{p.author}</p>
                  <p className="text-xs text-muted-foreground">
                    {s?.projectName || `#${p.postNo} 활동기록`}
                  </p>
                  {s?.oneLine && <p className="mt-1 text-xs text-muted-foreground">{s.oneLine}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {s?.resultUrl && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => window.open(s.resultUrl, "_blank", "noopener")}
                    >
                      배포 주소 열기
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="rounded-xl"
                    onClick={() => setOpenRecord(openRecord === p.postId ? null : p.postId)}
                  >
                    01~03 기록 보기
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 transition-transform", openRecord === p.postId && "rotate-180")}
                    />
                  </Button>
                </div>
                {openRecord === p.postId && s && (
                  <div className="space-y-2 rounded-lg bg-background p-3 text-xs text-muted-foreground">
                    <div>
                      <p className="font-semibold text-foreground">핵심 기능</p>
                      {s.features.filter(Boolean).length ? (
                        <ul className="list-disc pl-4">
                          {s.features.filter(Boolean).map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>미입력</p>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">사용 흐름</p>
                      {s.flow.filter(Boolean).length ? (
                        <ol className="list-decimal pl-4">
                          {s.flow.filter(Boolean).map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ol>
                      ) : (
                        <p>미입력</p>
                      )}
                    </div>
                  </div>
                )}

                {/* 01 내가 남기는 피드백 */}
                <div className="space-y-2 border-t border-border pt-3">
                  <p className="text-xs font-semibold text-foreground">01 내가 남기는 피드백</p>
                  <Textarea
                    value={given?.expected ?? ""}
                    disabled={!canEdit || given?.sent}
                    placeholder="기대한 것"
                    onChange={(e) => setGiven(p.postId, p.author, { expected: e.target.value.slice(0, 120) })}
                    className="min-h-14 rounded-xl bg-background text-sm"
                  />
                  <Textarea
                    value={given?.actual ?? ""}
                    disabled={!canEdit || given?.sent}
                    placeholder="실제로 나온 것"
                    onChange={(e) => setGiven(p.postId, p.author, { actual: e.target.value.slice(0, 120) })}
                    className="min-h-14 rounded-xl bg-background text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-xl"
                    disabled={!canEdit || sendingTo === p.postId || given?.sent}
                    onClick={() => onSend(p.postId, p.author)}
                  >
                    {sendingTo === p.postId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="h-3.5 w-3.5" />
                    )}
                    {given?.sent ? "전달됨" : "보내기"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 02 내가 받은 피드백 */}
      <div className="space-y-2">
        <h5 className="text-xs font-semibold text-muted-foreground">02 내가 받은 피드백</h5>
        {feedbacksLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            피드백을 불러오는 중...
          </div>
        ) : received.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 받은 피드백이 없어요.</p>
        ) : (
          <div className="space-y-2">
            {received.map((f) => (
              <div key={f.id} className="space-y-2 rounded-xl border border-border bg-muted/30 p-3 text-sm">
                <p className="font-medium text-foreground">{f.fromName}</p>
                <p className="text-xs text-muted-foreground">
                  기대: {f.expected || "—"} / 실제: {f.actual || "—"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {GROWTH_FIX_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => onClassify(f, t.value)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        f.receiverType === t.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          판단이 아니라 관찰을 건넵니다. 무엇을 고칠지는 만든 사람이 정합니다.
        </p>
      </div>

      <FixBlock
        kind="peer"
        fix={review.peer.fix}
        title="받은 피드백 중 하나를 골라 고칩니다."
        canEdit={canEdit}
        onChange={(fix) => onReview({ ...review, peer: { ...review.peer, fix } })}
      />
    </div>
  );
}

/* --------------------------------- 공용 입력 -------------------------------- */

function FieldGrid({
  fields,
  data,
  canEdit,
  onChange,
}: {
  fields: GrowthField[];
  data: GrowthRecordData;
  canEdit: boolean;
  onChange: (key: GrowthFieldKey, value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <FieldInput
          key={field.key}
          field={field}
          value={data[field.key] ?? ""}
          canEdit={canEdit}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

function FieldInput({
  field,
  value,
  canEdit,
  onChange,
}: {
  field: GrowthField;
  value: string;
  canEdit: boolean;
  onChange: (key: GrowthFieldKey, value: string) => void;
}) {
  const id = `growth-${field.key}`;
  return (
    <div className={cn("space-y-1.5", field.full && "sm:col-span-2")}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>
          {field.label}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </Label>
        <span className="text-[11px] text-muted-foreground">
          {value.length} / {field.max}
        </span>
      </div>
      {field.type === "select" ? (
        <Select
          value={value || undefined}
          disabled={!canEdit}
          onValueChange={(v) => onChange(field.key, v)}
        >
          <SelectTrigger id={id} className="rounded-xl">
            <SelectValue placeholder="선택해 주세요" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field.type === "textarea" ? (
        <Textarea
          id={id}
          value={value}
          disabled={!canEdit}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="min-h-24 rounded-xl"
        />
      ) : (
        <Input
          id={id}
          type={field.type === "url" ? "url" : "text"}
          value={value}
          disabled={!canEdit}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="rounded-xl"
        />
      )}
    </div>
  );
}

function Repeater({
  label,
  hint,
  placeholder,
  items,
  canEdit,
  numbered,
  onChange,
}: {
  label: string;
  hint: string;
  placeholder: string;
  items: string[];
  canEdit: boolean;
  numbered?: boolean;
  onChange: (next: string[]) => void;
}) {
  const rows = items.length > 0 ? items : [""];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      </div>
      <div className="space-y-2">
        {rows.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            {numbered && (
              <span className="w-5 shrink-0 text-xs text-muted-foreground">{i + 1}.</span>
            )}
            <Input
              value={item}
              disabled={!canEdit}
              placeholder={placeholder}
              onChange={(e) => {
                const next = [...rows];
                next[i] = e.target.value.slice(0, GROWTH_REPEATER_ITEM_MAX);
                onChange(next);
              }}
              className="rounded-xl"
            />
            {canEdit && rows.length > 1 && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="rounded-xl"
                aria-label={`${label} ${i + 1}번째 줄 삭제`}
                onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      {canEdit && rows.length < GROWTH_REPEATER_MAX && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-xl active:scale-95"
          onClick={() => onChange([...rows, ""])}
        >
          <Plus className="h-4 w-4" />
          줄 추가
        </Button>
      )}
    </div>
  );
}

function HeroImageInput({
  value,
  canEdit,
  onChange,
}: {
  value: string;
  canEdit: boolean;
  onChange: (value: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > GROWTH_HERO_MAX_BYTES) {
      toast.error("대표 이미지는 2MB 이하만 등록할 수 있어요.");
      return;
    }
    setUploading(true);
    try {
      onChange(await uploadCommentImage(file));
      toast.success("대표 이미지를 등록했어요.");
    } catch (err) {
      console.error("growth hero image upload failed", err);
      toast.error(err instanceof Error ? err.message : "이미지 업로드에 실패했어요.");
    } finally {
      setUploading(false);
    }
  };

  const rotate = async () => {
    if (!value) return;
    setUploading(true);
    try {
      const blob = await rotateImageBlob(value, 90);
      const rotated = new File([blob], "hero(회전).jpg", { type: "image/jpeg" });
      onChange(await uploadCommentImage(rotated));
      toast.success("이미지를 90도 회전했어요.");
    } catch (err) {
      console.error("growth hero image rotate failed", err);
      toast.error("회전에 실패했어요.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canEdit || uploading}
          onClick={() => fileRef.current?.click()}
          className="rounded-xl active:scale-95"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {value ? "이미지 교체" : "이미지 선택"}
        </Button>
        {value && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canEdit || uploading}
              onClick={() => void rotate()}
              className="rounded-xl active:scale-95"
            >
              <RotateCw className="h-4 w-4" />
              90도 회전
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!canEdit || uploading}
              onClick={() => onChange("")}
              className="rounded-xl active:scale-95"
            >
              <X className="h-4 w-4" />
              제거
            </Button>
          </>
        )}
      </div>
      {value && (
        <div className="overflow-hidden rounded-xl border border-border">
          <img src={value} alt="대표 이미지" className="max-h-96 w-full object-contain" />
        </div>
      )}
    </div>
  );
}
