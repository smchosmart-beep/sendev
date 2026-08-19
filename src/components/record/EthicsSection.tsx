import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStoredIdentity } from "@/hooks/useStoredIdentity";
import { getAdminPassword } from "@/lib/admin-session";
import {
  ETHICS_EXTRA_MAX,
  ETHICS_EXTRA_QUESTION,
  ETHICS_PRINCIPLES,
  ethicsAverage,
  type EthicsScoreKey,
} from "@/lib/record-ethics";
import {
  deleteRecordEthics,
  saveRecordEthics,
  type RecordEthicsDTO,
  type RecordMemberDTO,
} from "@/lib/record.functions";

type Scores = Record<EthicsScoreKey, number>;

const EMPTY: Scores = { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0, s6: 0, s7: 0 };

// 0.5점 단위 별점 입력 — 별의 왼쪽 절반을 누르면 0.5, 오른쪽 절반은 1점.
function StarRating({
  value,
  disabled,
  onChange,
  label,
}: {
  value: number;
  disabled?: boolean;
  onChange: (next: number) => void;
  label: string;
}) {
  return (
    <div
      className="flex items-center gap-1"
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={value}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault();
          onChange(Math.min(5, value + 0.5));
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault();
          onChange(Math.max(0, value - 0.5));
        }
      }}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <span key={i} className="relative h-7 w-7">
            <Star className="absolute inset-0 h-7 w-7 text-muted-foreground/40" />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
              aria-hidden
            >
              <Star className="h-7 w-7 fill-primary text-primary" />
            </span>
            {!disabled && (
              <>
                <button
                  type="button"
                  aria-label={`${label} ${i - 0.5}점`}
                  className="absolute inset-y-0 left-0 w-1/2"
                  onClick={() => onChange(i - 0.5)}
                />
                <button
                  type="button"
                  aria-label={`${label} ${i}점`}
                  className="absolute inset-y-0 right-0 w-1/2"
                  onClick={() => onChange(i)}
                />
              </>
            )}
          </span>
        );
      })}
    </div>
  );
}

export function EthicsSection({
  postId,
  ethics,
  members,
  myKey,
  isMember,
  isAdmin,
}: {
  postId: string;
  ethics: RecordEthicsDTO[];
  members: RecordMemberDTO[];
  myKey: string;
  isMember: boolean;
  isAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const saveFn = useServerFn(saveRecordEthics);
  const deleteFn = useServerFn(deleteRecordEthics);
  const { identity } = useStoredIdentity();

  const mine = ethics.find((e) => e.usernameKey === myKey) ?? null;
  const others = ethics.filter((e) => e.usernameKey !== myKey);

  const [scores, setScores] = useState<Scores>(EMPTY);
  const [extraPromise, setExtraPromise] = useState("");

  useEffect(() => {
    setScores(
      mine
        ? { s1: mine.s1, s2: mine.s2, s3: mine.s3, s4: mine.s4, s5: mine.s5, s6: mine.s6, s7: mine.s7 }
        : EMPTY,
    );
    setExtraPromise(mine?.extraPromise ?? "");
  }, [mine?.id, mine?.updatedAt]);

  const average = useMemo(() => ethicsAverage(scores), [scores]);

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          postId,
          ...scores,
          extraPromise,
          knownUpdatedAt: mine?.updatedAt ?? "",
          author: identity?.author ?? "",
          nicknamePassword: identity?.nicknamePassword ?? "",
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["record", postId] });
      toast.success("윤리 설문을 저장했어요.");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "저장하지 못했어요."),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      deleteFn({
        data: {
          postId,
          id,
          author: identity?.author ?? "",
          nicknamePassword: identity?.nicknamePassword ?? "",
          adminPassword: getAdminPassword(),
        },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["record", postId] }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "삭제하지 못했어요."),
  });

  const notWritten = members.filter((m) => !ethics.some((e) => e.usernameKey === m.usernameKey));

  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">교사 개발자 윤리 자가점검</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        팀원 각자 하나씩 답해요. 내 응답은 나만 고칠 수 있어요. 별은 0.5점 단위로 매길 수 있어요.
      </p>

      {isMember ? (
        <div className="mt-4 space-y-4 rounded-xl bg-muted/40 p-3">
          {ETHICS_PRINCIPLES.map((p, idx) => (
            <div
              key={p.key}
              className="flex flex-col gap-2 rounded-xl bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {idx + 1}. {p.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{p.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <StarRating
                  label={p.title}
                  value={scores[p.key]}
                  onChange={(next) => setScores((prev) => ({ ...prev, [p.key]: next }))}
                />
                <span className="w-14 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                  {scores[p.key].toFixed(1)} / 5.0
                </span>
              </div>
            </div>
          ))}

          <div className="space-y-1.5 rounded-xl bg-background p-3">
            <Label htmlFor="ethics-extra">{ETHICS_EXTRA_QUESTION}</Label>
            <Textarea
              id="ethics-extra"
              value={extraPromise}
              maxLength={ETHICS_EXTRA_MAX}
              rows={3}
              placeholder="예) 학생에게 도구의 한계를 먼저 알려 주고 사용하기"
              onChange={(e) => setExtraPromise(e.target.value.slice(0, ETHICS_EXTRA_MAX))}
              className="rounded-xl"
            />
            <p className="text-right text-xs text-muted-foreground">
              {extraPromise.length} / {ETHICS_EXTRA_MAX}자
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              내 평균 점수 <span className="font-semibold text-foreground">{average.toFixed(1)}</span> / 5.0
            </p>
            <Button
              type="button"
              className="rounded-xl active:scale-95"
              disabled={save.isPending}
              onClick={() => save.mutate()}
            >
              {mine ? "설문 수정 저장" : "설문 저장"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
          이 활동기록의 팀원만 설문에 답할 수 있어요.
        </p>
      )}

      {others.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">팀원 응답</h3>
          {others.map((e) => (
            <div key={e.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {e.username}{" "}
                  <span className="font-normal text-muted-foreground">
                    평균 {ethicsAverage(e).toFixed(1)} / 5.0
                  </span>
                </p>
                {isAdmin && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => remove.mutate(e.id)}
                    aria-label="응답 삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {ETHICS_PRINCIPLES.map((p) => (
                  <span key={p.key}>
                    {p.title} {Number(e[p.key]).toFixed(1)}
                  </span>
                ))}
              </div>
              {e.extraPromise && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{e.extraPromise}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {notWritten.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          아직 응답하지 않은 팀원: {notWritten.map((m) => m.username).join(", ")}
        </p>
      )}
    </section>
  );
}
