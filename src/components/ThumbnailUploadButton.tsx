import { useRef, useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { setPostThumbnail } from "@/lib/platform.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 years
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
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    for (const quality of [0.92, 0.85, 0.75, 0.65, 0.5]) {
      const blob = await canvasToBlob(canvas, quality);
      if (blob && blob.size <= MAX_UPLOAD_BYTES) return blob;
    }
    maxEdge = Math.round(maxEdge * 0.75);
  }
  // Last resort: return whatever the lowest quality produced.
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 800 / Math.max(img.width, img.height));
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

export function ThumbnailUploadButton({
  postId,
  categoryId,
  recommendedSize,
}: {
  postId: string;
  categoryId: string;
  recommendedSize: string;
}) {
  const queryClient = useQueryClient();
  const saveThumb = useServerFn(setPostThumbnail);
  const fileRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("이미지를 선택해주세요.");
      const blob = await compressImage(file);
      const path = `thumb-${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (uploadError) throw uploadError;
      const { data, error: signError } = await supabase.storage
        .from("post-images")
        .createSignedUrl(path, SIGNED_URL_TTL);
      if (signError || !data?.signedUrl) throw signError ?? new Error("URL 생성 실패");
      const res = await saveThumb({
        data: { postId, password: password.trim(), imageUrl: data.signedUrl },
      });
      if (!res.ok) throw new Error("PASSWORD");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", categoryId] });
      toast.success("썸네일을 적용했어요!");
      setOpen(false);
      setFile(null);
      setPassword("");
    },
    onError: (err) => {
      if (err instanceof Error && err.message === "PASSWORD") {
        toast.error("비밀번호가 일치하지 않아요.");
      } else {
        console.error("thumbnail upload failed", err);
        toast.error("썸네일 적용에 실패했어요.");
      }
    },
  });

  const handleOpenButton = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpenButton}
        aria-label="썸네일 설정"
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/85 text-foreground opacity-0 shadow-md backdrop-blur transition-opacity duration-200 group-hover:opacity-100 hover:bg-background active:scale-95"
      >
        <Settings className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent
          onClick={(e) => e.stopPropagation()}
          className="sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle>썸네일 설정</DialogTitle>
            <DialogDescription>
              카드에 표시할 미리보기 이미지를 직접 올릴 수 있어요. 권장 크기:{" "}
              <span className="font-medium text-foreground">{recommendedSize}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="thumb-file">이미지 파일</Label>
              <Input
                id="thumb-file"
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                업로드 시 자동으로 크기·용량이 최적화돼요. (약 1MB 이하 JPEG)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="thumb-pw">수정·삭제 비밀번호</Label>
              <Input
                id="thumb-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="글 등록 때 정한 비밀번호"
                className="rounded-xl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              className="rounded-xl active:scale-95"
              disabled={mutation.isPending}
              onClick={() => setOpen(false)}
            >
              취소
            </Button>
            <Button
              type="button"
              className="rounded-xl active:scale-95"
              disabled={mutation.isPending}
              onClick={() => {
                if (!file) {
                  toast.error("이미지를 선택해주세요.");
                  return;
                }
                if (!password.trim()) {
                  toast.error("비밀번호를 입력해주세요.");
                  return;
                }
                setBusy(true);
                mutation.mutate(undefined, { onSettled: () => setBusy(false) });
              }}
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "썸네일 적용"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
