// Downloads a remote file (e.g. a Supabase signed URL) while preserving the
// original (possibly non-ASCII / Korean) filename.
//
// Why this exists: Supabase signed URLs carry the desired filename in a
// `?download=<name>` query param, but the storage server copies that value
// into Content-Disposition without RFC 5987 encoding, so browsers save the
// raw percent-encoded string as the filename. The `<a download>` attribute is
// also ignored for cross-origin links. Fetching into a same-origin Blob URL
// lets the `download` attribute take effect with the correct filename.
export async function downloadFile(url: string, fileName: string): Promise<void> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Give the browser a tick to start the download before revoking.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    // Fallback: open in a new tab so the user can still reach the file.
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

// Saves a text payload (e.g. Markdown) as a local file via a Blob URL.
export function downloadTextFile(
  fileName: string,
  content: string,
  mime = "text/markdown;charset=utf-8",
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "download.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
