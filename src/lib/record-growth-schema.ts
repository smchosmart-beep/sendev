// 성장형 활동기록(개인)의 단계·필드 정의.
// 라벨/안내문구/글자수/플레이스홀더는 제공된 프로토타입 HTML 문구를 그대로 사용한다.

export type GrowthFieldKey =
  | "projectName"
  | "oneLine"
  | "primaryUser"
  | "problemArea"
  | "resultType"
  | "problemText"
  | "evidence"
  | "solution"
  | "expectedChange"
  | "resultUrl"
  | "githubUrl"
  | "status"
  | "tools"
  | "difficulty"
  | "resolution"
  | "aiWork"
  | "humanCheck"
  | "privacy"
  | "educationCheck"
  | "promise"
  | "learned"
  | "nextPlan";

export type GrowthField = {
  key: GrowthFieldKey;
  label: string;
  type: "text" | "url" | "textarea" | "select" | "radio";
  placeholder?: string;
  options?: string[];
  max: number;
  required: boolean;
  full?: boolean;
};

export const GROWTH_PRIMARY_USERS = ["교사", "학생", "교사와 학생", "학부모", "학교 구성원"];
export const GROWTH_PROBLEM_AREAS = ["수업·평가", "생활교육·상담", "행정·업무 효율화", "학교 소통·협업"];
export const GROWTH_RESULT_TYPES = ["웹앱", "모바일앱", "챗봇·AI 도구", "자동화 도구", "수업자료·콘텐츠"];
export const GROWTH_STATUSES = ["아이디어", "시연 가능", "바로 사용 가능"];
export const GROWTH_PRIVACY_CHOICES = [
  "개인정보를 처리하지 않음",
  "개인정보를 처리함",
  "담당자 확인 필요",
];
export const GROWTH_ETHICS_PRINCIPLES = [
  "학생 성장 최우선",
  "개인정보·데이터 보호",
  "책임과 출처 존중",
  "안전한 실험과 검증",
  "역할 경계 인식",
  "공공성",
  "투명성 및 설명 가능성",
];

export const GROWTH_REPEATER_MAX = 3;
export const GROWTH_REPEATER_ITEM_MAX = 160;

// 2MB 원본 제한 안내(업로드 전 클라이언트 검증용).
export const GROWTH_HERO_MAX_BYTES = 2 * 1024 * 1024;

export const GROWTH_STEP_META = [
  {
    id: "project",
    no: "01",
    name: "나의 프로젝트",
    title: "나의 프로젝트",
    hint: "누구를 위해 무엇을 만들었는지 한눈에 보이도록 정리해요.",
  },
  {
    id: "problem",
    no: "02",
    name: "문제와 해결",
    title: "문제와 해결 아이디어",
    hint: "문제를 먼저 또렷하게 적고, 그 문제에 맞는 해결 방법을 이어서 적어요.",
  },
  {
    id: "result",
    no: "03",
    name: "결과물",
    title: "내가 만든 결과물",
    hint: "기술 설명보다 실제로 무엇이 작동하고 어떻게 사용하는지가 보이도록 정리해요.",
  },
  {
    id: "review",
    no: "04",
    name: "검토 및 개선",
    title: "검토 및 개선",
    hint: "내 앱을 세 번 점검합니다. 자기 점검 → AI 점검 → 동료 점검 순서로 진행하고, 점검마다 무엇을 어떻게 고쳤는지 남깁니다.",
  },
  {
    id: "growth",
    no: "05",
    name: "성찰과 성장",
    title: "나의 성찰과 성장",
    hint: "대표 경험 하나를 남기고, AI가 한 일과 내가 판단한 일을 구분해요.",
  },
  {
    id: "readme",
    no: "06",
    name: "README 출력",
    title: "README 출력",
    hint: "앞 단계에 입력한 내용이 개인 프로젝트용 README로 자동 정리됩니다.",
  },
  {
    id: "casebook",
    no: "07",
    name: "사례집 출력",
    title: "성장 사례집 출력",
    hint: "입력한 내용을 A4 지면으로 조판했습니다. 인쇄 대화상자에서 PDF 저장을 선택할 수 있어요.",
  },
] as const;

export type GrowthStepId = (typeof GROWTH_STEP_META)[number]["id"];

/* ------------------------------- 01 · 프로젝트 ------------------------------ */

