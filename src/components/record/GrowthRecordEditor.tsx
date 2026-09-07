// 성장형(개인) 활동기록 편집기 — 7단계 위저드.
// 도전형 RecordEditor와 동일한 UI 패턴(단계 탭 · 1초 지연 자동 저장 · 관리자 잠금 해제)을 사용한다.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  ImagePlus,
  Loader2,
  Plus,
  RotateCw,
  ShieldCheck,
  Trash2,
  X,
  Copy,
  Users,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import {
  getGrowthRecord,
  saveGrowthRecord,
  getGrowthPeerAssignments,
  listGrowthPeerFeedbacks,
  sendGrowthPeerFeedback,
} from "@/lib/record-growth.functions";
import { isRecordAdmin } from "@/lib/record.functions";
import {
  GROWTH_AI_CHECK_QUESTIONS,
  GROWTH_EDUCATION_FIELD,
  GROWTH_EMPTY,
  GROWTH_EMPTY_REVIEW,
  GROWTH_ETHICS_PRINCIPLES,
  GROWTH_FIELD_MAX,
  GROWTH_GROWTH_FIELDS_A,
  GROWTH_GROWTH_FIELDS_B,
  GROWTH_HERO_MAX_BYTES,
  GROWTH_PRIVACY_CHOICES,
  GROWTH_PROBLEM_FIELDS,
  GROWTH_PROJECT_FIELDS,
  GROWTH_REPEATER_ITEM_MAX,
  GROWTH_REPEATER_MAX,
  GROWTH_RESULT_FIELDS,
  GROWTH_SELF_CHECK_QUESTIONS,
  GROWTH_STEP_META,
  growthCompletionPercent,
  growthStepProgress,
  type GrowthField,
  type GrowthFieldKey,
  type GrowthRecordData,
  type GrowthReviewData,
  type GrowthSharedFix,
} from "@/lib/record-growth-schema";
import { GrowthReadmeOutput } from "@/components/record/GrowthReadmeOutput";
import { GrowthCasebookOutput } from "@/components/record/GrowthCasebookDocument";
import { rotateImageBlob, uploadCommentImage } from "@/lib/image-upload";
import { getAdminPassword, setAdminPassword } from "@/lib/admin-auth";
import { useStoredIdentity } from "@/hooks/useNicknameIdentity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const fetchPeers = useServerFn(getGrowthPeerAssignments);
  const fetchFeedbacks = useServerFn(listGrowthPeerFeedbacks);
  const sendFeedback = useServerFn(sendGrowthPeerFeedback);
  const { identity } = useStoredIdentity();

  const [step, setStep] = useState(0);
  const [data, setData] = useState<GrowthRecordData | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

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
    setData({ ...GROWTH_EMPTY, ...bundle.data });
  }, [bundle]);

  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    setStatus("saving");
    try {
      const res = await saveGrowth({
        data: { postId, knownUpdatedAt: knownUpdatedAt.current, patch, ...auth },
      });
      knownUpdatedAt.current = res.updatedAt;
      setStatus("saved");
    } catch (err) {
      setStatus("idle");
      toast.error(err instanceof Error ? err.message : "저장 중 문제가 발생했어요.");
      queryClient.invalidateQueries({ queryKey: ["record-growth", postId] });
    }
  }, [auth, postId, queryClient, saveGrowth]);

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

  // 동료 점검 데이터
  const {
    data: peerData,
    isLoading: peersLoading,
    refetch: refetchPeers,
  } = useQuery({
    queryKey: ["growth-peers", postId],
    queryFn: () => fetchPeers({ data: { postId, ...auth } }),
    enabled: canEdit && step === 3,
  });

  const {
    data: feedbackData,
    isLoading: feedbacksLoading,
    refetch: refetchFeedbacks,
  } = useQuery({
    queryKey: ["growth-feedbacks", postId],
    queryFn: () => fetchFeedbacks({ data: { postId, ...auth } }),
    enabled: canEdit && step === 3,
  });

  const [assigning, setAssigning] = useState(false);
  const assignPeers = async () => {
    setAssigning(true);
    try {
      await fetchPeers({ data: { postId, ...auth } });
      await refetchPeers();
      toast.success("새 점검 짝 2명을 배정했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "배정에 실패했어요.");
    } finally {
      setAssigning(false);
    }
  };

  const [feedbackTarget, setFeedbackTarget] = useState<string | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    toName: "",
    receiverType: "expected" as "expected" | "actual",
    expected: "",
    actual: "",
  });
  const [sendingFeedback, setSendingFeedback] = useState(false);

  const submitFeedback = async () => {
    if (!feedbackTarget) return;
    setSendingFeedback(true);
    try {
      await sendFeedback({
        data: {
          fromPostId: postId,
          toPostId: feedbackTarget,
          ...feedbackForm,
          ...auth,
        },
      });
      toast.success("동료 피드백을 보냈어요.");
      setFeedbackTarget(null);
      setFeedbackForm({ toName: "", receiverType: "expected", expected: "", actual: "" });
      await refetchFeedbacks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "피드백 전송에 실패했어요.");
    } finally {
      setSendingFeedback(false);
    }
  };

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
                      {p.done} / {p.total} 작성
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
            canEdit={canEdit}
            onReview={onReview}
            peerAssignments={peerData?.assignments ?? []}
            peersLoading={peersLoading}
            onAssign={assignPeers}
            assigning={assigning}
            received={feedbackData?.received ?? []}
            sent={feedbackData?.sent ?? []}
            feedbacksLoading={feedbacksLoading}
            feedbackTarget={feedbackTarget}
            setFeedbackTarget={setFeedbackTarget}
            feedbackForm={feedbackForm}
            setFeedbackForm={setFeedbackForm}
            onSubmitFeedback={submitFeedback}
            sendingFeedback={sendingFeedback}
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
              fields={GROWTH_GROWTH_FIELDS_B}
              data={data}
              canEdit={canEdit}
              onChange={onField}
            />
          </div>
        )}

        {step === 5 && <GrowthReadmeOutput data={data} />}
        {step === 6 && <GrowthCasebookOutput data={data} author={bundle.author} />}
      </section>
    </div>
  );
}

