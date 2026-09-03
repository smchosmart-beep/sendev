// 05 README 출력 — 입력 내용을 개인 프로젝트 README 텍스트로 조립·복사
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { GrowthRecordData } from "@/lib/record-growth-schema";

const clean = (items: string[]) => items.map((i) => (i ?? "").trim()).filter(Boolean);

export function buildGrowthReadme(d: GrowthRecordData): string {
  const features = clean(d.features);
  const flow = clean(d.flow);
  return `# ${d.projectName || "제목 없는 프로젝트"}

> ${d.oneLine || "한 줄 소개를 입력해 주세요."}

## 1. 프로젝트 소개
- 주 사용자: ${d.primaryUser || "미입력"}
- 문제 영역: ${d.problemArea || "미입력"}
- 결과물 형태: ${d.resultType || "미입력"}
- 완성 상태: ${d.status || "미입력"}

## 2. 해결하려는 문제
${d.problemText || "문제를 입력해 주세요."}

## 3. 해결 방법
${d.solution || "해결 방법을 입력해 주세요."}

## 4. 핵심 기능
${features.length ? features.map((item) => `- ${item}`).join("\n") : "- 핵심 기능을 입력해 주세요."}

## 5. 사용 흐름
${flow.length ? flow.map((item, i) => `${i + 1}. ${item}`).join("\n") : "1. 사용 흐름을 입력해 주세요."}

## 6. 교육적 점검과 성장
- 사람이 확인한 일: ${d.humanCheck || "미입력"}
- 개인정보 처리: ${d.privacy || "미입력"}
- 배운 점: ${d.learned || "미입력"}
- 다음 계획: ${d.nextPlan || "미입력"}

## 사용 도구
${d.tools || "미입력"}

${d.resultUrl ? `## 바로 사용하기\n${d.resultUrl}` : ""}`;
}

export function GrowthReadmeOutput({ data }: { data: GrowthRecordData }) {
  const [copied, setCopied] = useState(false);
  const text = buildGrowthReadme(data);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("README를 복사했어요.");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("복사하지 못했어요. 내용을 직접 선택해 주세요.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-xs text-muted-foreground">
          수정이 필요하면 01~04 단계의 원본 내용을 바꿔 주세요.
        </p>
        <Button type="button" size="sm" className="rounded-xl" onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "복사했어요" : "README 복사"}
        </Button>
      </div>
      <div className="rounded-xl border border-border bg-zinc-950 p-4">
        <div className="mb-3 flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        </div>
        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-zinc-100">
          {text}
        </pre>
      </div>
    </div>
  );
}
