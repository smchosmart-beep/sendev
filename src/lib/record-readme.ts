import type {
  RecordOverviewResult,
  RecordOverviewTeam,
  RecordOverviewFinal,
} from "./record.functions";
import {
  ROW_SECTION_DEFS,
  STANCE_QUESTIONS,
  RECORD_FINAL_FIELDS,
  type RecordFinalKey,
  type RecordRowKindName,
} from "./record-schema";

const FINAL_LABELS: Partial<Record<RecordFinalKey, string>> = {
  serviceName: "서비스 이름",
  problemArea: "문제 영역",
  targetUser: "주 사용자",
  outputType: "결과물 형태",
  tags: "태그",
  consent: "공개 동의",
  deployStatus: "배포 상태",
  usageEnv: "사용 환경",
  oneLiner: "한 줄 소개",
  problem: "어떤 문제를 풀었나요?",
  solution: "어떻게 풀었나요?",
  deployUrl: "배포 주소",
  githubUrl: "GitHub 주소",
  demoVideoUrl: "시연 영상",
  heroImageUrl: "대표 이미지",
  usageCondition: "사용 조건",
  techScreen: "화면",
  techServer: "서버·백엔드",
  techAi: "AI",
  techStorage: "저장소",
  techDeploy: "배포",
  dirStructure: "폴더 구조",
  installCmd: "설치 명령",
  runCmd: "실행 명령",
  envNames: "환경변수 이름만",
  currentScope: "지금까지 확인한 범위",
  changeType: "변화 구분",
  changeContent: "변화 내용",
  privacyStatus: "개인정보 처리 여부",
  riskExpected: "예상되는 위험",
  riskMitigation: "위험을 줄이려고 한 일",
  riskStop: "멈춤 기준",
  riskTest: "검증 방법",
  licenseCode: "코드 라이선스",
  licenseDocs: "문서 라이선스",
  licenseExternal: "외부 자료 출처",
};

const FINAL_GROUPS: { title: string; keys: RecordFinalKey[] }[] = [
  {
    title: "한눈에 보기",
    keys: ["serviceName", "oneLiner", "problemArea", "targetUser", "outputType", "tags", "consent"],
  },
  {
    title: "문제와 해결",
    keys: ["problem", "solution"],
  },
  {
    title: "사용과 배포",
    keys: [
      "deployStatus",
      "usageEnv",
      "deployUrl",
      "githubUrl",
      "demoVideoUrl",
      "heroImageUrl",
      "usageCondition",
    ],
  },
  {
    title: "기술 구성",
    keys: [
      "techScreen",
      "techServer",
      "techAi",
      "techStorage",
      "techDeploy",
      "dirStructure",
      "installCmd",
      "runCmd",
      "envNames",
    ],
  },
  {
    title: "변화와 위험 점검",
    keys: [
      "currentScope",
      "changeType",
      "changeContent",
      "privacyStatus",
      "riskExpected",
      "riskMitigation",
      "riskStop",
      "riskTest",
    ],
  },
  {
    title: "라이선스와 출처",
    keys: ["licenseCode", "licenseDocs", "licenseExternal"],
  },
];

const ROW_ORDER: { kind: RecordRowKindName; title: string }[] = [
  { kind: "process", title: "문제 정의 과정 기록" },
  { kind: "feature", title: "핵심 기능" },
  { kind: "flow", title: "사용 흐름" },
  { kind: "limit", title: "현재 한계" },
  { kind: "plan", title: "다음 계획" },
  { kind: "maker", title: "제작자와 담당" },
  { kind: "devlog", title: "개발 과정 자유기록" },
  { kind: "decision", title: "구현하며 바꾼 중요한 판단" },
  { kind: "stuck", title: "막혔던 순간" },
  { kind: "ai_use", title: "AI 활용과 사람의 확인" },
  { kind: "ai_error", title: "AI의 실수를 잡은 사례" },
  { kind: "privacy", title: "입력·전송·저장 정보" },
];

function escapeMd(text: string): string {
  return (text ?? "").replace(/\n/g, "  \n");
}

export function sanitizeFolderName(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z0-9가-힣_-]+/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 50)
      .replace(/^_+|_+$/g, "") || "team"
  );
}

function finalValue(final: RecordOverviewFinal, key: RecordFinalKey): string {
  return (final as Record<string, string>)[key] ?? "";
}

