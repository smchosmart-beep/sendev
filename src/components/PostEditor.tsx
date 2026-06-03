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
} from "lucide-react";
import { toast } from "sonner";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";
import Placeholder from "@tiptap/extension-placeholder";

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

// 10 years — effectively permanent signed URL for the private bucket.
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

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

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Markdown.configure({ html: false, linkify: true, breaks: true }),
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

  return (
    <div className={cn("rounded-xl border border-border bg-background", className)}>
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
        className="px-3 py-2.5 text-sm text-foreground"
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
