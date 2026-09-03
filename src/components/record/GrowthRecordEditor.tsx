// 성장형(개인) 활동기록 편집기 — 6단계 위저드.
// 도전형 RecordEditor와 동일한 UI 패턴(단계 탭 · 1초 지연 자동 저장 · 관리자 잠금 해제)을 사용한다.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ImagePlus, Loader2, Plus, RotateCw, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { getGrowthRecord, saveGrowthRecord } from "@/lib/record-growth.functions";
import { isRecordAdmin } from "@/lib/record.functions";
import {
  GROWTH_EDUCATION_FIELD,
  GROWTH_EMPTY,
  GROWTH_ETHICS_PRINCIPLES,
  GROWTH_FIELD_MAX,
  GROWTH_GROWTH_FIELDS_A,
  GROWTH_GROWTH_FIELDS_B,
  GROWTH_PRIVACY_CHOICES,
  GROWTH_PROBLEM_FIELDS,
  GROWTH_PROJECT_FIELDS,
  GROWTH_REPEATER_ITEM_MAX,
  GROWTH_REPEATER_MAX,
  GROWTH_RESULT_FIELDS,
  GROWTH_STEP_META,
  growthCompletionPercent,
  growthStepProgress,
  type GrowthField,
  type GrowthFieldKey,
  type GrowthRecordData,
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

type Patch = Partial<Record<string, string | string[]>>;

export function GrowthRecordEditor({ postId }: { postId: string }) {
  const queryClient = useQueryClient();
  const fetchGrowth = useServerFn(getGrowthRecord);
  const saveGrowth = useServerFn(saveGrowthRecord);
  const checkAdmin = useServerFn(isRecordAdmin);
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
    (key: string, value: string | string[]) => {
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
        <ol className="grid grid-cols-3 gap-2 sm:flex sm:flex-nowrap sm:overflow-x-auto">
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
              <HeroImageInput value={data.heroImageUrl} canEdit={canEdit} onChange={onHero} />
            </div>
          </div>
        )}

        {step === 3 && (
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

        {step === 4 && <GrowthReadmeOutput data={data} />}
        {step === 5 && <GrowthCasebookOutput data={data} author={bundle.author} />}
      </section>
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
