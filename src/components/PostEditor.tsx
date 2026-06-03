import { useRef, useState } from "react";
import {
  Bold,
  Italic,
  Heading,
  List,
  ListOrdered,
  Link2,
  Image as ImageIcon,
  Quote,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PostEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

type WrapTool = {
  icon: typeof Bold;
  label: string;
  // Wraps the current selection: before + selection + after.
  wrap: { before: string; after: string };
};

type BlockTool = {
  icon: typeof Bold;
  label: string;
  // Prefixes each selected line (block formatting).
  linePrefix: string;
};

const formatTools: (WrapTool | BlockTool)[] = [
  { icon: Heading, label: "제목", linePrefix: "## " },
  { icon: Bold, label: "굵게", wrap: { before: "**", after: "**" } },
  { icon: Italic, label: "기울임", wrap: { before: "*", after: "*" } },
  { icon: Quote, label: "인용", linePrefix: "> " },
  { icon: List, label: "목록", linePrefix: "- " },
  { icon: ListOrdered, label: "번호 목록", linePrefix: "1. " },
];

// 10 years — effectively permanent signed URL for the private bucket.
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

export function PostEditor({
  value,
  onChange,
  placeholder = "내용을 입력해 주세요.",
  className,
  rows = 10,
}: PostEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const rememberSelection = () => {
    const el = ref.current;
    if (!el) return;
    selectionRef.current = { start: el.selectionStart, end: el.selectionEnd };
  };

  const applyFormat = (tool: WrapTool | BlockTool) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);

    let next = value;
    let cursorStart = start;
    let cursorEnd = end;

    if ("linePrefix" in tool) {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const block = value.slice(lineStart, end);
      const prefixed = block
        .split("\n")
        .map((line) => `${tool.linePrefix}${line}`)
        .join("\n");
      next = value.slice(0, lineStart) + prefixed + value.slice(end);
      cursorStart = lineStart;
      cursorEnd = lineStart + prefixed.length;
    } else {
      const { before, after } = tool.wrap;
      next = value.slice(0, start) + before + selected + after + value.slice(end);
      cursorStart = start + before.length;
      cursorEnd = cursorStart + selected.length;
    }

    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  // Inserts text at the last remembered selection, replacing it.
  const insertAtSelection = (text: string) => {
    const { start, end } = selectionRef.current;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    const cursor = start + text.length;
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  };

  const openLinkModal = () => {
    rememberSelection();
    const selected = value.slice(
      selectionRef.current.start,
      selectionRef.current.end,
    );
    setLinkTitle(selected);
    setLinkUrl("");
    setLinkOpen(true);
  };

  const confirmLink = () => {
    const title = linkTitle.trim();
    const url = linkUrl.trim();
    if (!url) {
      toast.error("URL을 입력해 주세요.");
      return;
    }
    insertAtSelection(`[${title || url}](${url})`);
    setLinkOpen(false);
  };

  const handleImagePick = () => {
    rememberSelection();
    fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 올릴 수 있어요.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("이미지 크기는 5MB 이하만 가능해요.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data, error: signError } = await supabase.storage
        .from("post-images")
        .createSignedUrl(path, SIGNED_URL_TTL);
      if (signError || !data?.signedUrl) throw signError ?? new Error("URL 생성 실패");

      insertAtSelection(`![${file.name}](${data.signedUrl})`);
      toast.success("이미지를 추가했어요!");
    } catch (err) {
      console.error("image upload failed", err);
      toast.error("이미지 업로드에 실패했어요.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn("rounded-xl border border-border bg-background", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
        {formatTools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            title={tool.label}
            aria-label={tool.label}
            onClick={() => applyFormat(tool)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-95"
          >
            <tool.icon className="h-4 w-4" />
          </button>
        ))}
        <button
          type="button"
          title="링크"
          aria-label="링크"
          onClick={openLinkModal}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-95"
        >
          <Link2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="이미지"
          aria-label="이미지"
          disabled={uploading}
          onClick={handleImagePick}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-95 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
        </button>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="block w-full resize-y rounded-b-xl bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>링크 삽입</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="link-title">링크 제목</Label>
              <Input
                id="link-title"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="예: 교육과정 안내자료"
                className="rounded-xl"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmLink();
                  }
                }}
                placeholder="https://example.com"
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                본문에는 URL이 노출되지 않고 "링크 제목" 카드로 표시됩니다.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLinkOpen(false)}
              className="rounded-xl active:scale-95"
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={confirmLink}
              className="rounded-xl active:scale-95"
            >
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
