import type {
  RecordOverviewResult,
  RecordOverviewTeam,
  RecordOverviewRow,
  RecordOverviewFinal,
} from "./record.functions";

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

const FINAL_FIELDS: { key: FinalKey; label: string }[] = [
  { key: "serviceName", label: "서비스 이름" },
  { key: "oneLiner", label: "한 줄 소개" },
  { key: "targetUser", label: "누구를 위한 것인가요?" },
  { key: "problem", label: "어떤 문제를 풀었나요?" },
  { key: "solution", label: "어떻게 풀었나요?" },
  { key: "heroImageUrl", label: "대표 이미지 주소" },
  { key: "deployUrl", label: "배포 주소" },
  { key: "githubUrl", label: "GitHub 주소" },
  { key: "techStack", label: "사용한 도구" },
  { key: "envNames", label: "환경변수 이름만" },
];

const ROW_SECTIONS: {
  kind: RecordOverviewRow["kind"];
  title: string;
  cols: [string, string, string];
}[] = [
  { kind: "feature", title: "핵심 기능", cols: ["기능 이름", "설명", "비고"] },
  { kind: "flow", title: "사용 흐름", cols: ["단계", "화면/동작", "결과"] },
  { kind: "limit", title: "지금의 한계", cols: ["한계", "이유", ""] },
  { kind: "plan", title: "다음 계획", cols: ["계획", "언제/어떻게", ""] },
  { kind: "maker", title: "제작자", cols: ["이름", "맡은 일", ""] },
  {
    kind: "process",
    title: "문제 정의 과정 기록",
    cols: ["단계/날짜", "우리가 나눈 이야기", "그래서 정한 것"],
  },
  {
    kind: "devlog",
    title: "개발 과정 자유기록",
    cols: ["날짜", "무슨 일이 있었나", "어떻게 해결했나"],
  },
  {
    kind: "check",
    title: "교육적 점검",
    cols: ["항목", "자가 평가", "메모"],
  },
];

function getFinalValue(final: RecordOverviewFinal, key: FinalKey): string {
  return final[key] ?? "";
}

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

export function buildRecordReadme(team: RecordOverviewTeam): string {
  const lines: string[] = [];
  lines.push(`# ${escapeMd(team.teamName)}`);
  lines.push("");
  lines.push(`- 팀 번호: ${team.postNo}`);
  lines.push(`- 팀원: ${team.members.map((m) => escapeMd(m.username)).join(", ") || "-"}`);
  lines.push("");

  lines.push("## 최종 결과물");
  lines.push("");
  if (team.final) {
    const f = team.final;
    for (const field of FINAL_FIELDS) {
      const value = getFinalValue(f, field.key);
      lines.push(`### ${field.label}`);
      lines.push(value?.trim() ? escapeMd(value) : "_미입력_");
      lines.push("");
    }
    lines.push(`- 마지막 수정자: ${f.updatedBy?.trim() || "-"}`);
    lines.push(`- 마지막 수정일: ${formatDateTime(f.updatedAt)}`);
  } else {
    lines.push("_아직 작성되지 않았어요._");
  }
  lines.push("");

  for (const section of ROW_SECTIONS) {
    const sectionRows = team.rows.filter((r) => r.kind === section.kind);
    lines.push(`## ${section.title}`);
    lines.push("");
    if (sectionRows.length === 0) {
      lines.push("_아직 작성된 항목이 없어요._");
      lines.push("");
      continue;
    }
    for (const r of sectionRows) {
      lines.push(`### ${sectionRows.indexOf(r) + 1}. ${escapeMd(r.col1) || "제목 없음"}`);
      lines.push(`- ${section.cols[1]}: ${escapeMd(r.col2) || "-"}`);
      if (r.col3.trim()) {
        lines.push(`- ${section.cols[2]}: ${escapeMd(r.col3)}`);
      }
      lines.push("");
    }
  }

  lines.push("## 개인 후기와 팀원 약속");
  lines.push("");
  if (team.reflections.length === 0) {
    lines.push("_아직 작성된 후기가 없어요._");
  } else {
    for (const r of team.reflections) {
      lines.push(`### ${escapeMd(r.username)}`);
      lines.push(`- 후기: ${escapeMd(r.content) || "-"}`);
      lines.push(`- 약속: ${escapeMd(r.promise) || "-"}`);
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

