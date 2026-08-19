import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import {
  addRecordMember,
  deleteRecordReflection,
  deleteRecordRow,
  getRecord,
  removeRecordMember,
  saveRecordFinal,
  saveRecordReflection,
  saveRecordRow,
  type RecordReflectionDTO,
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
  long?: boolean;
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
  {
    kind: "process",
    title: "문제 정의 과정 기록",
    hint: "아이디어를 좁혀 간 과정을 단계별로 남겨요.",
    cols: ["단계/날짜", "우리가 나눈 이야기", "그래서 정한 것"],
    long: true,
  },
  {
    kind: "devlog",
    title: "개발 과정 자유기록",
    hint: "개발하며 겪은 일과 해결 방법을 자유롭게 쌓아요.",
    cols: ["날짜", "무슨 일이 있었나", "어떻게 해결했나"],
    long: true,
  },
];

const LONG_MAX = 2000;

const CHECK_ITEMS = [
  "우리가 풀려는 문제를 스스로 설명할 수 있다",
  "사용자를 구체적으로 정했다",
  "아이디어를 여러 개 내보고 비교했다",
  "만들다 막혔을 때 스스로 방법을 찾아봤다",
  "AI에게 물을 때 무엇을 원하는지 분명히 말했다",
  "AI가 준 결과를 그대로 쓰지 않고 확인했다",
  "팀원과 역할을 나누고 서로 도왔다",
  "다른 사람의 자료를 쓸 때 출처를 밝혔다",
];

const CHECK_CHOICES = ["잘함", "보통", "아직"];

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

const FINAL_FIELDS: {
  key: FinalKey;
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
];

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
                  value={final[f.key]}
                  onChange={(e) => onFinalChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={4}
                  disabled={!canEdit}
                  className="rounded-xl"
                />
              ) : (
                <Input
                  id={`rec-${f.key}`}
                  value={final[f.key]}
                  onChange={(e) => onFinalChange(f.key, e.target.value)}
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

      <CheckSection
        rows={bundle.rows.filter((r) => r.kind === "check")}
        canEdit={canEdit}
        onSave={(vars) => rowMutation.mutate(vars)}
      />

      <ReflectionSection
        postId={postId}
        reflections={bundle.reflections}
        members={bundle.members}
        myKey={(identity?.author ?? "").trim().toLowerCase()}
        isMember={isMember}
        isAdmin={!!auth.adminPassword}
      />
    </div>
  );
}

// 교육적 점검 8항목 — 문항은 고정, 선택/메모만 저장한다.
function CheckSection({
  rows,
  canEdit,
  onSave,
}: {
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
}) {
  const byOrder = new Map(rows.map((r) => [r.sortOrder, r]));
  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">교육적 점검 8항목</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        팀이 함께 이야기하며 솔직하게 골라요. 메모는 한 줄이면 충분해요.
      </p>
      <div className="mt-4 space-y-3">
        {CHECK_ITEMS.map((question, index) => (
          <CheckItem
            key={question}
            index={index}
            question={question}
            row={byOrder.get(index) ?? null}
            canEdit={canEdit}
            onSave={onSave}
          />
        ))}
      </div>
    </section>
  );
}

