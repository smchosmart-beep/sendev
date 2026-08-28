// 도전형 활동기록 입력 구조(단계·항목 정의). 클라이언트/서버 양쪽에서 함께 쓴다.

export const RECORD_ROW_KINDS = [
  "process",
  "devlog",
  "feature",
  "flow",
  "limit",
  "plan",
  "maker",
  "decision",
  "stuck",
  "stance",
  "ai_use",
  "ai_error",
  "privacy",
] as const;

export type RecordRowKindName = (typeof RECORD_ROW_KINDS)[number];

/** 서술형이라 2000자까지 허용하는 종류 */
export const LONG_ROW_KINDS: RecordRowKindName[] = [
  "process",
  "devlog",
  "decision",
  "stuck",
  "stance",
  "ai_use",
  "ai_error",
  "privacy",
  "limit",
  "plan",
];

export const PROBLEM_AREAS = [
  "수업·평가·피드백",
  "생활교육·상담",
  "행정·업무 효율화",
  "학교 소통·협업",
];

export const MAIN_USERS = ["교사", "학생", "교사와 학생", "학부모", "학교 구성원"];

export const OUTPUT_TYPES = [
  "웹앱",
  "모바일앱",
  "데스크탑 앱",
  "챗봇·AI 도구",
  "자동화 도구",
  "수업자료·콘텐츠",
  "/skill",
];

export const DEPLOY_STATUSES = [
  "Live — 바로 사용 가능",
  "Beta — 작동하지만 검증 중",
  "Demo — 시연용",
];

export const CHANGE_TYPES = ["관찰 — 실제 확인함", "기대 — 현장 검증 전"];

export const PRIVACY_STATUSES = [
  "처리하지 않음",
  "처리함",
  "판단이 어려워 담당자 확인 필요",
];

export const PROCESS_SUBTYPES = [
  "1. 페르소나",
  "2. 고객 여정 맵",
  "3. 인터뷰 기록",
  "4. 회고&문제정의",
  "5. 종이 프로토타입 영상 콘티",
];

export const STANCE_QUESTIONS = [
  "평가·추천·피드백을 프로그램이 대신 확정하지 않게 했나요?",
  "학생이나 교사의 생각을 대신하지 않게 했나요?",
  "저장·전달·제출 전에 사람이 확인할 수 있나요?",
  "기기·계정·조작 문제로 참여에서 빠지는 사람이 없게 했나요?",
];

export const STANCE_CHOICES = [
  "원래 그렇게 했어요",
  "점검하다 고쳤어요",
  "아직이에요",
  "우리 프로그램엔 해당 없어요",
];

export const AI_USE_TYPES = ["서비스 기능", "개발 과정"];

export const PROMISE_ITEMS = [
  "학생 성장 최우선",
  "개인정보·데이터 보호",
  "책임과 출처 존중",
  "안전한 실험과 검증",
  "역할 경계 인식",
  "공공성",
  "투명성 및 설명 가능성",
];

export interface RowSectionDef {
  kind: RecordRowKindName;
  title: string;
  hint: string;
  /** 각 열의 라벨. 빈 문자열이면 사용하지 않는 열 */
  cols: string[];
  /** 각 열의 예시 문구(열 순서와 1:1). 저장되지 않는 안내용 */
  placeholders?: string[];
  /** 여러 줄 입력으로 보여줄 열 인덱스 */
  longCols?: number[];
  /** 이 열은 텍스트 대신 '관련 링크' 입력으로 렌더링한다 */
  linkCol?: number;
  /** 이 열은 텍스트 대신 '관련 파일' 첨부 UI로 렌더링한다 (JSON 저장) */
  fileCol?: number;
  addLabel: string;
}

/** 탭(subtype)별 전용 입력 양식. 라벨이 빈 열은 이 양식에서 사용하지 않는다(값은 보존만 됨). */
export interface RowTemplate {
  cols: string[];
  placeholders?: string[];
  longCols?: number[];
  linkCol?: number;
  /** 첨부(JSON 저장) 열 목록 */
  fileCols?: number[];
  /** 첨부 중 이미지 미리보기를 보여줄 열 목록 */
  imageCols?: number[];
  /**
   * 화면·출력에서 열을 보여줄 순서(열 인덱스 배열).
   * 저장 열 인덱스는 그대로 두고 표시 순서만 바꾼다. 없으면 0..5 순서.
   */
  displayOrder?: number[];
  /** 이 탭은 여러 건(팀원별)을 추가할 수 있다 */
  multi?: boolean;
  /** 새 행 추가 버튼에 쓸 문구 (multi 탭에서만 사용) */
  addLabel?: string;
}

