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

/* ----------------------- Fair-order shuffle helpers ----------------------- */

// Deterministic PRNG (mulberry32). Same seed → same sequence.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Returns a new array shuffled deterministically by the given numeric seed.
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Stable string hash (FNV-1a like). Same string → same number.
function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Orders items by a stable per-item key derived from two seeds + the item id.
// Adding a new item does NOT reshuffle existing items' relative order — each
// item keeps its own key. Changing `evalSeed` (admin shuffle) re-randomizes
// everyone's order at once. `deviceSeed` keeps each device's order distinct.
export function stableEvalOrder<T extends { id: string }>(
  items: T[],
  deviceSeed: number,
  evalSeed: number,
): T[] {
  const base = (deviceSeed >>> 0) ^ (evalSeed >>> 0);
  return [...items]
    .map((item) => ({
      item,
      key: hashString(`${base}:${item.id}`),
    }))
    .sort((a, b) =>
      a.key !== b.key ? a.key - b.key : a.item.id.localeCompare(b.item.id),
    )
    .map((x) => x.item);
}

const ORDER_SEED_KEY = "sendev:order-seed";

// Reads a persistent per-device seed from localStorage, creating one on first
// use. Returns null on the server (no localStorage).
export function getOrderSeed(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(ORDER_SEED_KEY);
    if (saved) {
      const n = Number(saved);
      if (Number.isFinite(n)) return n;
    }
    const seed = Math.floor(Math.random() * 0xffffffff);
    window.localStorage.setItem(ORDER_SEED_KEY, String(seed));
    return seed;
  } catch {
    return null;
  }
}
