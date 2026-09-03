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
    id: "growth",
    no: "04",
    name: "성장과 점검",
    title: "나의 성장과 점검",
    hint: "대표 경험 하나를 남기고, AI가 한 일과 내가 판단한 일을 구분해요.",
  },
  {
    id: "readme",
    no: "05",
    name: "README 출력",
    title: "README 출력",
    hint: "앞 단계에 입력한 내용이 개인 프로젝트용 README로 자동 정리됩니다.",
  },
  {
    id: "casebook",
    no: "06",
    name: "사례집 출력",
    title: "사례집 출력",
    hint: "입력한 내용을 A4 지면으로 조판했습니다. 인쇄 대화상자에서 PDF 저장을 선택할 수 있어요.",
  },
] as const;

export type GrowthStepId = (typeof GROWTH_STEP_META)[number]["id"];

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

/** HTML의 required 정의를 그대로 옮긴 단계별 필수 항목. */
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
};

const filled = (v: string | string[] | undefined) =>
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

/** 단계별 (작성 수 / 필수 수) */
export function growthStepProgress(data: GrowthRecordData, stepId: string) {
  const required = GROWTH_REQUIRED[stepId];
  if (!required) return { done: 1, total: 1, complete: true };
  const done = required.filter((path) => filled(valueOf(data, stepId, path))).length;
  return { done, total: required.length, complete: done === required.length };
}

/** 전체 완성도(%) */
export function growthCompletionPercent(data: GrowthRecordData) {
  const all = Object.entries(GROWTH_REQUIRED).flatMap(([section, fields]) =>
    fields.map((field) => valueOf(data, section, field)),
  );
  if (all.length === 0) return 0;
  return Math.round((all.filter(filled).length / all.length) * 100);
}