/** 탭별 안내 템플릿 (입력값이 아닌 참고용). subtype → 열 인덱스 → {label, text} */
export interface TemplateNoticeDef {
  label: string;
  text: string;
  /** 복사되지 않는 참고 팁 한 줄 */
  tip?: string;
}

const PERSONA_TEMPLATE = `[기본 정보]
- 이름:
- 나이 / 신분:
- 한 줄 소개:
- 하루 일과 (문제 상황과 관련된 부분 위주):

[문제 프레임 - 4가지 질문]
- When : 언제 이 문제가 발생하나요?
- What : 구체적으로 무엇이 문제인가요?
- Why : 왜 아직 해결되지 않았나요? (그 사람은 지금 어떻게 버티고 있나요?)
- Impact : 이 문제가 해결되면 이 사람의 하루가 어떻게 달라지나요?`;

const JOURNEY_TEMPLATE = `페르소나 이름:

여정의 범위: (______부터 ______까지)

[단계 1]
- 행동:
- 생각/속마음:
- 감정(1~5):
- 페인 포인트(있으면 ★):

[단계 2]
- 행동:
- 생각/속마음:
- 감정(1~5):
- 페인 포인트(있으면 ★):

[단계 3]
- 행동:
- 생각/속마음:
- 감정(1~5):
- 페인 포인트(있으면 ★):

(단계는 필요한 만큼 추가)

감정이 가장 낮은 단계: ___단계
→ 우리 팀이 공략할 지점:`;

const INTERVIEW_TEMPLATE = `[인터뷰 개요]
- 팀명:
- 인터뷰 대상: (누구인지 + 왜 이 사람을 골랐는지)
- 일시 / 방식: (대면, 전화, 서면 등)
- 확인하려는 가설: (한 문장)

[질문과 답변]
Q1.
A1.

Q2.
A2.

Q3.
A3.

[관찰 메모]
- 답변 외에 눈에 띈 것: (표정, 망설임, 예상 밖의 반응 등)
- 그대로 옮겨 적고 싶은 한마디: "        "`;

const REFLECT_TEMPLATE = `[회고]
1) 가설과 일치했던 내용
-
-

2) 가설과 불일치했던 내용
-
-

3) 새로 알게 된 내용
-
-

[문제 재정의]
우리는 처음에 「        」가 문제라고 생각했다.
하지만 인터뷰에서 「        」를 알게 되었다.
그래서 우리는 문제를 「        」로 재정의한다.`;

const STORYBOARD_TEMPLATE = `[콘티]
1. (0:00~) 첫 화면 - 페르소나와 문제 한 줄 소개
2. 핵심 기능 화면 - 사용자가 무엇을 입력/선택하는지
3. 결과 화면 - 무엇이 달라지는지
4. (~1:30) 마무리 - "그래서 OO의 문제가 이렇게 해결됩니다"`;

export const PROCESS_TEMPLATE_NOTICES: Record<string, Record<number, TemplateNoticeDef>> = {
  "1. 페르소나": {
    4: {
      label: "템플릿 · 페르소나",
      text: PERSONA_TEMPLATE,
      tip: "팀원이 아닌 사람이 읽고 “아, 이런 사람 진짜 있지”라고 말할 수 있으면 통과입니다.",
    },
  },
  "2. 고객 여정 맵": {
    5: {
      label: "템플릿 · 고객 여정 맵",
      text: JOURNEY_TEMPLATE,
      tip: "감정 점수가 전 단계에서 비슷하면 여정을 더 잘게 쪼개 보세요. 감정이 뚝 떨어지는 순간이 문제의 위치입니다.",
    },
  },
  "3. 인터뷰 기록": {
    0: {
      label: "템플릿 · 인터뷰 기록",
      text: INTERVIEW_TEMPLATE,
      tip: "질문은 3~7개 권장. 유도 질문 대신 “최근에 ~했던 경험을 이야기해 주세요”처럼 경험을 묻는 질문으로 만드세요. 인터뷰 1건당 1개씩 작성합니다.",
    },
  },
  "4. 회고&문제정의": {
    0: {
      label: "템플릿 · 회고와 문제 재정의",
      text: REFLECT_TEMPLATE,
      tip: "불일치와 새로 알게 된 사실이 하나도 없다면 인터뷰가 부족했다는 신호입니다.",
    },
  },
  "5. 종이 프로토타입 영상 콘티": {
    0: {
      label: "템플릿 · 영상 콘티",
      text: STORYBOARD_TEMPLATE,
      tip: "영상은 1분 30초 이내, 유튜브 업로드(일부공개 권장) 후 링크를 제출합니다.",
    },
  },
};