export const GROWTH_PROJECT_FIELDS: GrowthField[] = [
  {
    key: "projectName",
    label: "프로젝트명",
    type: "text",
    placeholder: "예) 수업 질문 카드",
    max: 60,
    required: true,
  },
  {
    key: "oneLine",
    label: "한 줄 소개",
    type: "text",
    placeholder: "누구의 어떤 문제를 해결하는지 적어 주세요.",
    max: 100,
    required: true,
  },
  {
    key: "primaryUser",
    label: "주 사용자",
    type: "select",
    options: GROWTH_PRIMARY_USERS,
    max: 40,
    required: true,
  },
  {
    key: "problemArea",
    label: "문제 영역",
    type: "select",
    options: GROWTH_PROBLEM_AREAS,
    max: 40,
    required: true,
  },
  {
    key: "resultType",
    label: "결과물 형태",
    type: "select",
    options: GROWTH_RESULT_TYPES,
    max: 40,
    required: true,
    full: true,
  },
];

export const GROWTH_PROBLEM_FIELDS: GrowthField[] = [
  {
    key: "problemText",
    label: "어떤 문제를 해결하고 싶나요?",
    type: "textarea",
    placeholder: "수업이나 업무에서 반복해서 겪는 불편을 적어 주세요.",
    max: 240,
    required: true,
    full: true,
  },
  {
    key: "evidence",
    label: "그렇게 생각한 이유나 경험은 무엇인가요?",
    type: "textarea",
    placeholder: "직접 겪은 장면이나 들은 의견 하나면 충분해요.",
    max: 240,
    required: false,
    full: true,
  },
  {
    key: "solution",
    label: "어떤 방법으로 해결하려고 했나요?",
    type: "textarea",
    placeholder: "만들고자 한 기능이나 방법을 적어 주세요.",
    max: 240,
    required: true,
    full: true,
  },
  {
    key: "expectedChange",
    label: "완성되면 무엇이 달라지기를 기대하나요?",
    type: "textarea",
    placeholder: "사용자의 행동이나 시간이 어떻게 달라지는지 적어 주세요.",
    max: 240,
    required: true,
    full: true,
  },
];

export const GROWTH_RESULT_FIELDS: GrowthField[] = [
  {
    key: "resultUrl",
    label: "배포 주소",
    type: "url",
    placeholder: "https://",
    max: 220,
    required: false,
  },
  {
    key: "status",
    label: "완성 상태",
    type: "select",
    options: GROWTH_STATUSES,
    max: 40,
    required: true,
  },
  {
    key: "githubUrl",
    label: "GitHub 저장소 주소",
    type: "url",
    placeholder: "https://github.com/...",
    max: 220,
    required: false,
  },
  {
    key: "tools",
    label: "사용한 도구",
    type: "text",
    placeholder: "쉼표로 구분해 주세요.",
    max: 160,
    required: false,
    full: true,
  },
];

export const GROWTH_GROWTH_FIELDS_A: GrowthField[] = [
  {
    key: "difficulty",
    label: "가장 어려웠던 점",
    type: "textarea",
    placeholder: "한 가지 장면만 적어 주세요.",
    max: 260,
    required: true,
  },
  {
    key: "resolution",
    label: "어떻게 해결했나요?",
    type: "textarea",
    placeholder: "시도하거나 바꾼 방법을 적어 주세요.",
    max: 260,
    required: true,
  },
  {
    key: "aiWork",
    label: "AI에 맡긴 일",
    type: "textarea",
    placeholder: "AI를 사용하지 않았다면 그렇게 적어 주세요.",
    max: 240,
    required: false,
  },
  {
    key: "humanCheck",
    label: "내가 직접 판단하고 확인한 일",
    type: "textarea",
    placeholder: "사람이 최종 결정한 내용을 적어 주세요.",
    max: 260,
    required: true,
  },
];

export const GROWTH_EDUCATION_FIELD: GrowthField = {
  key: "educationCheck",
  label: "교육적으로 꼭 확인한 내용",
  type: "textarea",
  placeholder: "학생의 배움과 안전을 위해 확인한 점을 적어 주세요.",
  max: 260,
  required: false,
  full: true,
};

export const GROWTH_GROWTH_FIELDS_B: GrowthField[] = [
  {
    key: "promise",
    label: "나의 실천 약속",
    type: "textarea",
    placeholder: "앞으로 지킬 약속을 한 문장으로 적어 주세요.",
    max: 180,
    required: false,
    full: true,
  },
  {
    key: "learned",
    label: "새롭게 할 수 있게 된 것",
    type: "textarea",
    placeholder: "만들기 전과 비교해 달라진 점을 적어 주세요.",
    max: 240,
    required: true,
  },
  {
    key: "nextPlan",
    label: "다음에 보완하고 싶은 것",
    type: "textarea",
    placeholder: "다음 행동이 보이도록 적어 주세요.",
    max: 240,
    required: true,
  },
];