export function buildRecordReadme(team: RecordOverviewTeam): string {
  const lines: string[] = [];
  const f = team.final;
  lines.push(`# ${escapeMd(f?.serviceName?.trim() || team.teamName)}`);
  lines.push("");
  if (f?.oneLiner?.trim()) {
    lines.push(`> ${escapeMd(f.oneLiner)}`);
    lines.push("");
  }
  lines.push(`- 팀 이름: ${escapeMd(team.teamName)} (No.${team.postNo})`);
  lines.push(
    `- 팀원: ${
      team.members
        .map((m) =>
          [m.username, m.affiliation, m.role].filter((v) => (v ?? "").trim()).join(" · "),
        )
        .join(", ") || "-"
    }`,
  );
  lines.push("");

  lines.push("## 01. 최종 결과물");
  lines.push("");
  if (f) {
    for (const group of FINAL_GROUPS) {
      const filled = group.keys.filter((k) => finalValue(f, k).trim());
      if (filled.length === 0) continue;
      lines.push(`### ${group.title}`);
      lines.push("");
      for (const key of filled) {
        lines.push(`- **${FINAL_LABELS[key] ?? key}**: ${escapeMd(finalValue(f, key))}`);
      }
      lines.push("");
    }
    lines.push(`- 마지막 수정: ${f.updatedBy?.trim() || "-"} / ${formatDateTime(f.updatedAt)}`);
  } else {
    lines.push("_아직 작성되지 않았어요._");
  }
  lines.push("");

  for (const section of ROW_ORDER) {
    const def = ROW_SECTION_DEFS[section.kind];
    const rows = team.rows
      .filter((r) => r.kind === section.kind)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    if (rows.length === 0) continue;
    lines.push(`## ${section.title}`);
    lines.push("");
    rows.forEach((r, idx) => {
      const head = [r.subtype, r.author].filter((v) => (v ?? "").trim()).join(" · ");
      lines.push(`### ${idx + 1}${head ? `. ${escapeMd(head)}` : ""}`);
      const cols = def?.cols ?? [];
      const values = [r.col1, r.col2, r.col3, r.col4, r.col5, r.col6];
      values.forEach((v, i) => {
        if (!(v ?? "").trim()) return;
        lines.push(`- **${cols[i] ?? `항목 ${i + 1}`}**: ${escapeMd(v)}`);
      });
      lines.push("");
    });
  }

  const stanceRows = team.rows
    .filter((r) => r.kind === "stance")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (stanceRows.length > 0) {
    lines.push("## 교육적 태도 점검");
    lines.push("");
    for (const r of stanceRows) {
      const q = STANCE_QUESTIONS[r.sortOrder] ?? `문항 ${r.sortOrder + 1}`;
      lines.push(`- **${escapeMd(q)}**: ${escapeMd(r.col1) || "-"}`);
      if (r.col2.trim()) lines.push(`  - 설명: ${escapeMd(r.col2)}`);
    }
    lines.push("");
  }

  lines.push("## 개인 후기와 소회");
  lines.push("");
  if (team.reflections.length === 0) {
    lines.push("_아직 작성된 후기가 없어요._");
  } else {
    for (const r of team.reflections) {
      const head = [r.username, r.affiliation, r.role].filter((v) => (v ?? "").trim()).join(" · ");
      lines.push(`### ${escapeMd(head)}`);
      if (r.q1.trim()) lines.push(`- 가장 기억에 남는 순간: ${escapeMd(r.q1)}`);
      if (r.q2.trim()) lines.push(`- 배운 점과 남은 질문: ${escapeMd(r.q2)}`);
      if (r.promises.length > 0) lines.push(`- 약속: ${r.promises.map(escapeMd).join(", ")}`);
      if (r.promiseDetail.trim()) lines.push(`- 약속 실천 계획: ${escapeMd(r.promiseDetail)}`);
      if (r.spreadPlan.trim()) lines.push(`- 확산 계획: ${escapeMd(r.spreadPlan)}`);
      lines.push(`- 마지막 수정일: ${formatDateTime(r.updatedAt)}`);
      lines.push("");
    }
  }

  return lines.join("\n").trim() + "\n";
}

export function buildOverviewReadme(result: RecordOverviewResult): string {
  const lines: string[] = [];
  lines.push(`# 활동기록 전체 목록`);
  lines.push("");
  lines.push(`- 게시판: ${result.slug}`);
  lines.push(`- 팀 수: ${result.teams.length}팀`);
  lines.push("");
  for (const team of result.teams) {
    lines.push(
      `- [${escapeMd(team.teamName)}](./${sanitizeFolderName(team.teamName)}/README.md)`,
    );
  }
  lines.push("");
  return lines.join("\n").trim() + "\n";
}

export const RECORD_FINAL_LABELS = FINAL_LABELS;
export const RECORD_FINAL_KEYS = RECORD_FINAL_FIELDS.map((f) => f.key);

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}
