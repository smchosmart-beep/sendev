import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Home,
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";

import { heroSlidesQueryOptions } from "@/lib/platform.queries";
import {
  uploadHeroImage,
  createHeroSlide,
  deleteHeroSlide,
  swapHeroSlideOrder,
} from "@/lib/platform.functions";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/home")({
  component: AdminHomePage,
});

const MAX_WIDTH = 1920;
const JPEG_QUALITY = 0.85;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 이미지를 최대폭(MAX_WIDTH)으로 축소하고 JPEG로 재인코딩한 뒤
 * base64 본문과 contentType을 반환합니다. (배너 업로드 용량 축소용)
 */
async function resizeImage(
  file: File,
): Promise<{ dataBase64: string; contentType: string }> {
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);

  const scale = Math.min(1, MAX_WIDTH / img.naturalWidth);
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // canvas를 못 쓰면 원본 그대로 업로드 (fallback)
    return {
      dataBase64: dataUrl.split(",")[1] ?? "",
      contentType: file.type || "image/jpeg",
    };
  }
  ctx.drawImage(img, 0, 0, width, height);
  const out = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return { dataBase64: out.split(",")[1] ?? "", contentType: "image/jpeg" };
}

function AdminHomePage() {
  const queryClient = useQueryClient();
  const { data: slides = [] } = useQuery(heroSlidesQueryOptions());

  const uploadFn = useServerFn(uploadHeroImage);
  const createFn = useServerFn(createHeroSlide);
  const deleteFn = useServerFn(deleteHeroSlide);
  const swapFn = useServerFn(swapHeroSlideOrder);

  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["hero-slides"] });

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let success = 0;
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const { dataBase64, contentType } = await resizeImage(file);
        const { url } = await uploadFn({
          data: {
            name: file.name.replace(/\.[^.]+$/, "") + ".jpg",
            contentType,
            dataBase64,
          },
        });
        await createFn({
          data: {
            imageUrl: url,
            caption: caption.trim(),
            linkUrl: linkUrl.trim(),
          },
        });
        success += 1;
      }
      if (success > 0) {
        toast.success(`이미지 ${success}장을 등록했어요!`);
        setCaption("");
        setLinkUrl("");
        await invalidate();
      } else {
        toast.error("이미지 파일만 업로드할 수 있어요.");
      }
    } catch {
      toast.error("업로드 중 문제가 발생했어요.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id, adminPassword: getAdminPassword() } }),
    onSuccess: async () => {
      toast.success("슬라이드를 삭제했어요.");
      await invalidate();
    },
    onError: () => toast.error("삭제 중 문제가 발생했어요."),
  });

  const swapMutation = useMutation({
    mutationFn: (vars: { id: string; otherId: string }) =>
      swapFn({ data: vars }),
    onSuccess: async () => {
      await invalidate();
    },
    onError: () => toast.error("순서 변경 중 문제가 발생했어요."),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Home className="h-5 w-5 text-primary" />
          홈 화면 구성
        </h2>
        <p className="text-sm text-muted-foreground">
          메인 화면 상단 배너에 표시할 이미지를 등록하세요. 여러 장을 올리면
          좌우로 스와이프하며 볼 수 있어요.
        </p>

        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="h-caption">문구 (선택)</Label>
              <Input
                id="h-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="배너 위에 표시할 짧은 문구"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="h-link">링크 주소 (선택)</Label>
              <Input
                id="h-link"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https:// 클릭 시 이동할 주소"
                className="rounded-xl"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            * 문구·링크는 이번에 업로드하는 이미지에 함께 적용됩니다.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="rounded-xl active:scale-95"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "업로드 중..." : "이미지 선택 (여러 장 가능)"}
          </Button>
        </div>
      </div>

      {slides.length > 0 ? (
        <div className="rounded-2xl bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            등록된 배너 ({slides.length})
          </h3>
          <ul className="space-y-3">
            {slides.map((s, i) => (
              <li
                key={s.id}
                className="flex items-center gap-4 rounded-xl border border-border p-3"
              >
                <img
                  src={s.imageUrl}
                  alt={s.caption || "배너 이미지"}
                  className="h-16 w-28 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {s.caption || "(문구 없음)"}
                  </p>
                  {s.linkUrl && (
                    <p className="truncate text-xs text-muted-foreground">
                      {s.linkUrl}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    disabled={i === 0 || swapMutation.isPending}
                    onClick={() =>
                      swapMutation.mutate({
                        id: s.id,
                        otherId: slides[i - 1].id,
                      })
                    }
                    className="rounded-lg active:scale-95"
                    aria-label="위로 이동"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    disabled={i === slides.length - 1 || swapMutation.isPending}
                    onClick={() =>
                      swapMutation.mutate({
                        id: s.id,
                        otherId: slides[i + 1].id,
                      })
                    }
                    className="rounded-lg active:scale-95"
                    aria-label="아래로 이동"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(s.id)}
                    className="rounded-lg active:scale-95"
                    aria-label="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState
          icon={Home}
          title="등록된 배너가 없어요."
          description="위에서 이미지를 업로드하면 메인 화면에 표시됩니다."
        />
      )}
    </div>
  );
}