export const GROWTH_ALL_FIELDS: GrowthField[] = [
  ...GROWTH_PROJECT_FIELDS,
  ...GROWTH_PROBLEM_FIELDS,
  ...GROWTH_RESULT_FIELDS,
  ...GROWTH_GROWTH_FIELDS_A,
  GROWTH_EDUCATION_FIELD,
  ...GROWTH_GROWTH_FIELDS_B,
];

export const GROWTH_FIELD_MAX = new Map<string, number>(
  GROWTH_ALL_FIELDS.map((f) => [f.key as string, f.max]),
);

/* --------------------------- 04 · 검토 및 개선 ---------------------------- */

// 1차 자기 점검 체크리스트. 각 줄은 01~03에 적은 내용을 인용해 보여 준다.
export type GrowthSelfCheckKey =
  | "oneLiner"
  | "firstScreen"
  | "feature1"
  | "feature2"
  | "feature3"
  | "flow";

export const GROWTH_SELF_CHECK_ITEMS: { key: GrowthSelfCheckKey; text: string }[] = [
  { key: "oneLiner", text: "한 줄 소개대로 동작하는가" },
  { key: "firstScreen", text: "주 사용자가 설명 없이 첫 화면에서 할 일을 아는가" },
  { key: "feature1", text: "핵심 기능 ①" },
  { key: "feature2", text: "핵심 기능 ②" },
  { key: "feature3", text: "핵심 기능 ③" },
  { key: "flow", text: "사용 흐름 1 → 2 → 3이 끊기지 않고 통과되는가" },
];

export type GrowthCheckValue = "" | "done" | "screenOnly" | "no";
export const GROWTH_CHECK_CHOICES: { value: Exclude<GrowthCheckValue, "">; label: string }[] = [
  { value: "done", label: "됨" },
  { value: "screenOnly", label: "화면만" },
  { value: "no", label: "안 됨" },
];

export type GrowthAngleKey = "normal" | "invalid" | "boundary" | "storage" | "privacy" | "failure";
export const GROWTH_ANGLE_ITEMS: { key: GrowthAngleKey; name: string; desc: string }[] = [
  { key: "normal", name: "정상", desc: "핵심 흐름이 처음부터 끝까지 도는가" },
  { key: "invalid", name: "잘못된 입력", desc: "빈 값이나 이상한 형식을 넣으면 막아 주는가" },
  { key: "boundary", name: "경계값", desc: "0개일 때, 1개일 때, 아주 많을 때도 되는가" },
  { key: "storage", name: "상태·저장", desc: "새로고침하거나 다시 들어와도 남아 있는가" },
  { key: "privacy", name: "권한·개인정보", desc: "보이면 안 되는 것이 보이지는 않는가" },
  { key: "failure", name: "실패 상황", desc: "안 될 때 사용자가 알아들을 수 있게 알려 주는가" },
];

export type GrowthAngleValue = "" | "checked" | "issue" | "na";
export const GROWTH_ANGLE_CHOICES: { value: Exclude<GrowthAngleValue, "">; label: string }[] = [
  { value: "checked", label: "확인함" },
  { value: "issue", label: "문제 있음" },
  { value: "na", label: "해당 없음" },
];

// 2차 AI 점검: 공통 3개 + 문제 영역별 2개.
export const GROWTH_AI_COMMON_QUESTIONS = [
  "이 앱을 처음 여는 사람이 3초 안에 할 일을 알 수 있나요? 무엇을 보고 아나요?",
  "학생(또는 주 사용자)이 잘못 입력하면 화면은 무엇을 보여 주나요?",
  "지금 받고 있는 입력값 중 없어도 되는 것은 무엇인가요?",
];

export const GROWTH_AI_AREA_QUESTIONS: Record<string, string[]> = {
  "수업·평가": [
    "이 결과를 교사가 그대로 성적·기록에 쓰면 무엇이 위험한가요?",
    "학생이 AI 답을 그대로 베끼면 어떻게 알 수 있나요?",
  ],
  "생활교육·상담": [
    "학생이 적은 내용은 누가 볼 수 있고 언제 지워지나요?",
    "위기 신호가 들어오면 앱은 무엇을 하나요?",
  ],
  "행정·업무 효율화": [
    "이 앱이 없을 때 걸리던 시간과 지금 걸리는 시간을 숫자로 말할 수 있나요?",
    "학교 공용 계정으로 써도 되나요, 개인 계정이 필요한가요?",
  ],
  "학교 소통·협업": [
    "알림을 받지 못한 사람은 어떻게 알게 되나요?",
    "잘못 보낸 공지는 되돌릴 수 있나요?",
  ],
};