/** 문제 정의 과정(process) 탭별 양식. 없으면 기본 양식을 쓴다. */
export const PROCESS_SUBTYPE_TEMPLATES: Record<string, RowTemplate> = {
  "1. 페르소나": {
    cols: ["", "", "", "", "페르소나 이미지", ""],
    fileCols: [4],
    imageCols: [4],
    displayOrder: [4],
  },

  "2. 고객 여정 맵": {
    cols: ["", "", "", "", "", "고객 여정 맵 이미지"],
    fileCols: [5],
    imageCols: [5],
    displayOrder: [5],
  },

  "3. 인터뷰 기록": {
    cols: ["인터뷰 개요", "질문과 답변", "관찰 메모", "", "", ""],
    placeholders: [
      "예) 팀명: 배수탐정 / 대상: 5학년 담임 김○○ 선생님(배수 단원을 최근 지도) / 일시·방식: 8/21 대면 / 가설: 학생들은 7의 배수 판별에서 가장 막힌다",
      "예) Q1. 최근에 배수 판별을 지도했던 경험을 이야기해 주세요.\nA1. 3의 배수는 금방 하는데 7은 그냥 나눠 보라고 했어요.",
      "예) 7의 배수 이야기를 할 때 잠깐 망설이셨다. “사실 저도 방법이 없어요”라는 한마디가 인상적이었다.",
      "",
      "",
      "",
    ],
    longCols: [0, 1, 2],
    fileCols: [],
    imageCols: [],
    multi: true,
    addLabel: "인터뷰 기록 추가",
  },

  "4. 회고&문제정의": {
    cols: [
      "가설과 일치했던 내용",
      "가설과 불일치했던 내용",
      "새로 알게 된 내용",
      "문제 재정의",
      "관련 링크",
      "관련 파일",
    ],
    placeholders: [
      "예) 인터뷰 전 가정했던 '학생들이 7의 배수 판별을 어려워한다'는 가설이 맞았어요.",
      "예) 예상과 달리 4의 배수도 '끝 두 자리'만 보고 넘어가는 경우가 많았어요.",
      "예) 학생들이 직접 만든 암기법을 서로 가르쳐 주는 과정에서 개념이 더 명확해졌어요.",
      "예) 우리는 처음에 「7의 배수 판별법을 모른다」가 문제라고 생각했다. 하지만 인터뷰에서 「교사도 설명할 방법이 없다」를 알게 되었다. 그래서 우리는 문제를 「교사가 바로 쓸 수 있는 판별 설명 도구가 없다」로 재정의한다.",
      "예) https://docs.google.com/document/d/... (회의록 링크)",
      "",
    ],
    longCols: [0, 1, 2, 3],
    linkCol: 4,
    fileCols: [5],
    imageCols: [],
  },

  "5. 종이 프로토타입 영상 콘티": {
    cols: ["", "", "", "종이 프로토타입 유튜브 영상 링크", "", ""],
    placeholders: ["", "", "", "예) https://youtu.be/xxxxxxxx", "", ""],
    longCols: [],
    linkCol: 3,
    fileCols: [],
    imageCols: [],
    displayOrder: [3],
  },
};

/** 행의 종류·탭에 맞는 양식을 돌려준다. */
export function rowTemplate(kind: string, subtype?: string | null): RowTemplate {
  if (kind === "process" && subtype && PROCESS_SUBTYPE_TEMPLATES[subtype]) {
    return PROCESS_SUBTYPE_TEMPLATES[subtype];
  }
  const def = ROW_SECTION_DEFS[kind];
  return {
    cols: def?.cols ?? [],
    placeholders: def?.placeholders,
    longCols: def?.longCols,
    linkCol: def?.linkCol,
    fileCols: def?.fileCol === undefined ? [] : [def.fileCol],
    imageCols: [],
  };
}


