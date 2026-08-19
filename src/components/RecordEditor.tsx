import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronLeft, ChevronRight, ImagePlus, Loader2, Plus, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";

import { uploadCommentImage } from "@/lib/image-upload";
import {
  MAX_ATTACHMENT_BYTES,
  parseAttachments,
  serializeAttachments,
  uploadAttachment,
  type AttachedFile,
} from "@/lib/file-upload";
import { getFileIcon } from "@/lib/file-icons";
import { downloadFile } from "@/lib/download";


import {
  addRecordMember,
  deleteRecordReflection,
  deleteRecordRow,
  getRecord,
  removeRecordMember,
  saveRecordFinal,
  saveRecordReflection,
  saveRecordRow,
  updateRecordMember,
  type RecordMemberDTO,
  type RecordReflectionDTO,
  type RecordRowDTO,
} from "@/lib/record.functions";
import {
  AI_USE_TYPES,
  CHANGE_TYPES,
  DEPLOY_STATUSES,
  MAIN_USERS,
  OUTPUT_TYPES,
  PRIVACY_STATUSES,
  PROBLEM_AREAS,
  PROCESS_SUBTYPES,
  PROMISE_ITEMS,
  RECORD_FINAL_FIELDS,
  ROW_SECTION_DEFS,
  STANCE_CHOICES,
  STANCE_QUESTIONS,
  type RecordFinalKey,
  type RowSectionDef,
} from "@/lib/record-schema";
import { RecordOutput } from "@/components/RecordOutput";
import { EthicsSection } from "@/components/record/EthicsSection";
import { StepSidebar } from "@/components/record/StepSidebar";
import {
  answeredBlockStatus,
  fieldBlockStatus,
  rowBlockStatus,
  type ProgressBlock,
} from "@/lib/record-progress";

import { getAdminPassword } from "@/lib/admin-auth";
import { useStoredIdentity } from "@/hooks/useNicknameIdentity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type RowKind = RecordRowDTO["kind"];

type SaveRowVars = {
  id: string | null;
  kind: RowKind;
  subtype: string;
  rowAuthor: string;
  sortOrder: number;
  col1: string;
  col2: string;
  col3: string;
  col4: string;
  col5: string;
  col6: string;
  knownUpdatedAt: string;
};

const emptyRowVars = (kind: RowKind, sortOrder: number): SaveRowVars => ({
  id: null,
  kind,
  subtype: "",
  rowAuthor: "",
  sortOrder,
  col1: "",
  col2: "",
  col3: "",
  col4: "",
  col5: "",
  col6: "",
  knownUpdatedAt: "",
});

type FinalInput = {
  key: RecordFinalKey;
  label: string;
  hint?: string;
  type: "text" | "textarea" | "select" | "image";
  options?: string[];
  full?: boolean;
  placeholder?: string;
};

