// Converts a sharable link (YouTube, Canva, Vimeo, ...) into an embeddable
// iframe URL. Returns null when the URL cannot be safely embedded, in which
// case callers should fall back to a plain external link.
export function getEmbedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const url = raw.trim();
  if (!/^https?:\/\//i.test(url)) return null;

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^www\./, "").toLowerCase();

  // YouTube
  if (host === "youtu.be") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    if (id) return `https://www.youtube.com/embed/${id}`;
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (u.pathname === "/watch") {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    const parts = u.pathname.split("/").filter(Boolean);
    if ((parts[0] === "shorts" || parts[0] === "embed") && parts[1]) {
      return `https://www.youtube.com/embed/${parts[1]}`;
    }
  }

  // Vimeo
  if (host === "vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
  }

  // Canva (public design / presentation share links)
  if (host === "canva.com") {
    // e.g. https://www.canva.com/design/DAF.../view
    if (u.pathname.includes("/design/")) {
      const base = url.split("?")[0].replace(/\/(view|edit|watch)?\/?$/, "");
      return `${base}/view?embed`;
    }
  }

  return null;
}

// Derives a preview thumbnail image URL for a sharable link. Currently only
// YouTube exposes a stable thumbnail endpoint; other providers return null so
// callers fall back to the cached OG image or an icon placeholder.
export function getThumbnailUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const url = raw.trim();
  if (!/^https?:\/\//i.test(url)) return null;

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  let id: string | null = null;

  if (host === "youtu.be") {
    id = u.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (host === "youtube.com" || host === "m.youtube.com") {
    if (u.pathname === "/watch") {
      id = u.searchParams.get("v");
    } else {
      const parts = u.pathname.split("/").filter(Boolean);
      if ((parts[0] === "shorts" || parts[0] === "embed") && parts[1]) {
        id = parts[1];
      }
    }
  }

  if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  return null;
}