function ReviewStep({
  data,
  canEdit,
  onReview,
  peerAssignments,
  peersLoading,
  onAssign,
  assigning,
  received,
  sent,
  feedbacksLoading,
  feedbackTarget,
  setFeedbackTarget,
  feedbackForm,
  setFeedbackForm,
  onSubmitFeedback,
  sendingFeedback,
}: {
  data: GrowthRecordData;
  canEdit: boolean;
  onReview: (next: GrowthReviewData) => void;
  peerAssignments: GrowthReviewData["peerAssignments"];
  peersLoading: boolean;
  onAssign: () => void;
  assigning: boolean;
  received: GrowthReviewData["receivedFeedbacks"];
  sent: GrowthReviewData["sentFeedbacks"];
  feedbacksLoading: boolean;
  feedbackTarget: string | null;
  setFeedbackTarget: (v: string | null) => void;
  feedbackForm: {
    toName: string;
    receiverType: "expected" | "actual";
    expected: string;
    actual: string;
  };
  setFeedbackForm: (v: {
    toName: string;
    receiverType: "expected" | "actual";
    expected: string;
    actual: string;
  }) => void;
  onSubmitFeedback: () => void;
  sendingFeedback: boolean;
}) {
  const review = data.review ?? GROWTH_EMPTY_REVIEW;

  const updateSelf = (i: number, answer: string) => {
    const next = {
      ...review,
      selfChecks: review.selfChecks.map((q, idx) => (idx === i ? { ...q, answer } : q)),
    };
    onReview(next);
  };

  const updateAi = (i: number, answer: string) => {
    const next = {
      ...review,
      aiChecks: review.aiChecks.map((q, idx) => (idx === i ? { ...q, answer } : q)),
    };
    onReview(next);
  };

  const [fix, setFix] = useState<GrowthSharedFix>({
    kind: "",
    target: "",
    method: "",
    category: "",
    createdAt: "",
  });

  const addFix = () => {
    if (!fix.kind.trim() || !fix.target.trim() || !fix.method.trim() || !fix.category.trim()) {
      toast.error("점검 종류, 고친 것, 고친 방법, 분류를 모두 입력해 주세요.");
      return;
    }
    const next = {
      ...review,
      sharedFixes: [
        ...review.sharedFixes,
        { ...fix, createdAt: new Date().toISOString() },
      ],
    };
    onReview(next);
    setFix({ kind: "", target: "", method: "", category: "", createdAt: "" });
  };

  const removeFix = (i: number) => {
    const next = {
      ...review,
      sharedFixes: review.sharedFixes.filter((_, idx) => idx !== i),
    };
    onReview(next);
  };

  return (
    <div className="space-y-8">
      {/* 자기 점검 */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-foreground">1차 자기 점검</h4>
        <div className="space-y-4">
          {review.selfChecks.map((q, i) => (
            <div key={i} className="space-y-2">
              <Label className="text-sm font-medium leading-snug text-foreground">
                {i + 1}. {q.question}
              </Label>
              <Textarea
                value={q.answer}
                disabled={!canEdit}
                placeholder="여기에 답변을 적어 주세요."
                onChange={(e) => updateSelf(i, e.target.value)}
                className="min-h-20 rounded-xl"
              />
            </div>
          ))}
        </div>
      </div>

      {/* AI 점검 */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-foreground">AI 점검</h4>
        <p className="text-xs text-muted-foreground">
          아래 질문을 복사해 AI에게 물어보고, 받은 답변을 정리해 적어 주세요.
        </p>
        <div className="space-y-4">
          {review.aiChecks.map((q, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-2">
                <Label className="text-sm font-medium leading-snug text-foreground">
                  {i + 1}. {q.question}
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 shrink-0 rounded-lg"
                  onClick={() => {
                    navigator.clipboard.writeText(q.question);
                    toast.success("질문을 복사했어요.");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  복사
                </Button>
              </div>
              <Textarea
                value={q.answer}
                disabled={!canEdit}
                placeholder="AI의 답변 또는 적용한 내용을 적어 주세요."
                onChange={(e) => updateAi(i, e.target.value)}
                className="min-h-20 rounded-xl bg-background"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 동료 점검 */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-foreground">동료 점검</h4>
        <p className="text-xs text-muted-foreground">
          같은 게시판의 다른 기록에서 2명이 자동 배정됩니다. 동료의 결과물을 보고 기대했던 점과
          실제 본 점을 남겨 주세요.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canEdit || assigning || peersLoading}
          onClick={onAssign}
          className="rounded-xl active:scale-95"
        >
          {assigning || peersLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Users className="h-4 w-4" />
          )}
          새 점검 짝 2명 배정
        </Button>

        {peerAssignments.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {peerAssignments.map((p) => (
              <div
                key={p.postId}
                className="rounded-xl border border-border bg-muted/30 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{p.author}</p>
                    <p className="text-xs text-muted-foreground">#{p.postNo} 활동기록</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canEdit}
                    onClick={() => {
                      setFeedbackTarget(p.postId);
                      setFeedbackForm({ ...feedbackForm, toName: p.author });
                    }}
                    className="rounded-xl"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    피드백 쓰기
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {feedbackTarget && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                {feedbackForm.toName}에게 피드백 보내기
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setFeedbackTarget(null)}
                className="rounded-xl"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">분류</Label>
                <Select
                  value={feedbackForm.receiverType}
                  onValueChange={(v) =>
                    setFeedbackForm({ ...feedbackForm, receiverType: v as "expected" | "actual" })
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expected">기대했던 점</SelectItem>
                    <SelectItem value="actual">실제 본 점</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">기대했던 점</Label>
                <Textarea
                  value={feedbackForm.expected}
                  onChange={(e) =>
                    setFeedbackForm({ ...feedbackForm, expected: e.target.value.slice(0, 400) })
                  }
                  placeholder="이 기능을 사용할 때 기대했던 점을 적어 주세요."
                  className="min-h-16 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">실제 본 점</Label>
                <Textarea
                  value={feedbackForm.actual}
                  onChange={(e) =>
                    setFeedbackForm({ ...feedbackForm, actual: e.target.value.slice(0, 400) })
                  }
                  placeholder="실제로 사용해 본 느낌을 적어 주세요."
                  className="min-h-16 rounded-xl"
                />
              </div>
              <Button
                type="button"
                size="sm"
                className="rounded-xl"
                disabled={sendingFeedback || !feedbackForm.expected.trim() || !feedbackForm.actual.trim()}
                onClick={() => void onSubmitFeedback()}
              >
                {sendingFeedback ? <Loader2 className="h-4 w-4 animate-spin" /> : "보내기"}
              </Button>
            </div>
          </div>
        )}

        {feedbacksLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            피드백을 불러오는 중...
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-muted-foreground">받은 피드백</h5>
              {received.length === 0 ? (
                <p className="text-sm text-muted-foreground">아직 받은 피드백이 없어요.</p>
              ) : (
                <div className="space-y-2">
                  {received.map((f) => (
                    <div key={f.id} className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
                      <p className="font-medium text-foreground">{f.fromName}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.receiverType === "expected" ? "기대" : "실제"}
                      </p>
                      <p className="mt-1 text-foreground">{f.expected || f.actual}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-muted-foreground">보낸 피드백</h5>
              {sent.length === 0 ? (
                <p className="text-sm text-muted-foreground">아직 보낸 피드백이 없어요.</p>
              ) : (
                <div className="space-y-2">
                  {sent.map((f) => (
                    <div key={f.id} className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
                      <p className="font-medium text-foreground">{f.toName}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.receiverType === "expected" ? "기대" : "실제"}
                      </p>
                      <p className="mt-1 text-foreground">{f.expected || f.actual}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 공통 수정 기록 */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-foreground">공통 수정 기록</h4>
        <p className="text-xs text-muted-foreground">
          점검 뒤 실제로 바꾼 내용을 남겨요. 고치지 않기로 한 것과 이유도 적을 수 있어요.
        </p>
        {canEdit && (
          <div className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
            <Input
              value={fix.kind}
              onChange={(e) => setFix({ ...fix, kind: e.target.value })}
              placeholder="점검 종류"
              className="rounded-xl"
            />
            <Input
              value={fix.category}
              onChange={(e) => setFix({ ...fix, category: e.target.value })}
              placeholder="분류"
              className="rounded-xl"
            />
            <Input
              value={fix.target}
              onChange={(e) => setFix({ ...fix, target: e.target.value })}
              placeholder="고친 것"
              className="rounded-xl sm:col-span-2"
            />
            <Textarea
              value={fix.method}
              onChange={(e) => setFix({ ...fix, method: e.target.value })}
              placeholder="고친 방법"
              className="min-h-16 rounded-xl sm:col-span-2"
            />
            <Button type="button" size="sm" className="rounded-xl sm:col-span-2" onClick={addFix}>
              <Plus className="h-4 w-4" />
              수정 기록 추가
            </Button>
          </div>
        )}
        <div className="space-y-2">
          {review.sharedFixes.map((f, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3"
            >
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  [{f.kind}] {f.target}
                </p>
                <p className="text-muted-foreground">{f.method}</p>
                <p className="text-xs text-muted-foreground">분류: {f.category}</p>
              </div>
              {canEdit && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="rounded-xl"
                  onClick={() => removeFix(i)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
