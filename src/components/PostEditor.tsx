import { useRef } from "react";
import {
  Bold,
  Italic,
  Heading,
  List,
  ListOrdered,
  Link2,
  Image as ImageIcon,
  Quote,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface PostEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

type Tool = {
  icon: typeof Bold;
  label: string;
  // Wraps the current selection: before + selection + after.
  wrap?: { before: string; after: string };
  // Prefixes each selected line (block formatting).
  linePrefix?: string;
};

const tools: Tool[] = [
  { icon: Heading, label: "제목", linePrefix: "## " },
  { icon: Bold, label: "굵게", wrap: { before: "**", after: "**" } },
  { icon: Italic, label: "기울임", wrap: { before: "*", after: "*" } },
  { icon: Quote, label: "인용", linePrefix: "> " },
  { icon: List, label: "목록", linePrefix: "- " },
  { icon: ListOrdered, label: "번호 목록", linePrefix: "1. " },
  { icon: Link2, label: "링크", wrap: { before: "[", after: "](https://)" } },
  { icon: ImageIcon, label: "이미지", wrap: { before: "![](", after: ")" } },
];

export function PostEditor({
  value,
  onChange,
  placeholder = "내용을 입력해 주세요.",
  className,
  rows = 10,
}: PostEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const applyTool = (tool: Tool) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);

    let next = value;
    let cursorStart = start;
    let cursorEnd = end;

    if (tool.linePrefix) {
      // Find the start of the first selected line.
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const block = value.slice(lineStart, end);
      const prefixed = block
        .split("\n")
        .map((line) => `${tool.linePrefix}${line}`)
        .join("\n");
      next = value.slice(0, lineStart) + prefixed + value.slice(end);
      cursorStart = lineStart;
      cursorEnd = lineStart + prefixed.length;
    } else if (tool.wrap) {
      const { before, after } = tool.wrap;
      next =
        value.slice(0, start) + before + selected + after + value.slice(end);
      cursorStart = start + before.length;
      cursorEnd = cursorStart + selected.length;
    }

    onChange(next);
    // Restore focus/selection after React updates the value.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  return (
    <div className={cn("rounded-xl border border-border bg-background", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            title={tool.label}
            aria-label={tool.label}
            onClick={() => applyTool(tool)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-95"
          >
            <tool.icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="block w-full resize-y rounded-b-xl bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