function CheckItem({
  index,
  question,
  row,
  canEdit,
  onSave,
}: {
  index: number;
  question: string;
  row: RecordRowDTO | null;
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
}) {
  const [memo, setMemo] = useState(row?.col3 ?? "");
  useEffect(() => setMemo(row?.col3 ?? ""), [row?.col3]);
  const choice = row?.col2 ?? "";

  const save = (nextChoice: string, nextMemo: string) =>
    onSave({
      id: row?.id ?? null,
      kind: "check",
      sortOrder: index,
      col1: question,
      col2: nextChoice,
      col3: nextMemo,
      knownUpdatedAt: row?.updatedAt ?? "",
    });

  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="text-sm font-medium text-foreground">
        {index + 1}. {question}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {CHECK_CHOICES.map((c) => (
          <Button
            key={c}
            type="button"
            size="sm"
            variant={choice === c ? "default" : "outline"}
            disabled={!canEdit}
            className="rounded-full active:scale-95"
            onClick={() => save(c, memo)}
          >
            {c}
          </Button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="한 줄 메모 (선택)"
          disabled={!canEdit}
          className="rounded-xl bg-background"
        />
        {canEdit && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={memo === (row?.col3 ?? "")}
            className="shrink-0 rounded-xl active:scale-95"
            onClick={() => save(choice, memo)}
          >
            저장
          </Button>
        )}
      </div>
    </div>
  );
}

// 개인 후기와 약속 — 본인 것만 쓰고 고칠 수 있다.
function ReflectionSection({
  postId,
  reflections,
  members,
  myKey,
  isMember,
  isAdmin,
}: {
  postId: string;
  reflections: RecordReflectionDTO[];
  members: { id: string; username: string; usernameKey: string }[];
  myKey: string;
  isMember: boolean;
  isAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const saveFn = useServerFn(saveRecordReflection);
  const deleteFn = useServerFn(deleteRecordReflection);
  const { identity } = useStoredIdentity();

  const mine = reflections.find((r) => r.usernameKey === myKey) ?? null;
  const others = reflections.filter((r) => r.usernameKey !== myKey);

  const [content, setContent] = useState(mine?.content ?? "");
  const [promise, setPromise] = useState(mine?.promise ?? "");
  useEffect(() => {
    setContent(mine?.content ?? "");
    setPromise(mine?.promise ?? "");
  }, [mine?.content, mine?.promise]);

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          postId,
          content,
          promise,
          knownUpdatedAt: mine?.updatedAt ?? "",
          author: identity?.author ?? "",
          nicknamePassword: identity?.nicknamePassword ?? "",
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["record", postId] });
      toast.success("후기를 저장했어요.");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "저장하지 못했어요."),
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
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "삭제하지 못했어요."),
  });

  const notWritten = members.filter(
    (m) => !reflections.some((r) => r.usernameKey === m.usernameKey),
  );

  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">개인 후기와 약속</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        팀원 각자 하나씩 남겨요. 내 후기는 나만 고칠 수 있어요.
      </p>

      {isMember ? (
        <div className="mt-4 space-y-3 rounded-xl bg-muted/40 p-3">
          <div className="space-y-1.5">
            <Label htmlFor="rec-reflection">내 후기</Label>
            <Textarea
              id="rec-reflection"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 2000))}
              rows={4}
              placeholder="이번 활동에서 배운 것, 어려웠던 것"
              className="rounded-xl bg-background"
            />
            <p className="text-right text-xs text-muted-foreground">{content.length}/2000</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rec-promise">다음에 지킬 약속</Label>
            <Input
              id="rec-promise"
              value={promise}
              onChange={(e) => setPromise(e.target.value.slice(0, 1000))}
              placeholder="예: 막히면 먼저 스스로 찾아본 뒤 물어보기"
              className="rounded-xl bg-background"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="rounded-xl active:scale-95"
              disabled={save.isPending}
              onClick={() => save.mutate()}
            >
              저장
            </Button>
            {mine && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-xl text-muted-foreground hover:text-destructive"
                onClick={() => remove.mutate(mine.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          팀원 닉네임으로 내 정보를 저장하면 후기를 남길 수 있어요.
        </p>
      )}

      <div className="mt-4 space-y-3">
        {others.map((r) => (
          <div key={r.id} className="rounded-xl bg-muted/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{r.username}</p>
              {isAdmin && (
                <button
                  type="button"
                  aria-label={`${r.username} 후기 삭제`}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  onClick={() => remove.mutate(r.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {r.content && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{r.content}</p>
            )}
            {r.promise && (
              <p className="mt-1 text-sm text-muted-foreground">약속: {r.promise}</p>
            )}
          </div>
        ))}
        {notWritten.length > 0 && (
          <p className="text-xs text-muted-foreground">
            아직 안 쓴 팀원: {notWritten.map((m) => m.username).join(", ")}
          </p>
        )}
      </div>
    </section>
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
