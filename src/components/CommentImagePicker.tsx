import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { uploadCommentImage } from "@/lib/image-upload";
import { Button } from "@/components/ui/button";

const MAX_IMAGES = 10;

export function CommentImagePicker({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - value.length;
    if (remaining <= 0) {
      toast.error(`이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있어요.`);
      return;
    }
    const picked = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of picked) {
        urls.push(await uploadCommentImage(file));
      }
      onChange([...value, ...urls]);
    } catch (err) {
      console.error("comment image upload failed", err);
      toast.error(
        err instanceof Error ? err.message : "이미지 업로드에 실패했어요.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || uploading || value.length >= MAX_IMAGES}
        onClick={() => fileRef.current?.click()}
        className="rounded-xl active:scale-95"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        이미지 첨부
      </Button>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url, i) => (
            <div
              key={url}
              className="group relative h-20 w-20 overflow-hidden rounded-lg border border-border"
            >
              <img
                src={url}
                alt={`첨부 이미지 ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                aria-label="이미지 제거"
                onClick={() => onChange(value.filter((u) => u !== url))}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-background/85 text-foreground shadow backdrop-blur transition hover:bg-background active:scale-95"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