export const ROW_SECTION_DEFS: Record<string, RowSectionDef> = {
  process: {
    kind: "process",
    title: "문제 정의 과정 기록",
    hint: "회의·인터뷰 기록을 종류별로 남겨요.",
    cols: ["언제·어디서", "무엇을 나눴나요?", "그래서 정한 것", "관련 링크", "관련 파일"],
    placeholders: [
      "예) 4/12 방과후 교실",
      "예) 5학년 학생들이 배수 판별에서 자주 틀리는 지점을 이야기했어요.",
      "예) 3의 배수 판별 연습을 먼저 만들기로 했어요.",
      "예) https://docs.google.com/document/d/... (회의록 링크)",
      "",
    ],
    longCols: [1, 2],
    linkCol: 3,
    fileCol: 4,
    addLabel: "그 밖의 문제 정의 메모 추가",

  },
  devlog: {
    kind: "devlog",
    title: "개발 과정 자유기록",
    hint: "개발하며 겪은 일과 해결 방법을 자유롭게 쌓아요.",
    cols: ["날짜", "무슨 일이 있었나", "어떻게 해결했나"],
    placeholders: [
      "예) 4/20",
      "예) 정답 확인 버튼을 눌러도 화면이 바뀌지 않았어요.",
      "예) 상태 저장 방식을 바꾸고 다시 확인했어요.",
    ],
    longCols: [1, 2],
    addLabel: "개발 기록 추가",
  },
  feature: {
    kind: "feature",
    title: "핵심 기능",
    hint: "이 결과물이 실제로 해 주는 일을 한 줄씩 적어요.",
    cols: ["기능명", "한 줄 설명"],
    placeholders: ["예) 배수 판별 연습", "예) 숫자를 입력하면 판별 과정을 단계별로 보여 줘요."],
    addLabel: "기능 행 추가",
  },
  flow: {
    kind: "flow",
    title: "사용 흐름",
    hint: "사용자 또는 도구가 하는 일을 단계 순서대로 적어요.",
    cols: ["사용자 또는 도구가 하는 일"],
    placeholders: ["예) 학생이 연습할 배수(3·4·9)를 고른다"],
    addLabel: "사용 단계 추가",
  },
  limit: {
    kind: "limit",
    title: "현재 한계",
    hint: "아직 못 한 것, 아쉬운 점을 솔직하게 적어요.",
    cols: ["한계 내용"],
    placeholders: ["예) 아직 3·4·9의 배수만 다루고 7의 배수는 지원하지 않아요."],
    longCols: [0],
    addLabel: "현재 한계 행 추가",
  },
  plan: {
    kind: "plan",
    title: "다음 계획",
    hint: "이어서 하고 싶은 일을 적어요.",
    cols: ["계획 내용"],
    placeholders: ["예) 학생별 오답 기록을 모아 교사가 볼 수 있게 만들고 싶어요."],
    longCols: [0],
    addLabel: "다음 계획 행 추가",
  },
  maker: {
    kind: "maker",
    title: "제작자와 담당",
    hint: "누가 무엇을 맡았는지 적어요.",
    cols: ["이름", "역할", "담당한 부분"],
    placeholders: ["예) 김수학", "예) 기획·문제 정의", "예) 화면 구성과 문항 설계"],
    addLabel: "제작자 행 추가",
  },
  decision: {
    kind: "decision",
    title: "구현하며 바꾼 중요한 판단",
    hint: "처음 생각과 달라진 결정을 남겨요.",
    cols: ["처음 결정", "바꾼 결정", "바꾼 이유", "바꾼 뒤 결과"],
    placeholders: [
      "예) 정답만 알려 주기",
      "예) 판별 과정을 함께 보여 주기",
      "예) 학생들이 이유를 모른 채 외우기만 했어요.",
      "예) 왜 배수인지 설명하는 학생이 늘었어요.",
    ],
    longCols: [2, 3],
    addLabel: "판단 행 추가",
  },
  stuck: {
    kind: "stuck",
    title: "막혔던 순간",
    hint: "막힌 지점과 해결 과정을 적어요.",
    cols: ["무엇이 막혔나요?", "어떻게 풀었나요?", "무엇을 배웠나요?"],
    placeholders: [
      "예) 큰 수를 넣으면 계산이 멈췄어요.",
      "예) 자릿수 합을 구하는 방식으로 바꿨어요.",
      "예) 문제를 작게 나누면 원인을 찾기 쉬웠어요.",
    ],
    longCols: [0, 1, 2],
    addLabel: "막혔던 순간 행 추가",
  },
  ai_use: {
    kind: "ai_use",
    title: "AI 활용과 사람의 확인",
    hint: "AI에 맡긴 일과 사람이 확인한 것을 나눠 적어요.",
    cols: ["활용 구분", "사용 도구", "AI에 맡긴 일", "사람이 정하고 확인한 것"],
    placeholders: [
      "예) 개발 과정",
      "예) Lovable, ChatGPT",
      "예) 화면 코드 초안 작성",
      "예) 문항 내용과 수학적 정확성은 교사가 확인했어요.",
    ],
    longCols: [2, 3],
    addLabel: "AI 활용 행 추가",
  },
  ai_error: {
    kind: "ai_error",
    title: "AI의 실수를 잡은 사례",
    hint: "틀린 결과를 어떻게 찾고 고쳤는지 적어요.",
    cols: ["틀리거나 부적절했던 결과", "발견한 방법", "수정한 방법", "재확인 결과"],
    placeholders: [
      "예) 9의 배수 판별 설명을 3의 배수와 똑같이 적었어요.",
      "예) 예시 숫자로 직접 계산해 보다가 찾았어요.",
      "예) 설명을 다시 쓰고 예시를 추가했어요.",
      "예) 20개 숫자로 다시 확인해 모두 맞았어요.",
    ],
    longCols: [0, 1, 2, 3],
    addLabel: "실수 사례 행 추가",
  },
  privacy: {
    kind: "privacy",
    title: "입력·전송·저장 정보",
    hint: "실제 개인정보 값은 적지 말고 항목 이름만 적어요.",
    cols: [
      "정보 이름",
      "누가 입력하나요?",
      "외부 전송",
      "저장 위치·기간",
      "볼 수 있는 사람",
      "삭제 방법·시점",
    ],
    placeholders: [
      "예) 학생 번호(이름 아님)",
      "예) 학생 본인",
      "예) 전송하지 않음",
      "예) 브라우저에만 저장, 새로고침 시 삭제",
      "예) 본인과 담임교사",
      "예) 학기 종료 시 일괄 삭제",
    ],
    addLabel: "정보 항목 행 추가",
  },
};


