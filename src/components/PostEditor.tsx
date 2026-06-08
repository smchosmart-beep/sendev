import { useEffect, useRef, useState } from "react";
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
  Palette,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Paragraph } from "@tiptap/extension-paragraph";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Markdown } from "tiptap-markdown";
import Placeholder from "@tiptap/extension-placeholder";

import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// FontSize mark — adds a fontSize attribute on the textStyle mark so we can
// change body text size. Serialized to inline HTML by tiptap-markdown (html:true).
const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => el.style.fontSize || null,
            renderHTML: (attrs) =>
              attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }: any) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }: any) =>
          chain().setMark("textStyle", { fontSize: null }).run(),
    } as any;
  },
});

// tiptap-markdown has no built-in serializer for the textStyle mark, so color
// and font-size were silently dropped on save (text rendered black). Extend
// TextStyle to emit an inline <span style="..."> for those attributes.
const buildStyle = (attrs: Record<string, any>) => {
  const styles: string[] = [];
  if (attrs.color) styles.push(`color: ${attrs.color}`);
  if (attrs.fontSize) styles.push(`font-size: ${attrs.fontSize}`);
  return styles.join("; ");
};

const TextStyleWithMarkdown = TextStyle.extend({
  addStorage() {
    return {
      markdown: {
        serialize: {
          open(_state: any, mark: any) {
            const style = buildStyle(mark.attrs ?? {});
            return style ? `<span style="${style}">` : "";
          },
          close(_state: any, mark: any) {
            const style = buildStyle(mark.attrs ?? {});
            return style ? "</span>" : "";
          },
        },
      },
    };
  },
});

const TEXT_COLORS = [
  { label: "기본", value: null },
  { label: "검정", value: "#1a1a1a" },
  { label: "빨강", value: "#e11d48" },
  { label: "주황", value: "#ea580c" },
  { label: "노랑", value: "#ca8a04" },
  { label: "초록", value: "#16a34a" },
  { label: "파랑", value: "#2563eb" },
  { label: "보라", value: "#7c3aed" },
  { label: "회색", value: "#6b7280" },
];

const FONT_SIZES = [
  { label: "작게", value: "0.875rem" },
  { label: "보통", value: null },
  { label: "크게", value: "1.25rem" },
  { label: "매우 크게", value: "1.5rem" },
];

interface PostEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

// 10 years — effectively permanent signed URL for the private bucket.
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

// Keep stored images under ~1MB to save storage cost. We re-encode to JPEG in
// the browser (Canvas) before upload, shrinking dimensions and quality until the
// result fits the target size.
const MAX_UPLOAD_BYTES = 1024 * 1024; // 1MB

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 읽을 수 없어요."));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
  );
}

// Returns a JPEG Blob no larger than MAX_UPLOAD_BYTES (best effort).
async function compressImage(file: File): Promise<Blob> {
  const img = await loadImage(file);
  let maxEdge = 1600;

  for (let attempt = 0; attempt < 5; attempt++) {
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("이미지 변환에 실패했어요.");
    // Flatten transparency onto white so JPEG conversion looks correct.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    // Step quality down until it fits.
    for (const quality of [0.92, 0.85, 0.75, 0.65, 0.5]) {
      const blob = await canvasToBlob(canvas, quality);
      if (blob && blob.size <= MAX_UPLOAD_BYTES) return blob;
    }

    // Still too big — shrink dimensions and try again.
    maxEdge = Math.round(maxEdge * 0.75);
  }

  // Last resort: smallest quality at the reduced size.
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지 변환에 실패했어요.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await canvasToBlob(canvas, 0.5);
  if (!blob) throw new Error("이미지 변환에 실패했어요.");
  return blob;
}

