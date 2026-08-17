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

  lines.push("## ⚙️ 설치 및 실행 (Getting Started)");
  lines.push("");
  lines.push("로컬 환경에서 프로젝트를 실행하기 위한 방법입니다.");
  lines.push("");
  lines.push("### 1. 저장소 클론");
  lines.push("```bash");
  if (data.repoUrl.trim()) {
    lines.push(`git clone ${data.repoUrl.trim()}`);
  } else {
    lines.push("git clone https://github.com/사용자명/레포지토리명.git");
  }
  if (data.folderName.trim()) {
    lines.push(`cd ${data.folderName.trim()}`);
  } else {
    lines.push("cd 레포지토리명");
  }
  lines.push("```");
  lines.push("");
  lines.push("### 2. 의존성 설치");
  lines.push("```bash");
  lines.push("# npm 사용");
  lines.push("npm install");
  lines.push("");
  lines.push("# 또는 yarn 사용");
  lines.push("yarn install");
  lines.push("");
  lines.push("# 또는 pnpm 사용");
  lines.push("pnpm install");
  lines.push("```");
  lines.push("");
  lines.push("### 3. 환경 변수 설정");
  lines.push("프로젝트 루트에 `.env` 파일을 만들고 필요한 환경 변수를 입력합니다.");
  lines.push("(예: API 주소, 데이터베이스 URL, 외부 서비스 키 등)");
  lines.push("");
  lines.push("```env");
  lines.push("# .env");
  lines.push("# 예시");
  lines.push("VITE_API_URL=http://localhost:3000");
  lines.push("```");
  lines.push("");
  lines.push("### 4. 개발 서버 실행");
  lines.push("```bash");
  lines.push("# npm 사용");
  lines.push("npm run dev");
  lines.push("");
  lines.push("# 또는 yarn 사용");
  lines.push("yarn dev");
  lines.push("");
  lines.push("# 또는 pnpm 사용");
  lines.push("pnpm dev");
  lines.push("```");
  lines.push("");
  lines.push("### 5. 프로덕션 빌드");
  lines.push("```bash");
  lines.push("# npm 사용");
  lines.push("npm run build");
  lines.push("");
  lines.push("# 또는 yarn 사용");
  lines.push("yarn build");
  lines.push("");
  lines.push("# 또는 pnpm 사용");
  lines.push("pnpm build");
  lines.push("```");
  lines.push("");
  lines.push("<br/>");
  lines.push("");

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
