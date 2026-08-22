import type {
  RecordOverviewResult,
  RecordOverviewTeam,
  RecordOverviewFinal,
} from "./record.functions";
import { ETHICS_PRINCIPLES, ethicsAverage } from "./record-ethics";
import { parseAttachments } from "./file-upload";

import {
  ROW_SECTION_DEFS,
  STANCE_QUESTIONS,
  RECORD_FINAL_FIELDS,
  rowTemplate,
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

export function normalizeUrl(raw: string): string {
  const url = (raw ?? "").trim();
  if (!url) return "";
  const withProtocol = /^(https?:|mailto:)/i.test(url) ? url : `https://${url}`;
  return withProtocol.replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29");
}

export function isBlankRow(
  r: Record<`col${1 | 2 | 3 | 4 | 5 | 6}`, string> | Record<string, string>,
): boolean {
  return [r.col1, r.col2, r.col3, r.col4, r.col5, r.col6].every((v) => !(v ?? "").trim());
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
      .filter((r) => !isBlankRow(r))
      .sort(
        (a, b) =>
          (a.subtype ?? "").localeCompare(b.subtype ?? "", "ko") || a.sortOrder - b.sortOrder,
      );
    if (rows.length === 0) continue;

    lines.push(`## ${section.title}`);
    lines.push("");
    rows.forEach((r, idx) => {
      const head = [r.subtype, r.author].filter((v) => (v ?? "").trim()).join(" · ");
      lines.push(`### ${idx + 1}${head ? `. ${escapeMd(head)}` : ""}`);
      // 탭(subtype)별 전용 양식이 있으면 그 양식의 열 정의를 따른다.
      const tpl = rowTemplate(section.kind, r.subtype);
      const cols = tpl.cols;
      const values = [r.col1, r.col2, r.col3, r.col4, r.col5, r.col6];
      const order = tpl.displayOrder ?? values.map((_, i) => i);
      order.forEach((i) => {
        const v = values[i] ?? "";
        if (!v.trim()) return;
        // 이 양식에서 쓰지 않는 열은 출력하지 않는다(값은 DB에 보존).
        if (!(cols[i] ?? "").trim()) return;
        // 관련 링크 열: 마크다운 링크로 표기
        if (tpl.linkCol === i) {
          const url = normalizeUrl(v);
          lines.push(`- **${cols[i]}**: [${escapeMd(v)}](${url})`);
          return;
        }
        // 첨부 열: JSON을 파싱해 파일명 링크 목록으로. 실패하면 생략(원본 노출 금지)
        if (tpl.fileCols?.includes(i)) {
          const files = parseAttachments(v);
          if (files.length === 0) return;
          // 이미지 열은 실제 이미지로 삽입
          if (tpl.imageCols?.includes(i)) {
            lines.push(`- **${cols[i]}**`);
            lines.push("");
            for (const f of files) lines.push(`![${escapeMd(f.name)}](${f.url})`);
            lines.push("");
            return;
          }
          lines.push(
            `- **${cols[i]}**: ${files
              .map((f) => `[${escapeMd(f.name)}](${f.url})`)
              .join(" ")}`,
          );
          return;
        }
        lines.push(`- **${cols[i]}**: ${escapeMd(v)}`);
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

// ─────────────────────────────────────────────────────────────
// 공개용 README (9블록) — 결과물을 처음 보는 사람이 읽는 문서
// ─────────────────────────────────────────────────────────────

export type PublicReadmeStatus = "empty" | "partial" | "done";

export interface PublicReadmeBlock {
  no: number;
  title: string;
  step: number; // 편집기 단계 인덱스
  status: PublicReadmeStatus;
  filled: boolean; // status !== "empty"
}

function rowsOfKind(team: RecordOverviewTeam, kind: RecordRowKindName) {
  return team.rows
    .filter((r) => r.kind === kind)
    .filter((r) => !isBlankRow(r))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}


function countFilled(final: RecordOverviewFinal | null, keys: RecordFinalKey[]): number {
  if (!final) return 0;

  return keys.filter((k) => finalValue(final, k).trim()).length;
}

function toStatus(done: number, total: number): PublicReadmeStatus {
  if (done <= 0) return "empty";
  return done >= total ? "done" : "partial";
}

function block(
  no: number,
  title: string,
  step: number,
  done: number,
  total: number,
): PublicReadmeBlock {
  const status = toStatus(done, total);
  return { no, title, step, status, filled: status !== "empty" };
}

export function getPublicReadmeBlocks(team: RecordOverviewTeam): PublicReadmeBlock[] {
  const f = team.final;
  const techCount = countFilled(f, [
    "techScreen",
    "techServer",
    "techAi",
    "techStorage",
    "techDeploy",
  ]);
  const runCount = countFilled(f, ["dirStructure", "installCmd", "runCmd", "envNames"]);
  const features = rowsOfKind(team, "feature").length;
  const flows = rowsOfKind(team, "flow").length;
  const limits = rowsOfKind(team, "limit").length;
  const plans = rowsOfKind(team, "plan").length;
  const stances = rowsOfKind(team, "stance").length;
  const makers = rowsOfKind(team, "maker").length;
  const membersWithInfo = team.members.filter(
    (m) => (m.affiliation ?? "").trim() || (m.role ?? "").trim(),
  ).length;

  return [
    block(1, "프로젝트명과 한 줄 설명", 2, countFilled(f, ["serviceName", "oneLiner"]), 2),
    block(
      2,
      "대표 화면과 배포·GitHub·영상 링크",
      2,
      countFilled(f, ["heroImageUrl", "deployUrl", "githubUrl"]),
      3,
    ),
    block(3, "최종적으로 해결한 문제", 2, countFilled(f, ["problem", "solution"]), 2),
    block(4, "핵심 기능", 2, Math.min(features, 2), 2),
    block(5, "사용 흐름과 사용 방법", 2, Math.min(flows, 1) + countFilled(f, ["usageEnv"]), 2),
    block(
      6,
      "기술 스택·디렉터리·설치·실행",
      2,
      Math.min(techCount, 3) + Math.min(runCount, 1),
      4,
    ),
    block(
      7,
      "작동 범위·기술적 한계·다음 계획",
      3,
      countFilled(f, ["currentScope"]) + Math.min(limits, 1) + Math.min(plans, 1),
      3,
    ),
    block(
      8,
      "교육 현장에서 사용할 때의 주의사항",
      3,
      countFilled(f, ["privacyStatus", "riskExpected", "riskMitigation"]) + Math.min(stances, 1),
      4,
    ),
    block(
      9,
      "제작자와 라이선스",
      2,
      Math.min(makers + membersWithInfo, 1) + countFilled(f, ["licenseCode"]),
      2,
    ),
    block(
      10,
      "교사 개발자 윤리 자가점검",
      5,
      Math.min((team.ethics ?? []).length, Math.max(team.members.length, 1)),
      Math.max(team.members.length, 1),
    ),
  ];
}


export function buildPublicReadme(team: RecordOverviewTeam): string {
  const f = team.final;
  const v = (k: RecordFinalKey) => (f ? finalValue(f, k).trim() : "");
  const L: string[] = [];
  const push = (...xs: string[]) => L.push(...xs);
  const empty = "_아직 작성되지 않았어요._";

  push(`# ${escapeMd(v("serviceName") || team.teamName)}`, "");
  if (v("oneLiner")) push(`> ${escapeMd(v("oneLiner"))}`, "");

  // 2. 링크 배지 + 대표 화면
  const linkBadges: string[] = [];
  if (v("deployUrl")) linkBadges.push(`[🌐 바로 사용하기](${normalizeUrl(v("deployUrl"))})`);
  if (v("githubUrl")) linkBadges.push(`[💻 소스코드](${normalizeUrl(v("githubUrl"))})`);
  if (v("demoVideoUrl")) linkBadges.push(`[▶️ 시연 보기](${normalizeUrl(v("demoVideoUrl"))})`);
  if (linkBadges.length) push(linkBadges.join(" "), "");

  push("## 대표 화면과 링크", "");
  if (v("heroImageUrl")) push(`![대표 화면](${v("heroImageUrl")})`, "");
  if (!linkBadges.length && !v("heroImageUrl")) push(empty, "");


  // 3. 해결한 문제
  push("## 최종적으로 해결한 문제", "");
  push(v("problem") ? escapeMd(v("problem")) : empty, "");
  if (v("solution")) push("### 어떻게 풀었나요?", "", escapeMd(v("solution")), "");

  // 4. 핵심 기능
  push("## 핵심 기능", "");
  const features = rowsOfKind(team, "feature");
  if (features.length === 0) push(empty, "");
  else {
    for (const r of features) {
      const cols = [r.col1, r.col2, r.col3].filter((c) => (c ?? "").trim());
      push(`- **${escapeMd(cols[0] ?? "-")}**${cols[1] ? `: ${escapeMd(cols[1])}` : ""}`);
      if (cols[2]) push(`  - ${escapeMd(cols[2])}`);
    }
    push("");
  }

  // 5. 사용 흐름과 사용 방법
  push("## 사용 흐름과 사용 방법", "");
  const flows = rowsOfKind(team, "flow");
  if (flows.length === 0 && !v("usageEnv") && !v("usageCondition")) push(empty, "");
  else {
    flows.forEach((r, i) => {
      const cols = [r.col1, r.col2, r.col3].filter((c) => (c ?? "").trim());
      push(`${i + 1}. ${cols.map(escapeMd).join(" — ")}`);
    });
    if (flows.length > 0) push("");
    if (v("usageEnv")) push(`- 사용 환경: ${escapeMd(v("usageEnv"))}`);
    if (v("usageCondition")) push(`- 사용 조건: ${escapeMd(v("usageCondition"))}`);
    push("");
  }

  // 6. 기술 구성
  push("## 기술 스택과 실행 방법", "");
  const techKeys: RecordFinalKey[] = [
    "techScreen",
    "techServer",
    "techAi",
    "techStorage",
    "techDeploy",
  ];
  const techLines = techKeys
    .filter((k) => v(k))
    .map((k) => `- **${FINAL_LABELS[k] ?? k}**: ${escapeMd(v(k))}`);
  if (techLines.length === 0 && !v("dirStructure") && !v("installCmd") && !v("runCmd") && !v("envNames"))
    push(empty, "");
  else {
    if (techLines.length) push(...techLines, "");
    if (v("dirStructure")) push("### 폴더 구조", "", "```text", v("dirStructure"), "```", "");
    if (v("installCmd") || v("runCmd")) {
      push("### 설치와 실행", "", "```bash");
      if (v("installCmd")) push(v("installCmd"));
      if (v("runCmd")) push(v("runCmd"));
      push("```", "");
    }
    if (v("envNames")) push(`- 필요한 환경변수(이름만): ${escapeMd(v("envNames"))}`, "");
  }

  // 7. 작동 범위·한계·다음 계획
  push("## 작동 범위와 한계, 다음 계획", "");
  const limits = rowsOfKind(team, "limit");
  const plans = rowsOfKind(team, "plan");
  if (!v("currentScope") && limits.length === 0 && plans.length === 0) push(empty, "");
  else {
    if (v("currentScope")) push(`- 지금까지 확인한 범위: ${escapeMd(v("currentScope"))}`, "");
    if (limits.length) {
      push("### 기술적 한계", "");
      for (const r of limits)
        push(`- ${[r.col1, r.col2, r.col3].filter((c) => (c ?? "").trim()).map(escapeMd).join(" — ")}`);
      push("");
    }
    if (plans.length) {
      push("### 다음 계획", "");
      for (const r of plans)
        push(`- ${[r.col1, r.col2, r.col3].filter((c) => (c ?? "").trim()).map(escapeMd).join(" — ")}`);
      push("");
    }
  }

  // 8. 교육 현장 주의사항
  push("## 교육 현장에서 사용할 때의 주의사항", "");
  const cautionKeys: RecordFinalKey[] = [
    "privacyStatus",
    "riskExpected",
    "riskMitigation",
    "riskStop",
    "riskTest",
  ];
  const cautionLines = cautionKeys
    .filter((k) => v(k))
    .map((k) => `- **${FINAL_LABELS[k] ?? k}**: ${escapeMd(v(k))}`);
  const stance = rowsOfKind(team, "stance");
  const privacyRows = rowsOfKind(team, "privacy");
  if (cautionLines.length === 0 && stance.length === 0 && privacyRows.length === 0) push(empty, "");
  else {
    if (cautionLines.length) push(...cautionLines, "");
    if (privacyRows.length) {
      push("### 입력·전송·저장 정보", "");
      for (const r of privacyRows)
        push(`- ${[r.col1, r.col2, r.col3].filter((c) => (c ?? "").trim()).map(escapeMd).join(" — ")}`);
      push("");
    }
    if (stance.length) {
      push("### 교육적 태도 점검", "");
      for (const r of stance) {
        const q = STANCE_QUESTIONS[r.sortOrder] ?? `문항 ${r.sortOrder + 1}`;
        push(`- ${escapeMd(q)}: ${escapeMd(r.col1) || "-"}${r.col2.trim() ? ` (${escapeMd(r.col2)})` : ""}`);
      }
      push("");
    }
  }

  // 9. 제작자와 라이선스
  push("## 제작자와 라이선스", "");
  if (team.members.length) {
    for (const m of team.members)
      push(`- ${[m.username, m.affiliation, m.role].filter((x) => (x ?? "").trim()).map(escapeMd).join(" · ")}`);
  }
  for (const r of rowsOfKind(team, "maker"))
    push(`- ${[r.col1, r.col2, r.col3].filter((c) => (c ?? "").trim()).map(escapeMd).join(" · ")}`);
  const licenseKeys: RecordFinalKey[] = ["licenseCode", "licenseDocs", "licenseExternal"];
  for (const k of licenseKeys) if (v(k)) push(`- **${FINAL_LABELS[k] ?? k}**: ${escapeMd(v(k))}`);
  push("");

  // 10. 교사 개발자 윤리 자가점검
  push("## 교사 개발자 윤리 자가점검", "");
  const ethics = team.ethics ?? [];
  if (ethics.length === 0) push(empty, "");
  else {
    push(`- 응답 인원: ${ethics.length}명 / 팀원 ${team.members.length}명`, "");
    push("| 원칙 | 평균 점수 |", "| --- | --- |");
    for (const p of ETHICS_PRINCIPLES) {
      const avg =
        ethics.reduce((sum, e) => sum + Number((e as any)[p.key] ?? 0), 0) / ethics.length;
      push(`| ${escapeMd(p.title)} | ${avg.toFixed(1)} / 5.0 |`);
    }
    const overall =
      ethics.reduce((sum, e) => sum + ethicsAverage(e as any), 0) / ethics.length;
    push(`| **전체 평균** | **${overall.toFixed(1)} / 5.0** |`, "");
    const promises = ethics.filter((e) => (e.extraPromise ?? "").trim());
    if (promises.length) {
      push("### 우리가 더한 약속", "");
      for (const e of promises) push(`- ${escapeMd(e.username)}: ${escapeMd(e.extraPromise)}`);
      push("");
    }
  }

  return L.join("\n").trim() + "\n";
}