export function growthAiQuestions(problemArea: string): string[] {
  return [...GROWTH_AI_COMMON_QUESTIONS, ...(GROWTH_AI_AREA_QUESTIONS[problemArea] ?? GROWTH_AI_AREA_QUESTIONS["수업·평가"]!)];
}

export const GROWTH_ERROR_GUIDE: { name: string; desc?: string }[] = [
  { name: "재현" },
  { name: "증거 확인", desc: "화면·오류 메시지·실행 기록" },
  { name: "분류", desc: "화면·코드·배포·데이터" },
  { name: "최소 수정", desc: "한 가지만" },
  { name: "재검증", desc: "잘 되던 것까지" },
];

/* -------------------------------- 수정 기록 ------------------------------- */

export type GrowthReviewKind = "self" | "ai" | "peer";

export const GROWTH_FIX_KIND_LABELS: Record<GrowthReviewKind, string> = {
  self: "1차 · 자기 점검",
  ai: "2차 · AI 점검",
  peer: "3차 · 동료 점검",
};

export type GrowthFixType = "" | "today" | "later" | "no";
export const GROWTH_FIX_TYPES: { value: Exclude<GrowthFixType, "">; label: string }[] = [
  { value: "today", label: "오늘 고침" },
  { value: "later", label: "다음에 고침" },
  { value: "no", label: "고치지 않음" },
];

export type GrowthFix = {
  what: string; // 고친 것 · 무엇을 (120자)
  how: string; // 어떻게 고쳤나 · 전 → 후 (200자)
  skipped: string; // 고치지 않기로 한 것과 이유 (200자)
  type: GrowthFixType; // 분류
};

export const GROWTH_FIX_MAX = { what: 120, how: 200, skipped: 200 } as const;

export const GROWTH_EMPTY_FIX: GrowthFix = { what: "", how: "", skipped: "", type: "" };

export function growthFixDone(fix: GrowthFix | undefined): boolean {
  if (!fix) return false;
  return Boolean(fix.what.trim() && fix.how.trim() && fix.type);
}

/* -------------------------------- 검토 데이터 ------------------------------ */

export type GrowthSelfReview = {
  checks: Record<GrowthSelfCheckKey, GrowthCheckValue>;
  angles: Record<GrowthAngleKey, GrowthAngleValue>;
  fix: GrowthFix;
};

export type GrowthAiQuestion = { q: string; a: string; unanswered: boolean };
export type GrowthAiReview = {
  revealed: number; // '질문 받기'로 열린 질문 수 (0~5)
  questions: GrowthAiQuestion[];
  fix: GrowthFix;
};

export type GrowthPeerAssignment = { postId: string; postNo: number; author: string };
export type GrowthGivenFeedback = { toPostId: string; to: string; expected: string; actual: string; sent: boolean };
export type GrowthReceivedFeedback = {
  id: string;
  fromPostId: string;
  fromName: string;
  expected: string;
  actual: string;
  receiverType: string;
  createdAt: string;
};
export type GrowthPeerReview = {
  assigned: GrowthPeerAssignment[];
  given: GrowthGivenFeedback[];
  fix: GrowthFix;
};

export type GrowthReviewData = {
  self: GrowthSelfReview;
  ai: GrowthAiReview;
  peer: GrowthPeerReview;
};

export const GROWTH_EMPTY_REVIEW: GrowthReviewData = {
  self: {
    checks: { oneLiner: "", firstScreen: "", feature1: "", feature2: "", feature3: "", flow: "" },
    angles: { normal: "", invalid: "", boundary: "", storage: "", privacy: "", failure: "" },
    fix: GROWTH_EMPTY_FIX,
  },
  ai: {
    revealed: 0,
    questions: [],
    fix: GROWTH_EMPTY_FIX,
  },
  peer: {
    assigned: [],
    given: [],
    fix: GROWTH_EMPTY_FIX,
  },
};

