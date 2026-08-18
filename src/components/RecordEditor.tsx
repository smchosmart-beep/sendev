import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import {
  addRecordMember,
  deleteRecordRow,
  getRecord,
  removeRecordMember,
  saveRecordFinal,
  saveRecordRow,
  type RecordBundleDTO,
  type RecordRowDTO,
} from "@/lib/record.functions";
import { getAdminPassword } from "@/lib/admin-auth";
import { useStoredIdentity } from "@/hooks/useNicknameIdentity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type RowKind = RecordRowDTO["kind"];

const ROW_SECTIONS: {
  kind: RowKind;
  title: string;
  hint: string;
  cols: string[];
}[] = [
  {
    kind: "feature",
    title: "핵심 기능",
    hint: "이 서비스가 실제로 해 주는 일을 한 줄씩 적어요.",
    cols: ["기능 이름", "설명", "비고"],
  },
  {
    kind: "flow",
    title: "사용 흐름",
    hint: "사용자가 거치는 단계를 순서대로 적어요.",
    cols: ["단계", "화면/동작", "결과"],
  },
  {
    kind: "limit",
    title: "지금의 한계",
    hint: "아직 못 한 것, 아쉬운 점을 솔직하게 적어요.",
    cols: ["한계", "이유", ""],
  },
  {
    kind: "plan",
    title: "다음 계획",
    hint: "이어서 하고 싶은 일을 적어요.",
    cols: ["계획", "언제/어떻게", ""],
  },
  {
    kind: "maker",
    title: "제작자",
    hint: "누가 무엇을 맡았는지 적어요.",
    cols: ["이름", "맡은 일", ""],
  },
];

const FINAL_FIELDS: {
  key: keyof RecordBundleDTO["final"] & string;
  label: string;
  placeholder: string;
  multiline?: boolean;
}[] = [
  { key: "serviceName", label: "서비스 이름", placeholder: "예: 배수판별 연습기" },
  { key: "oneLiner", label: "한 줄 소개", placeholder: "무엇을 도와주는 서비스인지 한 문장" },
  { key: "targetUser", label: "누구를 위한 것인가요?", placeholder: "예: 초등 4학년 학생" },
  { key: "problem", label: "어떤 문제를 풀었나요?", placeholder: "관찰한 문제 상황", multiline: true },
  { key: "solution", label: "어떻게 풀었나요?", placeholder: "해결 방법", multiline: true },
  { key: "heroImageUrl", label: "대표 이미지 주소", placeholder: "https://..." },
  { key: "deployUrl", label: "배포 주소", placeholder: "https://..." },
  { key: "githubUrl", label: "GitHub 주소", placeholder: "https://..." },
  { key: "techStack", label: "사용한 도구", placeholder: "예: Lovable, Supabase" },
  {
    key: "envNames",
    label: "환경변수 이름만",
    placeholder: "예: API_KEY (값은 절대 적지 마세요)",
  },
] as never;

type FinalKey =
  | "serviceName"
  | "oneLiner"
  | "targetUser"
  | "problem"
  | "solution"
  | "heroImageUrl"
  | "deployUrl"
  | "githubUrl"
  | "techStack"
  | "envNames";

