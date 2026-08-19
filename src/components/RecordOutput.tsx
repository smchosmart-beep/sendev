import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, Download, FileText, Printer } from "lucide-react";
import { toast } from "sonner";

import { MermaidBlock } from "@/components/MermaidBlock";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/lib/download";
import { buildPublicReadme, getPublicReadmeBlocks } from "@/lib/record-readme";
import type { RecordOverviewTeam } from "@/lib/record.functions";
import { cn } from "@/lib/utils";

const markdownComponents = {
  code({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
    if (className?.includes("language-mermaid")) {
      return <MermaidBlock code={String(children ?? "").trim()} />;
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  a({ children, href, ...props }: { href?: string; children?: React.ReactNode }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="mr-2 inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-3 py-1 text-sm font-medium no-underline hover:bg-muted"
        {...props}
      >
        {children}
      </a>
    );
  },
};


export function RecordOutput({
  team,
  onGoStep,
}: {
  team: RecordOverviewTeam;
  onGoStep: (step: number) => void;
}) {
  const [tab, setTab] = useState<"blocks" | "readme">("blocks");
  const [showSource, setShowSource] = useState(false);
  const [copied, setCopied] = useState(false);

  const markdown = useMemo(() => buildPublicReadme(team), [team]);
  const blocks = useMemo(() => getPublicReadmeBlocks(team), [team]);
  const doneCount = blocks.filter((b) => b.status === "done").length;
  const partialCount = blocks.filter((b) => b.status === "partial").length;


  const fileName = `${(team.final?.serviceName || team.teamName || "README").trim()}_README.md`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("마크다운 원본을 복사했어요.");
    } catch {
      toast.error("복사하지 못했어요. 원본을 열어 직접 선택해 주세요.");
      setShowSource(true);
    }
  };

  return (
    <section className="record-output space-y-4 rounded-2xl bg-card p-5 shadow-sm sm:p-6">
      <div className="record-output-ui flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-lg font-semibold text-foreground">출력 보기</h2>
        <Button
          type="button"
          size="sm"
          variant={tab === "blocks" ? "default" : "outline"}
          className="rounded-xl"
          onClick={() => setTab("blocks")}
        >
          README 구성
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === "readme" ? "default" : "outline"}
          className="rounded-xl"
          onClick={() => setTab("readme")}
        >
          최종 README
        </Button>
      </div>

      {tab === "blocks" ? (
        <div className="record-output-ui space-y-3">
          <p className="text-sm text-muted-foreground">
            최종 README는 아래 9개 블록으로 만들어져요. 지금까지 {blocks.length}개 중{" "}
            <strong className="text-foreground">{doneCount}개 작성완료</strong>
            {partialCount > 0 ? ` (${partialCount}개 작성중)` : ""}입니다. 블록을 누르면 작성할
            단계로 이동합니다.
          </p>
          <ol className="grid gap-2 sm:grid-cols-2">
            {blocks.map((b) => (
              <li key={b.no}>
                <button
                  type="button"
                  onClick={() => onGoStep(b.step)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    b.status === "done"
                      ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                      : b.status === "partial"
                        ? "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10"
                        : "border-border bg-muted/40 hover:bg-muted",
                  )}
                >
                  <span className="text-xs font-semibold text-muted-foreground">
                    {String(b.no).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{b.title}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      b.status === "done"
                        ? "bg-primary text-primary-foreground"
                        : b.status === "partial"
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                          : "bg-muted-foreground/15 text-muted-foreground",
                    )}
                  >
                    {b.status === "done" ? "작성완료" : b.status === "partial" ? "작성중" : "미작성"}

                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="record-output-ui flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => setShowSource((s) => !s)}
            >
              <FileText className="h-4 w-4" />
              {showSource ? "미리보기로 보기" : "Markdown 원본 열기"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              원본 복사
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => downloadTextFile(fileName, markdown)}
            >
              <Download className="h-4 w-4" />
              .md 내려받기
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-xl"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              인쇄·PDF
            </Button>
          </div>

          {showSource ? (
            <pre className="record-output-ui max-h-[70vh] overflow-auto rounded-xl bg-muted/50 p-4 text-xs leading-relaxed text-foreground">
              {markdown}
            </pre>
          ) : (
            <div
              data-print-root
              className="prose prose-sm max-w-none rounded-xl border border-border bg-background p-5 dark:prose-invert"
            >
              <ReactMarkdown components={markdownComponents}>{markdown}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