/** 완성 상태 제안 — 체크리스트 결과로 계산만 하고 03 값은 바꾸지 않는다. */
export function growthStatusSuggestion(review: GrowthReviewData): string {
  const checks = Object.values(review.self.checks);
  if (checks.includes("no")) return "아이디어";
  if (
    [review.self.checks.feature1, review.self.checks.feature2, review.self.checks.feature3].includes(
      "screenOnly",
    )
  )
    return "시연 가능";
  if (checks.length > 0 && checks.every((v) => v === "done")) return "바로 사용 가능 후보";
  return "시연 가능";
}

/** 세 점검 중 수정 기록을 완성한 수. */
export function growthReviewDoneCount(review: GrowthReviewData): number {
  return [review.self.fix, review.ai.fix, review.peer.fix].filter(growthFixDone).length;
}

/** 05 '다음에 보완하고 싶은 것'으로 이어 붙일 항목. */
export function growthLaterItems(review: GrowthReviewData, received: GrowthReceivedFeedback[]): string[] {
  const items: string[] = [];
  for (const fix of [review.self.fix, review.ai.fix, review.peer.fix]) {
    if (fix.type === "later" && fix.what.trim()) items.push(fix.what.trim());
  }
  for (const r of received) {
    if (r.receiverType === "later") {
      const text = `${r.expected} — ${r.actual}`.trim();
      if (text.replace(/[—\s]/g, "")) items.push(text);
    }
  }
  return items;
}

/* ------------------------------ 필수/진행률 ------------------------------- */

/** HTML의 required 정의를 그대로 옮긴 단계별 필수 항목. review는 n/3 점검으로 별도 계산. */
export const GROWTH_REQUIRED: Record<string, string[]> = {
  project: ["projectName", "oneLine", "primaryUser", "problemArea", "resultType"],
  problem: ["problemText", "solution", "expectedChange"],
  result: ["status", "features.0", "flow.0"],
  growth: ["difficulty", "resolution", "humanCheck", "privacy", "learned", "nextPlan"],
};

export type GrowthRecordData = Record<GrowthFieldKey, string> & {
  features: string[];
  flow: string[];
  ethics: string[];
  heroImageUrl: string;
  updatedBy: string;
  updatedAt: string;
  review: GrowthReviewData;
};

export const GROWTH_EMPTY: GrowthRecordData = {
  ...(Object.fromEntries(GROWTH_ALL_FIELDS.map((f) => [f.key, ""])) as Record<
    GrowthFieldKey,
    string
  >),
  features: [],
  flow: [],
  ethics: [],
  heroImageUrl: "",
  updatedBy: "",
  updatedAt: "",
  review: GROWTH_EMPTY_REVIEW,
};

const filled = (v: string | string[]) =>
  Array.isArray(v) ? v.some((x) => (x ?? "").trim().length > 0) : (v ?? "").trim().length > 0;

function valueOf(data: GrowthRecordData, section: string, path: string): string | string[] {
  if (path.includes(".")) {
    const [name, index] = path.split(".");
    const arr = (data[name as "features" | "flow"] ?? []) as string[];
    return arr[Number(index)] ?? "";
  }
  if (section === "result" && (path === "features" || path === "flow")) {
    return data[path];
  }
  if (path === "privacy") return data.privacy;
  return (data[path as GrowthFieldKey] ?? "") as string;
}

/** 단계별 (작성 수 / 필수 수). review 단계는 n/3 점검 기준. */
export function growthStepProgress(data: GrowthRecordData, stepId: string) {
  if (stepId === "review") {
    const done = growthReviewDoneCount(data.review ?? GROWTH_EMPTY_REVIEW);
    return { done, total: 3, complete: done === 3 };
  }
  const required = GROWTH_REQUIRED[stepId];
  if (!required) return { done: 1, total: 1, complete: true };
  const done = required.filter((path) => filled(valueOf(data, stepId, path) as string | string[])).length;
  return { done, total: required.length, complete: done === required.length };
}

/** 전체 완성도(%) */
export function growthCompletionPercent(data: GrowthRecordData) {
  const parts: { done: number; total: number }[] = Object.keys(GROWTH_STEP_META.map(() => 0)).length
    ? []
    : [];
  void parts;
  const entries: { done: number; total: number }[] = [
    growthStepProgress(data, "review"),
    ...Object.entries(GROWTH_REQUIRED).map(([section, fields]) => ({
      done: fields.filter((field) => filled(valueOf(data, section, field))).length,
      total: fields.length,
    })),
  ];
  const total = entries.reduce((s, e) => s + e.total, 0);
  if (total === 0) return 0;
  return Math.round((entries.reduce((s, e) => s + e.done, 0) / total) * 100);
}