export function RecordEditor({ postId }: { postId: string }) {
  const queryClient = useQueryClient();
  const fetchRecord = useServerFn(getRecord);
  const saveFinalFn = useServerFn(saveRecordFinal);
  const saveRowFn = useServerFn(saveRecordRow);
  const deleteRowFn = useServerFn(deleteRecordRow);
  const addMemberFn = useServerFn(addRecordMember);
  const removeMemberFn = useServerFn(removeRecordMember);
  const { identity } = useStoredIdentity();

  const { data: bundle, isLoading } = useQuery({
    queryKey: ["record", postId],
    queryFn: () => fetchRecord({ data: { postId } }),
  });

  const auth = useMemo(
    () => ({
      author: identity?.author ?? "",
      nicknamePassword: identity?.nicknamePassword ?? "",
      adminPassword: getAdminPassword(),
    }),
    [identity?.author, identity?.nicknamePassword],
  );

  const isMember = useMemo(() => {
    if (!bundle) return false;
    const key = (identity?.author ?? "").trim().toLowerCase();
    if (!key) return false;
    return bundle.members.some((m) => m.usernameKey === key);
  }, [bundle, identity?.author]);

  const canEdit = isMember || !!auth.adminPassword;

  const [final, setFinal] = useState<Record<FinalKey, string> | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const knownUpdatedAt = useRef("");
  const pending = useRef<Partial<Record<FinalKey, string>>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!bundle) return;
    const f = bundle.final;
    knownUpdatedAt.current = f?.updatedAt ?? "";
    setFinal({
      serviceName: f?.serviceName ?? "",
      oneLiner: f?.oneLiner ?? "",
      targetUser: f?.targetUser ?? "",
      problem: f?.problem ?? "",
      solution: f?.solution ?? "",
      heroImageUrl: f?.heroImageUrl ?? "",
      deployUrl: f?.deployUrl ?? "",
      githubUrl: f?.githubUrl ?? "",
      techStack: f?.techStack ?? "",
      envNames: f?.envNames ?? "",
    });
  }, [bundle]);

  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    setStatus("saving");
    try {
      const res = await saveFinalFn({
        data: { postId, knownUpdatedAt: knownUpdatedAt.current, patch, ...auth },
      });
      knownUpdatedAt.current = res.updatedAt;
      setStatus("saved");
    } catch (err) {
      setStatus("idle");
      toast.error(err instanceof Error ? err.message : "저장 중 문제가 발생했어요.");
      queryClient.invalidateQueries({ queryKey: ["record", postId] });
    }
  }, [auth, postId, queryClient, saveFinalFn]);

  const onFinalChange = (key: FinalKey, value: string) => {
    setFinal((prev) => (prev ? { ...prev, [key]: value } : prev));
    pending.current[key] = value;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 1000);
  };

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const rowMutation = useMutation({
    mutationFn: (vars: {
      id: string | null;
      kind: RowKind;
      sortOrder: number;
      col1: string;
      col2: string;
      col3: string;
      knownUpdatedAt: string;
    }) => saveRowFn({ data: { postId, ...vars, ...auth } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["record", postId] }),
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "저장하지 못했어요."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRowFn({ data: { postId, id, ...auth } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["record", postId] }),
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "삭제하지 못했어요."),
  });

  const [newMember, setNewMember] = useState("");
  const addMember = useMutation({
    mutationFn: () => addMemberFn({ data: { postId, member: newMember.trim(), ...auth } }),
    onSuccess: () => {
      setNewMember("");
      queryClient.invalidateQueries({ queryKey: ["record", postId] });
      toast.success("팀원을 추가했어요.");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "추가하지 못했어요."),
  });
  const removeMember = useMutation({
    mutationFn: (memberId: string) =>
      removeMemberFn({ data: { postId, memberId, ...auth } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["record", postId] }),
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "삭제하지 못했어요."),
  });

  if (isLoading || !bundle || !final) {
    return (
      <div className="rounded-2xl bg-card p-6 text-sm text-muted-foreground shadow-sm">
        활동기록을 불러오는 중이에요...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">팀원</h2>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {bundle.members.map((m) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-sm text-foreground"
            >
              {m.username}
              {canEdit && (
                <button
                  type="button"
                  aria-label={`${m.username} 팀원 삭제`}
                  onClick={() => removeMember.mutate(m.id)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          ))}
        </div>
        {canEdit && (
          <div className="mt-3 flex gap-2">
            <Input
              value={newMember}
              onChange={(e) => setNewMember(e.target.value)}
              placeholder="추가할 팀원 닉네임"
              className="rounded-xl"
            />
            <Button
              type="button"
              onClick={() => newMember.trim() && addMember.mutate()}
              disabled={addMember.isPending}
              className="shrink-0 rounded-xl active:scale-95"
            >
              추가
            </Button>
          </div>
        )}
        {!canEdit && (
          <p className="mt-3 text-xs text-muted-foreground">
            팀원 닉네임으로 내 정보를 저장하면 이 기록을 함께 편집할 수 있어요.
          </p>
        )}
      </section>

      <section className="rounded-2xl bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">최종 결과물</h2>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {status === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {status === "saving"
              ? "저장 중..."
              : status === "saved"
                ? "저장됨"
                : bundle.final?.updatedBy
                  ? `마지막 저장: ${bundle.final.updatedBy}`
                  : ""}
          </span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {FINAL_FIELDS.map((f) => (
            <div
              key={f.key}
              className={`space-y-2 ${f.multiline ? "sm:col-span-2" : ""}`}
            >
              <Label htmlFor={`rec-${f.key}`}>{f.label}</Label>
              {f.multiline ? (
                <Textarea
                  id={`rec-${f.key}`}
                  value={final[f.key as FinalKey]}
                  onChange={(e) => onFinalChange(f.key as FinalKey, e.target.value)}
                  placeholder={f.placeholder}
                  rows={4}
                  disabled={!canEdit}
                  className="rounded-xl"
                />
              ) : (
                <Input
                  id={`rec-${f.key}`}
                  value={final[f.key as FinalKey]}
                  onChange={(e) => onFinalChange(f.key as FinalKey, e.target.value)}
                  placeholder={f.placeholder}
                  disabled={!canEdit}
                  className="rounded-xl"
                />
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          환경변수는 이름만 적고 값(비밀키)은 절대 입력하지 마세요.
        </p>
      </section>

      {ROW_SECTIONS.map((section) => (
        <RowSection
          key={section.kind}
          section={section}
          rows={bundle.rows.filter((r) => r.kind === section.kind)}
          canEdit={canEdit}
          onSave={(vars) => rowMutation.mutate(vars)}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      ))}
    </div>
  );
}

function RowSection({
  section,
  rows,
  canEdit,
  onSave,
  onDelete,
}: {
  section: (typeof ROW_SECTIONS)[number];
  rows: RecordRowDTO[];
  canEdit: boolean;
  onSave: (vars: {
    id: string | null;
    kind: RowKind;
    sortOrder: number;
    col1: string;
    col2: string;
    col3: string;
    knownUpdatedAt: string;
  }) => void;
  onDelete: (id: string) => void;
}) {
  const cols = section.cols.filter(Boolean);
  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{section.hint}</p>
      <div className="mt-4 space-y-3">
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">아직 등록된 내용이 없어요.</p>
        )}
        {rows.map((row) => (
          <RowItem
            key={row.id}
            row={row}
            cols={cols}
            canEdit={canEdit}
            onSave={onSave}
            onDelete={onDelete}
          />
        ))}
        {canEdit && (
          <Button
            type="button"
            variant="secondary"
            className="rounded-xl active:scale-95"
            onClick={() =>
              onSave({
                id: null,
                kind: section.kind,
                sortOrder: rows.length,
                col1: "",
                col2: "",
                col3: "",
                knownUpdatedAt: "",
              })
            }
          >
            <Plus className="h-4 w-4" />줄 추가
          </Button>
        )}
      </div>
    </section>
  );
}

function RowItem({
  row,
  cols,
  canEdit,
  onSave,
  onDelete,
}: {
  row: RecordRowDTO;
  cols: string[];
  canEdit: boolean;
  onSave: (vars: {
    id: string | null;
    kind: RowKind;
    sortOrder: number;
    col1: string;
    col2: string;
    col3: string;
    knownUpdatedAt: string;
  }) => void;
  onDelete: (id: string) => void;
}) {
  const [values, setValues] = useState([row.col1, row.col2, row.col3]);
  useEffect(() => {
    setValues([row.col1, row.col2, row.col3]);
  }, [row.col1, row.col2, row.col3]);

  const dirty =
    values[0] !== row.col1 || values[1] !== row.col2 || values[2] !== row.col3;

  return (
    <div className="grid gap-2 rounded-xl bg-muted/40 p-3 sm:grid-cols-[1fr_auto]">
      <div className="grid gap-2 sm:grid-cols-3">
        {cols.map((label, i) => (
          <Input
            key={label}
            value={values[i] ?? ""}
            onChange={(e) =>
              setValues((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
            }
            placeholder={label}
            disabled={!canEdit}
            className="rounded-xl bg-background"
          />
        ))}
      </div>
      {canEdit && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!dirty}
            className="rounded-xl active:scale-95"
            onClick={() =>
              onSave({
                id: row.id,
                kind: row.kind,
                sortOrder: row.sortOrder,
                col1: values[0] ?? "",
                col2: values[1] ?? "",
                col3: values[2] ?? "",
                knownUpdatedAt: row.updatedAt,
              })
            }
          >
            저장
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label="줄 삭제"
            className="rounded-xl text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(row.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