/** 최종 결과물(팀당 1건) 필드 정의 — 카멜키 ↔ DB 컬럼 ↔ 최대 길이 */
export const RECORD_FINAL_FIELDS = [
  { key: "serviceName", column: "service_name", max: 200 },
  { key: "problemArea", column: "problem_area", max: 200 },
  { key: "targetUser", column: "target_user", max: 200 },
  { key: "outputType", column: "output_type", max: 200 },
  { key: "tags", column: "tags", max: 300 },
  { key: "consent", column: "consent", max: 10 },
  { key: "deployStatus", column: "deploy_status", max: 100 },
  { key: "usageEnv", column: "usage_env", max: 300 },
  { key: "oneLiner", column: "one_liner", max: 500 },
  { key: "problem", column: "problem", max: 2000 },
  { key: "solution", column: "solution", max: 2000 },
  { key: "deployUrl", column: "deploy_url", max: 500 },
  { key: "githubUrl", column: "github_url", max: 500 },
  { key: "demoVideoUrl", column: "demo_video_url", max: 500 },
  { key: "heroImageUrl", column: "hero_image_url", max: 2000 },
  { key: "usageCondition", column: "usage_condition", max: 1000 },
  { key: "techScreen", column: "tech_screen", max: 300 },
  { key: "techServer", column: "tech_server", max: 300 },
  { key: "techAi", column: "tech_ai", max: 300 },
  { key: "techStorage", column: "tech_storage", max: 300 },
  { key: "techDeploy", column: "tech_deploy", max: 300 },
  { key: "dirStructure", column: "dir_structure", max: 2000 },
  { key: "installCmd", column: "install_cmd", max: 1000 },
  { key: "runCmd", column: "run_cmd", max: 1000 },
  { key: "envNames", column: "env_names", max: 1000 },
  { key: "currentScope", column: "current_scope", max: 2000 },
  { key: "changeType", column: "change_type", max: 100 },
  { key: "changeContent", column: "change_content", max: 2000 },
  { key: "privacyStatus", column: "privacy_status", max: 100 },
  { key: "riskExpected", column: "risk_expected", max: 2000 },
  { key: "riskMitigation", column: "risk_mitigation", max: 2000 },
  { key: "riskStop", column: "risk_stop", max: 2000 },
  { key: "riskTest", column: "risk_test", max: 2000 },
  { key: "licenseCode", column: "license_code", max: 300 },
  { key: "licenseDocs", column: "license_docs", max: 300 },
  { key: "licenseExternal", column: "license_external", max: 1000 },
] as const;

export type RecordFinalKey = (typeof RECORD_FINAL_FIELDS)[number]["key"];

export const RECORD_FINAL_COLUMN_MAP: Record<string, string> = Object.fromEntries(
  RECORD_FINAL_FIELDS.map((f) => [f.key, f.column]),
);
