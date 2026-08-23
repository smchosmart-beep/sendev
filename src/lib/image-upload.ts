import { supabase } from "@/integrations/supabase/client";

// 10 years — effectively permanent signed URL for the private bucket.
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

// Keep stored images under ~1MB to save storage cost.
const MAX_UPLOAD_BYTES = 1024 * 1024; // 1MB

function loadImage(file: Blob): Promise<HTMLImageElement> {
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

// 회전(0/90/180/270)을 적용해 캔버스에 그린다. 90/270이면 가로·세로가 바뀐다.
function drawRotated(img: HTMLImageElement, w: number, h: number, rot: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지 변환에 실패했어요.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  const swap = rot === 90 || rot === 270;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate((rot * Math.PI) / 180);
  const dw = swap ? h : w;
  const dh = swap ? w : h;
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
  return canvas;
}

async function compressDrawn(img: HTMLImageElement, degrees = 0): Promise<Blob> {
  const rot = (((Math.round(degrees / 90) * 90) % 360) + 360) % 360;
  const swap = rot === 90 || rot === 270;
  const iw = swap ? img.height : img.width;
  const ih = swap ? img.width : img.height;
  let maxEdge = 1600;

  for (let attempt = 0; attempt < 5; attempt++) {
    const scale = Math.min(1, maxEdge / Math.max(iw, ih));
    const w = Math.max(1, Math.round(iw * scale));
    const h = Math.max(1, Math.round(ih * scale));
    const canvas = drawRotated(img, w, h, rot);

    for (const quality of [0.92, 0.85, 0.75, 0.65, 0.5]) {
      const blob = await canvasToBlob(canvas, quality);
      if (blob && blob.size <= MAX_UPLOAD_BYTES) return blob;
    }
    maxEdge = Math.round(maxEdge * 0.75);
  }

  const scale = Math.min(1, 800 / Math.max(iw, ih));
  const canvas = drawRotated(
    img,
    Math.max(1, Math.round(iw * scale)),
    Math.max(1, Math.round(ih * scale)),
    rot,
  );
  const blob = await canvasToBlob(canvas, 0.5);
  if (!blob) throw new Error("이미지 변환에 실패했어요.");
  return blob;
}

// Returns a JPEG Blob no larger than MAX_UPLOAD_BYTES (best effort).
export async function compressImage(file: Blob): Promise<Blob> {
  const img = await loadImage(file);
  return compressDrawn(img, 0);
}

/** 기존 이미지 URL을 읽어 90도 단위로 회전한 JPEG Blob(1MB 이하)을 만든다. */
export async function rotateImageBlob(url: string, degrees: number): Promise<Blob> {
  let source: Blob;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    source = await res.blob();
  } catch {
    throw new Error("이미지를 불러올 수 없어요. 잠시 후 다시 시도해 주세요.");
  }
  const img = await loadImage(source);
  return compressDrawn(img, degrees);
}

// Compress an image file and upload it to the post-images bucket, returning a
// long-lived signed URL.
export async function uploadCommentImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 올릴 수 있어요.");
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("이미지 크기는 20MB 이하만 가능해요.");
  }
  const blob = await compressImage(file);
  const path = `comment-${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("post-images")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (uploadError) throw uploadError;
  const { data, error: signError } = await supabase.storage
    .from("post-images")
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signError || !data?.signedUrl) throw signError ?? new Error("URL 생성 실패");
  return data.signedUrl;
}
