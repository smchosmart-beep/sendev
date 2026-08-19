import { supabase } from "@/integrations/supabase/client";

// 10 years — effectively permanent signed URL for the private bucket.
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024; // 3MB

export interface AttachedFile {
  name: string;
  url: string;
}

/** post-files 버킷에 업로드하고 원래 파일명으로 내려받는 서명 URL을 돌려준다. */
export async function uploadAttachment(file: File): Promise<AttachedFile> {
  const extMatch = file.name.match(/\.([a-zA-Z0-9]{1,10})$/);
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : "";
  const path = `${crypto.randomUUID()}${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("post-files")
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data, error: signError } = await supabase.storage
    .from("post-files")
    .createSignedUrl(path, SIGNED_URL_TTL, { download: file.name });
  if (signError || !data?.signedUrl) throw signError ?? new Error("URL 생성 실패");

  return { name: file.name, url: data.signedUrl };
}

/** col5 등에 저장된 JSON 문자열을 안전하게 파싱한다. 실패하면 빈 배열. */
export function parseAttachments(raw: string | null | undefined): AttachedFile[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (v): v is AttachedFile =>
          !!v && typeof v.name === "string" && typeof v.url === "string",
      )
      .map((v) => ({ name: v.name, url: v.url }));
  } catch {
    return [];
  }
}

export function serializeAttachments(files: AttachedFile[]): string {
  return files.length === 0 ? "" : JSON.stringify(files);
}