type ToolButtonProps = {
  icon: typeof Bold;
  label: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function ToolButton({ icon: Icon, label, isActive, disabled, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-95 disabled:opacity-50",
        isActive && "bg-secondary text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function PostEditor({
  value,
  onChange,
  placeholder = "내용을 입력해 주세요.",
  className,
  rows = 10,
}: PostEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyleWithMarkdown,
      Color,
      FontSize,
      Image.configure({ inline: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Markdown.configure({ html: true, linkify: true, breaks: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "tiptap-editor focus:outline-none",
        style: `min-height: ${rows * 1.6}rem`,
      },
    },
    onUpdate: ({ editor }) => {
      const md = (editor.storage as any).markdown.getMarkdown();
      onChangeRef.current(md);
    },
  });

  // Keep the editor in sync when the value is reset/replaced externally
  // (e.g. switching between create/edit, loading existing post content).
  useEffect(() => {
    if (!editor) return;
    const current = (editor.storage as any).markdown.getMarkdown();
    if (value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value]);

  const openLinkModal = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to, " ");
    setLinkTitle(selected);
    setLinkUrl("");
    setLinkOpen(true);
  };

  const confirmLink = () => {
    if (!editor) return;
    const title = linkTitle.trim();
    const url = linkUrl.trim();
    if (!url) {
      toast.error("URL을 입력해 주세요.");
      return;
    }
    const text = title || url;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "text",
        text,
        marks: [{ type: "link", attrs: { href: url } }],
      })
      .run();
    setLinkOpen(false);
  };

  const handleImagePick = () => {
    fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 올릴 수 있어요.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("이미지 크기는 20MB 이하만 가능해요.");
      return;
    }

    setUploading(true);
    try {
      // Resize/compress to keep storage under ~1MB.
      const blob = await compressImage(file);
      const path = `${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (uploadError) throw uploadError;

      const { data, error: signError } = await supabase.storage
        .from("post-images")
        .createSignedUrl(path, SIGNED_URL_TTL);
      if (signError || !data?.signedUrl) throw signError ?? new Error("URL 생성 실패");

      editor
        .chain()
        .focus()
        .setImage({ src: data.signedUrl, alt: file.name })
        .run();
      toast.success("이미지를 추가했어요!");
    } catch (err) {
      console.error("image upload failed", err);
      toast.error("이미지 업로드에 실패했어요.");
    } finally {
      setUploading(false);
    }
  };

  const currentColor = (editor?.getAttributes("textStyle").color as string) ?? null;

  return (
    <div className={cn("min-w-0 overflow-hidden rounded-xl border border-border bg-background", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
        <ToolButton
          icon={Heading}
          label="제목"
          isActive={editor?.isActive("heading", { level: 2 })}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
        />
        <ToolButton
          icon={Bold}
          label="굵게"
          isActive={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        />
        <ToolButton
          icon={Italic}
          label="기울임"
          isActive={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        />

        {/* Text color palette */}
        <Popover open={colorOpen} onOpenChange={setColorOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              title="글자 색상"
              aria-label="글자 색상"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-95"
            >
              <Palette className="h-4 w-4" style={currentColor ? { color: currentColor } : undefined} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-xl p-2" align="start">
            <div className="grid grid-cols-4 gap-1.5">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  title={c.label}
                  aria-label={c.label}
                  onClick={() => {
                    if (c.value) editor?.chain().focus().setColor(c.value).run();
                    else editor?.chain().focus().unsetColor().run();
                    setColorOpen(false);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border transition-transform hover:scale-110 active:scale-95"
                  style={{ background: c.value ?? "transparent" }}
                >
                  {!c.value && <span className="text-[10px] text-muted-foreground">×</span>}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Font size */}
        <Popover open={sizeOpen} onOpenChange={setSizeOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              title="글자 크기"
              aria-label="글자 크기"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-95"
            >
              <Type className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-32 rounded-xl p-1" align="start">
            <div className="flex flex-col">
              {FONT_SIZES.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => {
                    if (s.value) (editor?.chain().focus() as any).setFontSize(s.value).run();
                    else (editor?.chain().focus() as any).unsetFontSize().run();
                    setSizeOpen(false);
                  }}
                  className="rounded-lg px-2 py-1.5 text-left text-foreground transition-colors hover:bg-secondary"
                  style={{ fontSize: s.value ?? "1rem" }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <ToolButton
          icon={Quote}
          label="인용"
          isActive={editor?.isActive("blockquote")}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        />
        <ToolButton
          icon={List}
          label="목록"
          isActive={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        />
        <ToolButton
          icon={ListOrdered}
          label="번호 목록"
          isActive={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        />
        <ToolButton icon={Link2} label="링크" onClick={openLinkModal} />
        <ToolButton
          icon={uploading ? Loader2 : ImageIcon}
          label="이미지"
          disabled={uploading}
          onClick={handleImagePick}
        />
      </div>

      <EditorContent
        editor={editor}
        data-placeholder={placeholder}
        className="min-w-0 overflow-x-hidden break-words px-3 py-2.5 text-sm text-foreground"
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
                본문에는 URL이 노출되지 않고 "링크 제목"으로 표시됩니다.
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

// Silence unused import warning when Editor type isn't referenced elsewhere.
export type { Editor };