const FINAL_GROUPS: { title: string; hint?: string; fields: FinalInput[] }[] = [
  {
    title: "한눈에 보기",
    fields: [
      {
        key: "serviceName",
        label: "서비스 이름",
        type: "text",
        placeholder: "예) 배수 판별 연습기",
      },
      {
        key: "oneLiner",
        label: "한 줄 소개",
        type: "text",
        full: true,
        placeholder: "예) 3·4·9의 배수를 스스로 확인해 보는 연습 도구",
      },
      { key: "problemArea", label: "문제 영역", type: "select", options: PROBLEM_AREAS },
      { key: "targetUser", label: "주 사용자", type: "select", options: MAIN_USERS },
      { key: "outputType", label: "결과물 형태", type: "select", options: OUTPUT_TYPES },
      {
        key: "tags",
        label: "태그",
        hint: "쉼표로 구분",
        type: "text",
        placeholder: "예) 초등수학, 배수, 연습",
      },
      { key: "consent", label: "공개 동의", type: "select", options: ["동의", "미동의"] },
    ],
  },
  {
    title: "문제와 해결",
    fields: [
      {
        key: "problem",
        label: "어떤 문제를 풀었나요?",
        type: "textarea",
        full: true,
        placeholder: "예) 학생들이 배수 판별법을 외우기만 하고 이유를 몰랐어요.",
      },
      {
        key: "solution",
        label: "어떻게 풀었나요?",
        type: "textarea",
        full: true,
        placeholder: "예) 판별 과정을 단계별로 보여 주고 스스로 확인하게 했어요.",
      },
    ],
  },
  {
    title: "사용과 배포",
    fields: [
      { key: "deployStatus", label: "배포 상태", type: "select", options: DEPLOY_STATUSES },
      {
        key: "usageEnv",
        label: "사용 환경",
        hint: "예: PC 웹, 모바일 웹",
        type: "text",
        placeholder: "예) PC 웹, 모바일 웹",
      },
      {
        key: "deployUrl",
        label: "배포 주소",
        type: "text",
        placeholder: "예) https://내서비스.lovable.app",
      },
      {
        key: "githubUrl",
        label: "GitHub 주소",
        type: "text",
        placeholder: "예) https://github.com/이름/저장소",
      },
      {
        key: "demoVideoUrl",
        label: "시연 영상 주소",
        type: "text",
        placeholder: "예) https://youtu.be/영상주소",
      },
      {
        key: "heroImageUrl",
        label: "대표 이미지",
        hint: "이미지 파일을 올리면 자동으로 등록돼요.",
        type: "image",
        full: true,
      },
      {
        key: "usageCondition",
        label: "사용 조건",
        hint: "계정 필요 여부, 무료/유료 등",
        type: "textarea",
        full: true,
        placeholder: "예) 계정 없이 무료로 사용할 수 있어요.",
      },
    ],
  },
  {
    title: "기술 구성",
    hint: "환경변수는 이름만 적고 값(비밀키)은 절대 입력하지 마세요.",
    fields: [
      { key: "techScreen", label: "화면", type: "text", placeholder: "예) React, Tailwind CSS" },
      {
        key: "techServer",
        label: "서버·백엔드",
        type: "text",
        placeholder: "예) Lovable Cloud(데이터베이스·인증)",
      },
      { key: "techAi", label: "AI", type: "text", placeholder: "예) 사용하지 않음" },
      {
        key: "techStorage",
        label: "저장소",
        type: "text",
        placeholder: "예) 브라우저 로컬 저장소",
      },
      { key: "techDeploy", label: "배포", type: "text", placeholder: "예) Lovable 배포" },
      {
        key: "dirStructure",
        label: "폴더 구조",
        type: "textarea",
        full: true,
        placeholder: "예)\nsrc/\n  components/\n  routes/",
      },
      { key: "installCmd", label: "설치 명령", type: "text", placeholder: "예) npm install" },
      { key: "runCmd", label: "실행 명령", type: "text", placeholder: "예) npm run dev" },
      {
        key: "envNames",
        label: "환경변수 이름만",
        type: "text",
        full: true,
        placeholder: "예) VITE_API_URL (값은 적지 마세요)",
      },
    ],
  },
  {
    title: "라이선스와 출처",
    fields: [
      { key: "licenseCode", label: "코드 라이선스", type: "text", placeholder: "예) MIT" },
      { key: "licenseDocs", label: "문서 라이선스", type: "text", placeholder: "예) CC BY 4.0" },
      {
        key: "licenseExternal",
        label: "외부 자료 출처",
        type: "textarea",
        full: true,
        placeholder: "예) 아이콘: Lucide (ISC 라이선스)",
      },
    ],
  },
];

const RISK_GROUP: { title: string; hint?: string; fields: FinalInput[] } = {
  title: "변화와 위험 점검",
  hint: "실제로 확인한 것과 기대하는 것을 구분해서 적어요.",
  fields: [
    {
      key: "currentScope",
      label: "지금까지 확인한 범위",
      type: "textarea",
      full: true,
      placeholder: "예) 5학년 한 학급 24명이 2차시 동안 사용했어요.",
    },
    { key: "changeType", label: "변화 구분", type: "select", options: CHANGE_TYPES },
    {
      key: "changeContent",
      label: "변화 내용",
      type: "textarea",
      full: true,
      placeholder: "예) 판별 이유를 말로 설명하는 학생이 늘었어요.",
    },
    { key: "privacyStatus", label: "개인정보 처리 여부", type: "select", options: PRIVACY_STATUSES },
    {
      key: "riskExpected",
      label: "예상되는 위험",
      type: "textarea",
      full: true,
      placeholder: "예) 틀린 설명을 학생이 그대로 외울 수 있어요.",
    },
    {
      key: "riskMitigation",
      label: "위험을 줄이려고 한 일",
      type: "textarea",
      full: true,
      placeholder: "예) 모든 설명을 교사가 미리 검토했어요.",
    },
    {
      key: "riskStop",
      label: "멈춤 기준",
      type: "textarea",
      full: true,
      placeholder: "예) 잘못된 판별 결과가 한 번이라도 나오면 사용을 멈춰요.",
    },
    {
      key: "riskTest",
      label: "검증 방법",
      type: "textarea",
      full: true,
      placeholder: "예) 1~200까지 숫자로 판별 결과를 직접 확인했어요.",
    },
  ],
};


const FINAL_MAX = new Map(RECORD_FINAL_FIELDS.map((f) => [f.key as string, f.max]));

const STEPS = [
  { no: "01", title: "팀 공통정보" },
  { no: "02", title: "문제 정의 과정" },
  { no: "03", title: "최종 결과물" },
  { no: "04", title: "개발·교육적 점검" },
  { no: "05", title: "개인 후기·소회" },
  { no: "06", title: "윤리 설문" },
  { no: "07", title: "README 출력" },
  { no: "08", title: "사례집 출력" },
];

