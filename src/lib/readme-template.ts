export interface ReadmeFeature {
  title: string;
  description: string;
}

export interface ReadmeData {
  projectName: string;
  oneLine: string;
  screenshotUrl: string;
  screenshotAlt: string;
  features: ReadmeFeature[];
  frontend: string;
  backend: string;
  deployment: string;
  repoUrl: string;
  liveUrl: string;
  usage: string;
  additional: string;
}

export const DEFAULT_README_DATA: ReadmeData = {
  projectName: "",
  oneLine: "",
  screenshotUrl: "",
  screenshotAlt: "프로젝트 미리보기",
  features: [
    { title: "", description: "" },
    { title: "", description: "" },
    { title: "", description: "" },
  ],
  frontend: "",
  backend: "",
  deployment: "",
  repoUrl: "",
  liveUrl: "",
  usage: "",
  additional: "",
};

function escapeMd(text: string): string {
  return text.replace(/([*_`{}\[\]<>])/g, "\\$1");
}

// Escape only for table cells (pipe is the cell delimiter).
function escapeTableCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function generateReadme(data: ReadmeData): string {
  const name = data.projectName.trim() || "프로젝트명";
  const oneLine = data.oneLine.trim() || "프로젝트에 대한 한 줄 소개";
  const hasScreenshot = data.screenshotUrl.trim().length > 0;
  const validFeatures = data.features.filter(
    (f) => f.title.trim().length > 0 || f.description.trim().length > 0,
  );

  const lines: string[] = [];
  lines.push(`# ${escapeMd(name)}`);
  lines.push("");
  lines.push(`> ${escapeMd(oneLine)}`);
  lines.push("");
  lines.push("<br/>");
  lines.push("");

  if (hasScreenshot) {
    lines.push("## 📸 스크린샷 (미리보기)");
    lines.push("");
    lines.push(`![${escapeMd(data.screenshotAlt || "프로젝트 미리보기")}](${data.screenshotUrl.trim()})`);
    lines.push("");
    lines.push("<br/>");
    lines.push("");
  }

  lines.push("## ✨ 주요 기능 (Features)");
  lines.push("");
  if (validFeatures.length > 0) {
    validFeatures.forEach((f, i) => {
      const title = f.title.trim() || `핵심 기능 ${i + 1}`;
      const desc = f.description.trim() || "설명을 입력하세요";
      lines.push(`* **${escapeMd(title)}:** ${escapeMd(desc)}`);
    });
  } else {
    lines.push("* **핵심 기능 1:** 설명을 입력하세요");
    lines.push("* **핵심 기능 2:** 설명을 입력하세요");
    lines.push("* **핵심 기능 3:** 설명을 입력하세요");
  }
  lines.push("");
  lines.push("<br/>");
  lines.push("");

  lines.push("## 🛠 기술 스택 (Tech Stack)");
  lines.push("");
  lines.push(`| 구분 | 기술 |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Frontend | ${escapeTableCell(data.frontend.trim() || "-")} |`);
  lines.push(`| Backend & DB | ${escapeTableCell(data.backend.trim() || "-")} |`);
  lines.push(`| Deployment | ${escapeTableCell(data.deployment.trim() || "-")} |`);
  lines.push("");
  lines.push("<br/>");
  lines.push("");

  const liveUrl = data.liveUrl.trim();
  const repoUrl = data.repoUrl.trim();
  if (liveUrl || repoUrl) {
    lines.push("## 🔗 배포 주소 (Live Demo)");
    lines.push("");
    if (liveUrl) lines.push(`* **서비스 바로가기:** <${liveUrl}>`);
    if (repoUrl) lines.push(`* **GitHub 저장소:** <${repoUrl}>`);
    lines.push("");
    lines.push("<br/>");
    lines.push("");
  }

  if (data.usage.trim()) {
    lines.push("## 📖 사용법 (How to Use)");
    lines.push("");
    lines.push(data.usage.trim());
    lines.push("");
    lines.push("<br/>");
    lines.push("");
  }


  if (data.additional.trim()) {
    lines.push("## 📝 추가 설명");
    lines.push("");
    lines.push(data.additional.trim());
    lines.push("");
    lines.push("<br/>");
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("*이 README는 [SEN DEV CONNECT](https://sendev.kr)의 README 작성 도구로 생성되었습니다.*");

  return lines.join("\n");
}
