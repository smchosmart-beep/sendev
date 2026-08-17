import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import {
  FileText,
  Download,
  Clipboard,
  RotateCcw,
  Plus,
  Trash2,
  ChevronLeft,
  Copy,
  Check,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  generateReadme,
  DEFAULT_README_DATA,
  type ReadmeData,
  type ReadmeFeature,
} from "@/lib/readme-template";

import { MermaidBlock } from "@/components/MermaidBlock";

const STORAGE_KEY = "readme-generator-data";

const markdownComponents = {
  code({
    className,
    children,
    ...props
  }: {
    className?: string;
    children?: React.ReactNode;
  }) {
    if (className?.includes("language-mermaid")) {
      return <MermaidBlock code={String(children ?? "").trim()} />;
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
};

export const Route = createFileRoute("/_main/readme")({
  head: () => ({
    meta: [
      { title: "README 작성 — SEN DEV CONNECT" },
      {
        name: "description",
        content:
          "프로젝트 정보를 입력하고 실시간으로 미리본 뒤 README.md 파일을 다운로드하세요.",
      },
      { property: "og:title", content: "README 작성 — SEN DEV CONNECT" },
      {
        property: "og:description",
        content:
          "프로젝트 정보를 입력하고 실시간으로 미리본 뒤 README.md 파일을 다운로드하세요.",
      },
    ],
  }),
  component: ReadmePage,
});

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ReadmePage() {
  const [data, setData] = useState<ReadmeData>(DEFAULT_README_DATA);
  const [hydrated, setHydrated] = useState(false);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHydrated(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<ReadmeData> & {
          usage?: string;
        };
        setData((prev) => {
          const merged = { ...prev, ...parsed };
          if (!Array.isArray(merged.usageSteps)) {
            const legacy = typeof parsed.usage === "string" ? parsed.usage : "";
            const steps = legacy
              .split("\n")
              .map((line) => line.replace(/^\s*\d+[.)]\s*/, "").trim())
              .filter((line) => line.length > 0);
            merged.usageSteps = steps.length > 0 ? steps : ["", "", ""];
          }
          delete (merged as { usage?: string }).usage;
          return merged;
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [data, hydrated]);

  const updateField = <K extends keyof ReadmeData>(
    key: K,
    value: ReadmeData[K],
  ) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const updateFeature = (
    index: number,
    field: keyof ReadmeFeature,
    value: string,
  ) => {
    setData((prev) => {
      const next = [...prev.features];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, features: next };
    });
  };

  const addFeature = () => {
    setData((prev) => ({
      ...prev,
      features: [...prev.features, { title: "", description: "" }],
    }));
  };

  const removeFeature = (index: number) => {
    setData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const updateStep = (index: number, value: string) => {
    setData((prev) => {
      const next = [...prev.usageSteps];
      next[index] = value;
      return { ...prev, usageSteps: next };
    });
  };

  const addStep = () => {
    setData((prev) => ({ ...prev, usageSteps: [...prev.usageSteps, ""] }));
  };

  const removeStep = (index: number) => {
    setData((prev) => ({
      ...prev,
      usageSteps: prev.usageSteps.filter((_, i) => i !== index),
    }));
  };


  const reset = () => {
    if (confirm("입력한 내용을 모두 지울까요? 저장된 내용도 함께 삭제됩니다.")) {
      setData(DEFAULT_README_DATA);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  };

  const markdown = generateReadme(data);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert("클립보드 복사에 실패했어요.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link
          to="/board"
          search={{ tab: "hackathon" }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="뒤로 가기"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
            <FileText className="h-6 w-6 shrink-0 text-primary" />
            <span className="truncate">README 작성</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            항목을 채우면 오른쪽에 마크다운이 실시간으로 만들어집니다. 완성 후 README.md 파일로
            내려받을 수 있어요.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-foreground">기본 정보</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">프로젝트명</Label>
                <Input
                  id="project-name"
                  value={data.projectName}
                  onChange={(e) => updateField("projectName", e.target.value)}
                  placeholder="예: 학급 포인트 관리 웹"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="one-line">한 줄 소개</Label>
                <Input
                  id="one-line"
                  value={data.oneLine}
                  onChange={(e) => updateField("oneLine", e.target.value)}
                  placeholder="프로젝트를 한 줄로 설명해주세요"
                  maxLength={200}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="screenshot-url">스크린샷 이미지 주소</Label>
                  <Input
                    id="screenshot-url"
                    value={data.screenshotUrl}
                    onChange={(e) => updateField("screenshotUrl", e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="screenshot-alt">대체 텍스트</Label>
                  <Input
                    id="screenshot-alt"
                    value={data.screenshotAlt}
                    onChange={(e) => updateField("screenshotAlt", e.target.value)}
                    placeholder="프로젝트 미리보기"
                    maxLength={100}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                스크린샷 주소를 비우면 해당 섹션이 자동으로 생략돼요.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-foreground">주요 기능</h2>
            <div className="space-y-3">
              {data.features.map((feature, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <Input
                    value={feature.title}
                    onChange={(e) => updateFeature(index, "title", e.target.value)}
                    placeholder="기능 제목"
                    maxLength={100}
                    aria-label={`기능 ${index + 1} 제목`}
                  />
                  <Input
                    value={feature.description}
                    onChange={(e) =>
                      updateFeature(index, "description", e.target.value)
                    }
                    placeholder="기능 설명"
                    maxLength={300}
                    aria-label={`기능 ${index + 1} 설명`}
                  />
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    disabled={data.features.length <= 1}
                    className="flex h-9 w-9 items-center justify-center self-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                    aria-label={`기능 ${index + 1} 삭제`}
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFeature}
                className="rounded-xl"
              >
                <Plus className="h-4 w-4" />
                기능 추가
              </Button>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-foreground">기술 스택</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="frontend">Frontend</Label>
                <Input
                  id="frontend"
                  value={data.frontend}
                  onChange={(e) => updateField("frontend", e.target.value)}
                  placeholder="React, TailwindCSS"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="backend">Backend & DB</Label>
                <Input
                  id="backend"
                  value={data.backend}
                  onChange={(e) => updateField("backend", e.target.value)}
                  placeholder="Supabase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deployment">Deployment</Label>
                <Input
                  id="deployment"
                  value={data.deployment}
                  onChange={(e) => updateField("deployment", e.target.value)}
                  placeholder="Vercel"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-foreground">배포 주소 및 사용법</h2>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="live-url">배포 주소</Label>
                  <Input
                    id="live-url"
                    value={data.liveUrl}
                    onChange={(e) => updateField("liveUrl", e.target.value)}
                    placeholder="https://myproject.lovable.app"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repo-url">GitHub 저장소 주소 (선택)</Label>
                  <Input
                    id="repo-url"
                    value={data.repoUrl}
                    onChange={(e) => updateField("repoUrl", e.target.value)}
                    placeholder="https://github.com/사용자명/레포지토리명"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>사용법 (단계별 흐름도)</Label>
                <div className="space-y-2">
                  {data.usageSteps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-5 shrink-0 text-sm text-muted-foreground">
                        {index + 1}.
                      </span>
                      <Input
                        value={step}
                        onChange={(e) => updateStep(index, e.target.value)}
                        placeholder={
                          index === 0
                            ? "사이트에 접속합니다"
                            : "다음 단계를 입력하세요"
                        }
                        maxLength={60}
                        aria-label={`사용법 ${index + 1}단계`}
                      />
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        disabled={data.usageSteps.length <= 1}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                        aria-label={`사용법 ${index + 1}단계 삭제`}
                        title="삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addStep}
                    className="rounded-xl"
                  >
                    <Plus className="h-4 w-4" />
                    단계 추가
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  입력한 단계가 흐름도로 자동 변환돼요. 모두 비우면 해당 섹션이 생략됩니다.
                </p>
              </div>
            </div>
          </section>


          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-foreground">추가 설명 (선택)</h2>
            <div className="space-y-2">
              <Textarea
                value={data.additional}
                onChange={(e) => updateField("additional", e.target.value)}
                placeholder="마크다운 문법을 지원하는 자유 입력란입니다. 프로젝트 구조, 팀 소개, 라이선스 등을 추가해 보세요."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                입력한 내용이 마크다운 본문에 그대로 들어갑니다. 파이프(|)와 기호는 자동으로
                안전하게 처리돼요.
              </p>
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => downloadMarkdown("README.md", markdown)}
              className="rounded-xl"
            >
              <Download className="h-4 w-4" />
              README.md 다운로드
            </Button>
            <Button onClick={copyToClipboard} variant="outline" className="rounded-xl">
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  복사됨
                </>
              ) : (
                <>
                  <Clipboard className="h-4 w-4" />
                  클립보드에 복사
                </>
              )}
            </Button>
            <Button
              onClick={reset}
              variant="outline"
              className="rounded-xl text-muted-foreground hover:text-destructive"
            >
              <RotateCcw className="h-4 w-4" />
              초기화
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="sticky top-24 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">미리보기</h2>
              <span className="text-xs text-muted-foreground">실시간 업데이트</span>
            </div>
            <div
              ref={previewRef}
              className={cn(
                "max-h-[calc(100vh-12rem)] overflow-auto rounded-3xl border border-border bg-card p-6 shadow-sm",
                "prose prose-sm max-w-none dark:prose-invert",
                "prose-headings:text-foreground prose-p:text-muted-foreground",
                "prose-strong:text-foreground prose-li:text-muted-foreground",
                "prose-a:text-primary",
              )}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={markdownComponents}
              >
                {markdown}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