export function RecordEditor({
  postId,
  postNo,
  slug,
}: {
  postId: string;
  postNo: number;
  slug: string;
}) {
  const queryClient = useQueryClient();
  const fetchRecord = useServerFn(getRecord);
  const saveFinalFn = useServerFn(saveRecordFinal);
  const saveRowFn = useServerFn(saveRecordRow);
  const deleteRowFn = useServerFn(deleteRecordRow);
  const addMemberFn = useServerFn(addRecordMember);
  const removeMemberFn = useServerFn(removeRecordMember);
  const updateMemberFn = useServerFn(updateRecordMember);
  const { identity } = useStoredIdentity();

  const [step, setStep] = useState(0);

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

  const [final, setFinal] = useState<Record<string, string> | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const knownUpdatedAt = useRef("");
  const pending = useRef<Record<string, string>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!bundle) return;
    const f = bundle.final as Record<string, string> | null;
    knownUpdatedAt.current = f?.updatedAt ?? "";
    setFinal(
      Object.fromEntries(RECORD_FINAL_FIELDS.map((field) => [field.key, f?.[field.key] ?? ""])),
    );
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

  const onFinalChange = (key: string, value: string) => {
    const max = FINAL_MAX.get(key) ?? 2000;
    const next = value.slice(0, max);
    setFinal((prev) => (prev ? { ...prev, [key]: next } : prev));
    pending.current[key] = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 1000);
  };

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const rowMutation = useMutation({
    mutationFn: (vars: SaveRowVars) => saveRowFn({ data: { postId, ...vars, ...auth } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["record", postId] }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "저장하지 못했어요."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRowFn({ data: { postId, id, ...auth } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["record", postId] }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "삭제하지 못했어요."),
  });

  const [newMember, setNewMember] = useState("");
  const addMember = useMutation({
    mutationFn: () => addMemberFn({ data: { postId, member: newMember.trim(), ...auth } }),
    onSuccess: () => {
      setNewMember("");
      queryClient.invalidateQueries({ queryKey: ["record", postId] });
      toast.success("팀원을 추가했어요.");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "추가하지 못했어요."),
  });
  const removeMember = useMutation({
    mutationFn: (memberId: string) => removeMemberFn({ data: { postId, memberId, ...auth } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["record", postId] }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "삭제하지 못했어요."),
  });
  const saveMember = useMutation({
    mutationFn: (vars: { memberId: string; affiliation: string; role: string }) =>
      updateMemberFn({ data: { postId, ...vars, ...auth } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["record", postId] });
      toast.success("팀원 정보를 저장했어요.");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "저장하지 못했어요."),
  });

  if (isLoading || !bundle || !final) {
    return (
      <div className="rounded-2xl bg-card p-6 text-sm text-muted-foreground shadow-sm">
        활동기록을 불러오는 중이에요...
      </div>
    );
  }

  const rowsOf = (kind: RowKind) =>
    bundle.rows.filter((r) => r.kind === kind).sort((a, b) => a.sortOrder - b.sortOrder);

  const memberAuthor = isMember ? (identity?.author ?? "").trim() : "";

  const rowSectionProps = {
    canEdit,
    onSave: (vars: SaveRowVars) => rowMutation.mutate(vars),
    onDelete: (id: string) => deleteMutation.mutate(id),
  };

  const step3Kinds: RowKind[] = ["feature", "flow", "limit", "plan", "maker"];
  const step3Blocks: ProgressBlock[] = [
    ...FINAL_GROUPS.map((group, i) => ({
      id: `s3-g${i}`,
      no: String(i + 1).padStart(2, "0"),
      title: group.title,
      ...fieldBlockStatus(group.fields.map((f) => final[f.key] ?? "")),
    })),
    ...step3Kinds.map((kind, i) => ({
      id: `s3-${kind}`,
      no: String(FINAL_GROUPS.length + i + 1).padStart(2, "0"),
      title: ROW_SECTION_DEFS[kind]!.title,
      ...rowBlockStatus(rowsOf(kind).length),
    })),
  ];

  const step4RowKinds: RowKind[] = [
    "devlog",
    "decision",
    "stuck",
    "ai_use",
    "ai_error",
    "privacy",
  ];
  const step4Blocks: ProgressBlock[] = [
    ...step4RowKinds.map((kind, i) => ({
      id: `s4-${kind}`,
      no: String(i + 1).padStart(2, "0"),
      title: ROW_SECTION_DEFS[kind]!.title,
      ...rowBlockStatus(rowsOf(kind).length),
    })),
    {
      id: "s4-stance",
      no: String(step4RowKinds.length + 1).padStart(2, "0"),
      title: "교육적 태도 점검",
      ...answeredBlockStatus(
        rowsOf("stance").filter((r) => (r.col1 ?? "").trim().length > 0).length,
        STANCE_QUESTIONS.length,
      ),
    },
    {
      id: "s4-risk",
      no: String(step4RowKinds.length + 2).padStart(2, "0"),
      title: RISK_GROUP.title,
      ...fieldBlockStatus(RISK_GROUP.fields.map((f) => final[f.key] ?? "")),
    },
  ];



  return (
    <div className="space-y-6">
      <nav aria-label="작성 단계" className="rounded-2xl bg-card p-3 shadow-sm">
        <ol className="flex gap-2 overflow-x-auto">
          {STEPS.map((s, i) => (
            <li key={s.no} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setStep(i)}
                className={cn(
                  "w-full rounded-xl px-3 py-2 text-left transition-colors",
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted",
                )}
              >
                <span className="block text-[11px] font-semibold opacity-80">{s.no}</span>
                <span className="block truncate text-xs font-medium sm:text-sm">{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {!canEdit && (
        <p className="rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          팀원 닉네임으로 내 정보를 저장하면 이 기록을 함께 편집할 수 있어요.
        </p>
      )}

      {step === 0 && (
        <MemberSection
          members={bundle.members}
          canEdit={canEdit}
          newMember={newMember}
          setNewMember={setNewMember}
          onAdd={() => newMember.trim() && addMember.mutate()}
          onRemove={(id) => removeMember.mutate(id)}
          onSave={(vars) => saveMember.mutate(vars)}
        />
      )}

      {step === 1 && (
        <RowSection
          def={ROW_SECTION_DEFS["process"]!}
          title="문제 정의 과정 기록"
          hint="회의·인터뷰 기록을 종류별로 남겨요."
          subtypes={PROCESS_SUBTYPES}
          cols={["언제·어디서", "무엇을 나눴나요?", "그래서 정한 것"]}
          longCols={[1, 2]}
          rows={rowsOf("process")}
          {...rowSectionProps}
          authorEnabled
          defaultAuthor={memberAuthor}

        />
      )}

      {step === 2 && (
        <div className="relative space-y-6">
          <StepSidebar blocks={step3Blocks} />
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
            {FINAL_GROUPS.map((group, i) => (
              <div key={group.title} id={`s3-g${i}`} className="mt-6 scroll-mt-24 first:mt-4">
                <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
                {group.hint && (
                  <p className="mt-1 text-xs text-muted-foreground">{group.hint}</p>
                )}
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  {group.fields.map((f) => (
                    <FinalField
                      key={f.key}
                      field={f}
                      value={final[f.key] ?? ""}
                      canEdit={canEdit}
                      onChange={onFinalChange}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>

          {step3Kinds.map((kind) => (
            <div key={kind} id={`s3-${kind}`} className="scroll-mt-24">
              <RowSection
                def={ROW_SECTION_DEFS[kind]!}
                rows={rowsOf(kind)}
                {...rowSectionProps}
              />
            </div>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="relative space-y-6">
          <StepSidebar blocks={step4Blocks} />
          <div id="s4-devlog" className="scroll-mt-24">
            <RowSection
              def={ROW_SECTION_DEFS["devlog"]!}
              title="개발 과정 자유기록"
              hint="개발하며 겪은 일과 해결 방법을 자유롭게 쌓아요."
              cols={["날짜", "무슨 일이 있었나", "어떻게 해결했나"]}
              longCols={[1, 2]}
              rows={rowsOf("devlog")}
              {...rowSectionProps}
              authorEnabled
              defaultAuthor={memberAuthor}
            />
          </div>
          {(["decision", "stuck", "ai_use", "ai_error", "privacy"] as RowKind[]).map((kind) => (
            <div key={kind} id={`s4-${kind}`} className="scroll-mt-24">
              <RowSection
                def={ROW_SECTION_DEFS[kind]!}
                subtypes={kind === "ai_use" ? AI_USE_TYPES : undefined}
                rows={rowsOf(kind)}
                {...rowSectionProps}
              />
            </div>
          ))}

          <div id="s4-stance" className="scroll-mt-24">
            <StanceSection
              rows={rowsOf("stance")}
              canEdit={canEdit}
              onSave={(vars) => rowMutation.mutate(vars)}
            />
          </div>

          <section id="s4-risk" className="scroll-mt-24 rounded-2xl bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">{RISK_GROUP.title}</h3>
            {RISK_GROUP.hint && (
              <p className="mt-1 text-sm text-muted-foreground">{RISK_GROUP.hint}</p>
            )}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {RISK_GROUP.fields.map((f) => (
                <FinalField
                  key={f.key}
                  field={f}
                  value={final[f.key] ?? ""}
                  canEdit={canEdit}
                  onChange={onFinalChange}
                />
              ))}
            </div>
          </section>
        </div>
      )}


      {step === 4 && (
        <ReflectionSection
          postId={postId}
          reflections={bundle.reflections}
          members={bundle.members}
          myKey={(identity?.author ?? "").trim().toLowerCase()}
          isMember={isMember}
          isAdmin={!!auth.adminPassword}
        />
      )}

      {step === 5 && (
        <EthicsSection
          postId={postId}
          ethics={bundle.ethics}
          members={bundle.members}
          myKey={(identity?.author ?? "").trim().toLowerCase()}
          isMember={isMember}
          isAdmin={!!auth.adminPassword}
        />
      )}

      {step === 6 && (
        <RecordOutput
          team={{
            postId: bundle.postId,
            postNo,
            categoryId: bundle.categoryId,
            slug,
            teamName: bundle.teamName,
            members: bundle.members,
            final: bundle.final,
            rows: bundle.rows,
            reflections: bundle.reflections,
            ethics: bundle.ethics,
          }}
          onGoStep={setStep}
        />
      )}


      <div className="record-output-ui flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl active:scale-95"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
          이전 단계
        </Button>
        <Button
          type="button"
          className="rounded-xl active:scale-95"
          disabled={step === STEPS.length - 1}
          onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
        >
          다음 단계
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function FinalField({
  field,
  value,
  canEdit,
  onChange,
}: {
  field: FinalInput;
  value: string;
  canEdit: boolean;
  onChange: (key: string, value: string) => void;
}) {
  const id = `rec-${field.key}`;
  return (
    <div className={cn("space-y-2", (field.full || field.type === "textarea") && "sm:col-span-2")}>
      <Label htmlFor={id}>{field.label}</Label>
      {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
      {field.type === "textarea" ? (
        <Textarea
          id={id}
          value={value}
          rows={4}
          disabled={!canEdit}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="rounded-xl"
        />
      ) : field.type === "select" ? (
        <div className="flex flex-wrap gap-2">
          {(field.options ?? []).map((opt) => (
            <Button
              key={opt}
              type="button"
              size="sm"
              variant={value === opt ? "default" : "outline"}
              disabled={!canEdit}
              className="rounded-full active:scale-95"
              onClick={() => onChange(field.key, value === opt ? "" : opt)}
            >
              {opt}
            </Button>
          ))}
        </div>
      ) : field.type === "image" ? (
        <HeroImageInput
          value={value}
          canEdit={canEdit}
          onChange={(v) => onChange(field.key, v)}
        />
      ) : (
        <Input
          id={id}
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
      const url = await uploadCommentImage(file);
      onChange(url);
      toast.success("대표 이미지를 등록했어요.");
    } catch (err) {
      console.error("hero image upload failed", err);
      toast.error(err instanceof Error ? err.message : "이미지 업로드에 실패했어요.");
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
          handleFile(e.target.files?.[0]);
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
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {value ? "이미지 교체" : "이미지 선택"}
        </Button>
        {value && (
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
        )}
      </div>
      {value && (
        <div className="overflow-hidden rounded-xl border border-border">
          <img src={value} alt="대표 이미지 미리보기" className="max-h-64 w-full object-contain" />
        </div>
      )}
    </div>
  );
}

function MemberSection({
  members,
  canEdit,
  newMember,
  setNewMember,
  onAdd,
  onRemove,
  onSave,
}: {
  members: RecordMemberDTO[];
  canEdit: boolean;
  newMember: string;
  setNewMember: (v: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onSave: (vars: { memberId: string; affiliation: string; role: string }) => void;
}) {
  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">팀 공통정보</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        팀원과 각자의 소속·역할을 적어요. 이후 단계의 기록에도 함께 표시돼요.
      </p>

      <div className="mt-4 space-y-3">
        {members.map((m) => (
          <MemberRow key={m.id} member={m} canEdit={canEdit} onRemove={onRemove} onSave={onSave} />
        ))}
      </div>

      {canEdit && (
        <div className="mt-4 flex gap-2">
          <Input
            value={newMember}
            onChange={(e) => setNewMember(e.target.value)}
            placeholder="예) 김수학"
            className="rounded-xl"
          />
          <Button type="button" onClick={onAdd} className="shrink-0 rounded-xl active:scale-95">
            추가
          </Button>
        </div>
      )}
    </section>
  );
}

function MemberRow({
  member,
  canEdit,
  onRemove,
  onSave,
}: {
  member: RecordMemberDTO;
  canEdit: boolean;
  onRemove: (id: string) => void;
  onSave: (vars: { memberId: string; affiliation: string; role: string }) => void;
}) {
  const [affiliation, setAffiliation] = useState(member.affiliation);
  const [role, setRole] = useState(member.role);
  useEffect(() => {
    setAffiliation(member.affiliation);
    setRole(member.role);
  }, [member.affiliation, member.role]);
  const dirty = affiliation !== member.affiliation || role !== member.role;

  return (
    <div className="grid gap-2 rounded-xl bg-muted/40 p-3 sm:grid-cols-[10rem_1fr_1fr_auto]">
      <p className="self-center text-sm font-medium text-foreground">{member.username}</p>
      <Input
        value={affiliation}
        onChange={(e) => setAffiliation(e.target.value)}
        placeholder="예) ○○초등학교 5학년"
        disabled={!canEdit}
        className="rounded-xl bg-background"
      />
      <Input
        value={role}
        onChange={(e) => setRole(e.target.value)}
        placeholder="예) 기획·문제 정의"
        disabled={!canEdit}
        className="rounded-xl bg-background"
      />
      {canEdit && (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            disabled={!dirty}
            className="rounded-xl active:scale-95"
            onClick={() => onSave({ memberId: member.id, affiliation, role })}
          >
            저장
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label={`${member.username} 팀원 삭제`}
            className="rounded-xl text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(member.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function RowSection({
  def,
  rows,
  canEdit,
  onSave,
  onDelete,
  title,
  hint,
  cols,
  longCols,
  placeholders,
  subtypes,
  defaultAuthor = "",
  authorEnabled = false,
}: {
  def: RowSectionDef;
  rows: RecordRowDTO[];
  canEdit: boolean;
  onSave: (vars: SaveRowVars) => void;
  onDelete: (id: string) => void;
  title?: string;
  hint?: string;
  cols?: string[];
  longCols?: number[];
  placeholders?: string[];
  subtypes?: string[];
  // 새 행을 만들 때 미리 채울 작성자 이름 (작성자 사용 섹션에서만 전달)
  defaultAuthor?: string;
  // 작성자 입력칸을 노출할 섹션인지 여부 (과정 기록·개발 자유기록만 true)
  authorEnabled?: boolean;
}) {
  const labels = cols ?? def.cols;
  const longs = longCols ?? def.longCols ?? [];
  const hints = placeholders ?? def.placeholders;
  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">{title ?? def.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{hint ?? def.hint}</p>
      <div className="mt-4 space-y-3">
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">아직 등록된 내용이 없어요.</p>
        )}
        {rows.map((row) => (
          <RowItem
            key={row.id}
            row={row}
            labels={labels}
            longs={longs}
            placeholders={hints}
            subtypes={subtypes}
            canEdit={canEdit}
            authorEnabled={authorEnabled}
            linkCol={def.linkCol}
            fileCol={def.fileCol}

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
              onSave({ ...emptyRowVars(def.kind, rows.length), rowAuthor: defaultAuthor })
            }
          >
            <Plus className="h-4 w-4" />
            {def.addLabel}
          </Button>
        )}
      </div>
    </section>
  );
}

function RowItem({
  row,
  labels,
  longs,
  placeholders,
  subtypes,
  canEdit,
  authorEnabled,
  linkCol,
  fileCol,
  onSave,
  onDelete,
}: {
  row: RecordRowDTO;
  labels: string[];
  longs: number[];
  placeholders?: string[];
  subtypes?: string[];
  canEdit: boolean;
  authorEnabled?: boolean;
  linkCol?: number;
  fileCol?: number;
  onSave: (vars: SaveRowVars) => void;
  onDelete: (id: string) => void;
}) {


  const initial = [row.col1, row.col2, row.col3, row.col4, row.col5, row.col6];
  const [values, setValues] = useState(initial);
  const [subtype, setSubtype] = useState(row.subtype);
  const [author, setAuthor] = useState(row.author);
  useEffect(() => {
    setValues([row.col1, row.col2, row.col3, row.col4, row.col5, row.col6]);
    setSubtype(row.subtype);
    setAuthor(row.author);
  }, [row.col1, row.col2, row.col3, row.col4, row.col5, row.col6, row.subtype, row.author]);

  const dirty =
    values.some((v, i) => v !== initial[i]) || subtype !== row.subtype || author !== row.author;

  const update = (i: number, next: string) =>
    setValues((prev) => prev.map((v, idx) => (idx === i ? next : v)));

  // 관련 파일 첨부 (fileCol 열에 JSON 문자열로 저장)
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const attachments = fileCol === undefined ? [] : parseAttachments(values[fileCol]);

  const setAttachments = (next: AttachedFile[]) => {
    if (fileCol === undefined) return;
    update(fileCol, serializeAttachments(next));
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (attachments.length >= 3) {
      toast.error("파일은 최대 3개까지 첨부할 수 있어요.");
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error("파일 크기는 3MB 이하만 가능해요.");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadAttachment(file);
      const next = [...attachments, uploaded];
      if (serializeAttachments(next).length > 2900) {
        toast.error("첨부가 너무 많아요. 파일 수를 줄여 주세요.");
        return;
      }
      setAttachments(next);
      toast.success("파일을 첨부했어요! 저장을 눌러 주세요.");
    } catch (err) {
      console.error("record file upload failed", err);
      toast.error("파일 업로드에 실패했어요.");
    } finally {
      setUploading(false);
    }
  };

  // 저장 직전 관련 링크에 프로토콜 보정
  const normalizedValues = () =>
    values.map((v, i) => {
      if (i !== linkCol) return v;
      const url = v.trim();
      if (!url) return "";
      return /^(https?:|mailto:)/i.test(url) ? url : `https://${url}`;
    });

  // 작성자 칸을 쓰지 않는 표에서도 예전에 저장된 이름은 읽기 전용으로 보여 준다.
  const legacyAuthor = !authorEnabled && author.trim() ? author.trim() : "";


  return (
    <div className="space-y-2 rounded-xl bg-muted/40 p-3">
      {(subtypes || legacyAuthor || (authorEnabled && canEdit)) && (
        <div className="flex flex-wrap items-center gap-2">
          {subtypes?.map((s) => (
            <Button
              key={s}
              type="button"
              size="sm"
              variant={subtype === s ? "default" : "outline"}
              disabled={!canEdit}
              className="rounded-full active:scale-95"
              onClick={() => setSubtype(subtype === s ? "" : s)}
            >
              {s}
            </Button>
          ))}
          {authorEnabled ? (
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground">기록한 사람</Label>
              <Input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="예) 김수학 (수정 가능)"
                disabled={!canEdit}
                className="h-8 w-40 rounded-xl bg-background text-xs"
              />
            </div>
          ) : (
            legacyAuthor && (
              <span className="text-xs text-muted-foreground">기록한 사람: {legacyAuthor}</span>
            )
          )}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {labels.map((label, i) => {
          if (i === fileCol || i === linkCol) return null;
          return (
            <div
              key={label}
              className={cn("space-y-1", longs.includes(i) && "sm:col-span-2")}
            >
              <Label className="text-xs text-muted-foreground">{label}</Label>
              {longs.includes(i) ? (
                <Textarea
                  value={values[i] ?? ""}
                  onChange={(e) => update(i, e.target.value.slice(0, 3000))}
                  rows={3}
                  placeholder={placeholders?.[i]}
                  disabled={!canEdit}
                  className="rounded-xl bg-background"
                />
              ) : (
                <Input
                  value={values[i] ?? ""}
                  onChange={(e) => update(i, e.target.value.slice(0, 3000))}
                  placeholder={placeholders?.[i]}
                  disabled={!canEdit}
                  className="rounded-xl bg-background"
                />
              )}
            </div>
          );
        })}
      </div>

      {fileCol !== undefined && (
        <div className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {labels[fileCol] ?? "관련 파일"}{" "}
              <span className="text-[11px]">(최대 3개, 개당 3MB)</span>
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              {attachments.map((f) => {
                const Icon = getFileIcon(f.name);
                return (
                  <span
                    key={f.url}
                    className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs"
                  >
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <button
                      type="button"
                      className="max-w-[12rem] truncate hover:underline"
                      onClick={() => downloadFile(f.url, f.name)}
                    >
                      {f.name}
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        aria-label={`${f.name} 첨부 제거`}
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setAttachments(attachments.filter((a) => a.url !== f.url))
                        }
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </span>
                );
              })}
              {canEdit && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    onChange={handleFilePick}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={uploading || attachments.length >= 3}
                    className="rounded-xl active:scale-95"
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    파일 첨부
                  </Button>
                </>
              )}
            </div>
          </div>

          {linkCol !== undefined && (
            <div className="min-w-[16rem] flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">
                {labels[linkCol] ?? "관련 링크"}
              </Label>
              <Input
                value={values[linkCol] ?? ""}
                onChange={(e) => update(linkCol, e.target.value.slice(0, 3000))}
                placeholder={placeholders?.[linkCol]}
                disabled={!canEdit}
                className="rounded-xl bg-background"
              />
            </div>
          )}
        </div>
      )}
      {canEdit && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!dirty || uploading}
            className="rounded-xl active:scale-95"
            onClick={() => {
              const vals = normalizedValues();
              if (fileCol !== undefined && (vals[fileCol] ?? "").length > 2900) {
                toast.error("첨부가 너무 많아요. 파일 수를 줄여 주세요.");
                return;
              }
              onSave({
                id: row.id,
                kind: row.kind,
                subtype,
                rowAuthor: author,
                sortOrder: row.sortOrder,
                col1: vals[0] ?? "",
                col2: vals[1] ?? "",
                col3: vals[2] ?? "",
                col4: vals[3] ?? "",
                col5: vals[4] ?? "",
                col6: vals[5] ?? "",
                knownUpdatedAt: row.updatedAt,
              });
            }}
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

// 교육적 태도 점검 4문항 — 문항은 고정, 선택과 설명만 저장한다.
function StanceSection({
  rows,
  canEdit,
  onSave,
}: {
  rows: RecordRowDTO[];
  canEdit: boolean;
  onSave: (vars: SaveRowVars) => void;
}) {
  const byOrder = new Map(rows.map((r) => [r.sortOrder, r]));
  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">교육적 태도 점검</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        팀이 함께 이야기하며 솔직하게 골라요. 설명은 한 줄이면 충분해요.
      </p>
      <div className="mt-4 space-y-3">
        {STANCE_QUESTIONS.map((question, index) => (
          <StanceItem
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

function StanceItem({
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
  onSave: (vars: SaveRowVars) => void;
}) {
  const [memo, setMemo] = useState(row?.col2 ?? "");
  useEffect(() => setMemo(row?.col2 ?? ""), [row?.col2]);
  const choice = row?.col1 ?? "";

  const save = (nextChoice: string, nextMemo: string) =>
    onSave({
      ...emptyRowVars("stance", index),
      id: row?.id ?? null,
      col1: nextChoice,
      col2: nextMemo,
      knownUpdatedAt: row?.updatedAt ?? "",
    });

  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="text-sm font-medium text-foreground">
        {index + 1}. {question}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {STANCE_CHOICES.map((c) => (
          <Button
            key={c}
            type="button"
            size="sm"
            variant={choice === c ? "default" : "outline"}
            disabled={!canEdit}
            className="rounded-full active:scale-95"
            onClick={() => save(c, memo)}
          >
            {choice === c && <Check className="h-3.5 w-3.5" />}
            {c}
          </Button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="예) 학생 이름 대신 번호만 쓰도록 바꿨어요. (선택)"
          disabled={!canEdit}
          className="rounded-xl bg-background"
        />
        {canEdit && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={memo === (row?.col2 ?? "")}
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

// 개인 후기와 소회 — 본인 것만 쓰고 고칠 수 있다.
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
  members: RecordMemberDTO[];
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
  const myMember = members.find((m) => m.usernameKey === myKey) ?? null;

  const [form, setForm] = useState({
    affiliation: "",
    role: "",
    q1: "",
    q2: "",
    promises: [] as string[],
    promiseDetail: "",
    spreadPlan: "",
  });

  useEffect(() => {
    setForm({
      affiliation: mine?.affiliation || myMember?.affiliation || "",
      role: mine?.role || myMember?.role || "",
      q1: mine?.q1 ?? "",
      q2: mine?.q2 ?? "",
      promises: mine?.promises ?? [],
      promiseDetail: mine?.promiseDetail ?? "",
      spreadPlan: mine?.spreadPlan ?? "",
    });
  }, [
    mine?.affiliation,
    mine?.role,
    mine?.q1,
    mine?.q2,
    mine?.promises,
    mine?.promiseDetail,
    mine?.spreadPlan,
    myMember?.affiliation,
    myMember?.role,
  ]);

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          postId,
          ...form,
          knownUpdatedAt: mine?.updatedAt ?? "",
          author: identity?.author ?? "",
          nicknamePassword: identity?.nicknamePassword ?? "",
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["record", postId] });
      toast.success("후기를 저장했어요.");
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

  const notWritten = members.filter(
    (m) => !reflections.some((r) => r.usernameKey === m.usernameKey),
  );

  const togglePromise = (item: string) =>
    setForm((prev) => ({
      ...prev,
      promises: prev.promises.includes(item)
        ? prev.promises.filter((p) => p !== item)
        : [...prev.promises, item],
    }));

  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">개인 후기와 소회</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        팀원 각자 하나씩 남겨요. 내 후기는 나만 고칠 수 있어요.
      </p>

      {isMember ? (
        <div className="mt-4 space-y-4 rounded-xl bg-muted/40 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ref-affiliation">소속</Label>
              <Input
                id="ref-affiliation"
                value={form.affiliation}
                placeholder="예) ○○초등학교 5학년"
                onChange={(e) => setForm((p) => ({ ...p, affiliation: e.target.value }))}
                className="rounded-xl bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-role">역할</Label>
              <Input
                id="ref-role"
                value={form.role}
                placeholder="예) 기획·문제 정의"
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                className="rounded-xl bg-background"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ref-q1">가장 기억에 남는 순간은 무엇인가요?</Label>
            <Textarea
              id="ref-q1"
              value={form.q1}
              placeholder="예) 학생이 직접 판별 이유를 설명하던 순간이 기억에 남아요."
              onChange={(e) => setForm((p) => ({ ...p, q1: e.target.value.slice(0, 3000) }))}
              rows={4}
              className="rounded-xl bg-background"
            />
            <p className="text-right text-xs text-muted-foreground">{form.q1.length}/3000</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ref-q2">배운 점과 아직 남은 질문은 무엇인가요?</Label>
            <Textarea
              id="ref-q2"
              value={form.q2}
              placeholder="예) 작은 도구도 수업 흐름을 바꿀 수 있다는 걸 배웠고, 평가와의 연결은 아직 고민이에요."
              onChange={(e) => setForm((p) => ({ ...p, q2: e.target.value.slice(0, 3000) }))}
              rows={4}
              className="rounded-xl bg-background"
            />
            <p className="text-right text-xs text-muted-foreground">{form.q2.length}/3000</p>
          </div>

          <div className="space-y-2">
            <Label>내가 지킬 약속</Label>
            <div className="flex flex-wrap gap-2">
              {PROMISE_ITEMS.map((item) => (
                <Button
                  key={item}
                  type="button"
                  size="sm"
                  variant={form.promises.includes(item) ? "default" : "outline"}
                  className="rounded-full active:scale-95"
                  onClick={() => togglePromise(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ref-promise-detail">약속을 어떻게 실천할 건가요?</Label>
            <Textarea
              id="ref-promise-detail"
              value={form.promiseDetail}
              placeholder="예) 학생 이름 대신 번호만 입력받도록 설계했어요."
              onChange={(e) =>
                setForm((p) => ({ ...p, promiseDetail: e.target.value.slice(0, 3000) }))
              }
              rows={3}
              className="rounded-xl bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ref-spread">학교와 동료에게 어떻게 나눌 계획인가요?</Label>
            <Textarea
              id="ref-spread"
              value={form.spreadPlan}
              placeholder="예) 학년 협의회에서 시연하고 사용법 안내지를 공유할 계획이에요."
              onChange={(e) =>
                setForm((p) => ({ ...p, spreadPlan: e.target.value.slice(0, 3000) }))
              }
              rows={3}
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
              <p className="text-sm font-medium text-foreground">
                {[r.username, r.affiliation, r.role].filter((v) => (v ?? "").trim()).join(" · ")}
              </p>
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
            {r.q1 && <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{r.q1}</p>}
            {r.q2 && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{r.q2}</p>
            )}
            {r.promises.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">약속: {r.promises.join(", ")}</p>
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
