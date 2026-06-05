import type { PostDTO } from "@/lib/platform.functions";

// Parses an episode number from a title like "... [뿌리강의 ep7 : RAG 챗봇]".
// Returns null when no "ep<number>" pattern is found.
export function parseEpisodeNo(title: string): number | null {
  const m = title.match(/ep\s*\.?\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

// Sorts posts within a series by episode number ascending; posts without an
// episode number fall back to creation order (oldest first).
export function sortSeriesPosts(posts: PostDTO[]): PostDTO[] {
  return [...posts].sort((a, b) => {
    const ea = parseEpisodeNo(a.title);
    const eb = parseEpisodeNo(b.title);
    if (ea !== null && eb !== null) return ea - eb;
    if (ea !== null) return -1;
    if (eb !== null) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export type LinkItem =
  | { kind: "series"; name: string; posts: PostDTO[] }
  | { kind: "single"; post: PostDTO };

// Groups link posts that share a non-empty series name into a single item,
// keeping first-appearance order. Posts without a series stay as individual
// cards interleaved at the position of their first occurrence.
export function groupLinksBySeries(links: PostDTO[]): LinkItem[] {
  const items: LinkItem[] = [];
  const seriesIndex = new Map<string, number>();

  for (const post of links) {
    const name = post.series.trim();
    if (!name) {
      items.push({ kind: "single", post });
      continue;
    }
    const existing = seriesIndex.get(name);
    if (existing === undefined) {
      seriesIndex.set(name, items.length);
      items.push({ kind: "series", name, posts: [post] });
    } else {
      const item = items[existing];
      if (item.kind === "series") item.posts.push(post);
    }
  }

  // Order each series' episodes for stable display.
  return items.map((item) =>
    item.kind === "series"
      ? { ...item, posts: sortSeriesPosts(item.posts) }
      : item,
  );
}
