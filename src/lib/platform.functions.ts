import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Accepts https://github.com/owner/repo (with optional trailing path/slash).
export const GITHUB_URL_RE =
  /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+/i;


// All data access goes through the service-role admin client inside server
// handlers. RLS denies direct client access, so category passwords never reach
// the browser. The dynamic import keeps the server-only module out of the
// client bundle.
async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Types regenerate asynchronously; cast to keep handlers ergonomic.
  return supabaseAdmin as unknown as {
    from: (table: string) => any;
  };
}

// ----------------------------- Nickname ownership ----------------------------
// Anonymous community: authors are free-text. To stop nickname spoofing, a
// nickname is "claimed" with a password the first time it is used; subsequent
// posts/comments under the same (normalized) name must supply that password.
// The password is stored only as a SHA-256 hash and never returned to clients.

function normalizeName(name: string): string {
  return (name ?? "").trim().toLowerCase();
}

async function hashSecret(secret: string): Promise<string> {
  const bytes = new TextEncoder().encode(`sendev-nick:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Verifies (or first-time claims) ownership of an author nickname.
// Skips the check for empty names, "익명", and notice (운영진) posts.
async function ensureNicknameOwnership(
  db: { from: (t: string) => any },
  author: string,
  nicknamePassword: string,
  isNotice: boolean,
): Promise<void> {
  if (isNotice) return;
  const name = (author ?? "").trim();
  const key = normalizeName(name);
  if (!key || key === "익명") return;

  const { data: row, error } = await db
    .from("user_profiles")
    .select("id, nickname_password")
    .eq("username_key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const hasClaim = !!row && !!row.nickname_password;

  if (hasClaim) {
    if (!nicknamePassword) {
      throw new Error("이미 사용 중인 닉네임입니다. 닉네임 비밀번호를 입력해주세요.");
    }
    const incoming = await hashSecret(nicknamePassword);
    if (incoming !== row.nickname_password) {
      throw new Error("닉네임 비밀번호가 맞지 않습니다.");
    }
    return;
  }

  // First-time claim: require a password to lock the nickname.
  if (!nicknamePassword || nicknamePassword.trim().length < 4) {
    throw new Error("닉네임 비밀번호를 4자 이상 입력해 닉네임을 등록해주세요.");
  }
  const hashed = await hashSecret(nicknamePassword.trim());
  const { error: upErr } = await db.from("user_profiles").upsert(
    {
      username: name,
      username_key: key,
      nickname_password: hashed,
      claimed_at: new Date().toISOString(),
    },
    { onConflict: "username_key" },
  );
  if (upErr) throw new Error(upErr.message);
}

export type TabGroup = "hackathon" | "resources" | "devground" | "helloworld";

export interface CategoryDTO {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  hasPassword: boolean;
  githubRequired: boolean;
  enableNotice: boolean;
  enableQuestion: boolean;
  enableGeneral: boolean;
  enableProject: boolean;
  enableLink: boolean;
  generalName: string;
  projectName: string;
  linkName: string;
  tabGroup: TabGroup;
  evalOpen: boolean;
  evalSeed: number;
}

// Board slug: lowercase letters, digits and hyphens. Used in short URLs.
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,30}$/;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

export interface EventAttachment {
  name: string;
  url: string;
  size: number;
}

export interface EventLink {
  label: string;
  url: string;
}

export interface EventDTO {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  placeAddress: string;
  latitude: number | null;
  longitude: number | null;
  target: string;
  description: string;
  attachments: EventAttachment[];
  links: EventLink[];
}

export interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}


export interface PostDTO {
  id: string;
  categoryId: string;
  postNo: number;
  type: "notice" | "project" | "question" | "general" | "link";
  title: string;
  content: string;
  author: string;
  githubUrl: string;
  deployUrl: string;
  ogImageUrl: string;
  series: string;
  createdAt: string;
  commentCount: number;
}

export interface SearchResultDTO extends PostDTO {
  categorySlug: string;
  categoryName: string;
}

export interface CriterionDTO {
  id: string;
  categoryId: string;
  criterionName: string;
  maxScore: number;
  isActive: boolean;
  sortOrder: number;
}

export interface ReviewDTO {
  id: string;
  postId: string;
  reviewerName: string;
  scores: Record<string, number>;
  createdAt: string;
}

/* ----------------------------- Categories ----------------------------- */

export const listCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<CategoryDTO[]> => {
    const db = await getAdmin();
    const { data, error } = await db
      .from("categories")
      .select(
        "id, slug, name, description, sort_order, password, github_required, enable_notice, enable_question, enable_general, enable_project, enable_link, general_name, project_name, link_name, tab_group, eval_open, eval_seed",
      )
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((c: any) => ({
      id: c.id,
      slug: c.slug ?? "",
      name: c.name,
      description: c.description,
      sortOrder: c.sort_order,
      hasPassword: !!c.password,
      githubRequired: !!c.github_required,
      enableNotice: c.enable_notice ?? true,
      enableQuestion: c.enable_question ?? true,
      enableGeneral: c.enable_general ?? true,
      enableProject: c.enable_project ?? true,
      enableLink: c.enable_link ?? false,
      generalName: c.general_name ?? "일반게시판",
      projectName: c.project_name ?? "산출물",
      linkName: c.link_name ?? "링크",
      tabGroup: (c.tab_group ?? "hackathon") as TabGroup,
      evalOpen: !!c.eval_open,
      evalSeed: Number(c.eval_seed ?? 0),
    }));
  },
);

// Admin-only: returns the stored password for a single board so the edit
// modal can prefill it. Not exposed through listCategories to keep passwords
// out of the public board list.
export const getCategoryPassword = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<{ password: string }> => {
    const db = await getAdmin();
    const { data: row, error } = await db
      .from("categories")
      .select("password")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return { password: row?.password ?? "" };
  });

// Returns a slug unique across categories, deriving from `base` and appending a
// numeric suffix on collisions. `excludeId` lets an update keep its own slug.
async function ensureUniqueSlug(
  db: { from: (t: string) => any },
  base: string,
  excludeId?: string,
): Promise<string> {
  let candidate = slugify(base) || "board";
  for (let i = 0; i < 50; i++) {
    const trySlug = i === 0 ? candidate : `${candidate}-${i + 1}`;
    let query = db.from("categories").select("id").eq("slug", trySlug);
    if (excludeId) query = query.neq("id", excludeId);
    const { data: row } = await query.maybeSingle();
    if (!row) return trySlug;
  }
  return `${candidate}-${Date.now()}`;
}

export const createCategory = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        name: z.string().trim().min(1).max(100),
        slug: z.string().trim().max(31).optional(),
        description: z.string().trim().max(500).default(""),
        password: z.string().trim().max(100).default(""),
        githubRequired: z.boolean().default(false),
        enableNotice: z.boolean().default(true),
        enableQuestion: z.boolean().default(true),
        enableGeneral: z.boolean().default(true),
        enableProject: z.boolean().default(true),
        enableLink: z.boolean().default(false),
        generalName: z.string().trim().max(100).default("일반게시판"),
        projectName: z.string().trim().max(100).default("산출물"),
        linkName: z.string().trim().max(100).default("링크"),
        tabGroup: z
          .enum(["hackathon", "resources", "devground", "helloworld"])
          .default("hackathon"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await getAdmin();
    const { data: maxRow } = await db
      .from("categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (maxRow?.sort_order ?? 0) + 1;
    const slug = await ensureUniqueSlug(db, data.slug || data.name);
    const { error } = await db.from("categories").insert({
      name: data.name,
      slug,
      description: data.description,
      password: data.password,
      github_required: data.githubRequired,
      enable_notice: data.enableNotice,
      enable_question: data.enableQuestion,
      enable_general: data.enableGeneral,
      enable_project: data.enableProject,
      enable_link: data.enableLink,
      general_name: data.generalName || "일반게시판",
      project_name: data.projectName || "산출물",
      link_name: data.linkName || "링크",
      tab_group: data.tabGroup,
      sort_order: nextOrder,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateCategory = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(100),
        slug: z.string().trim().max(31).optional(),
        description: z.string().trim().max(500).default(""),
        // undefined = leave password unchanged
        password: z.string().trim().max(100).optional(),
        githubRequired: z.boolean().optional(),
        enableNotice: z.boolean().optional(),
        enableQuestion: z.boolean().optional(),
        enableGeneral: z.boolean().optional(),
        enableProject: z.boolean().optional(),
        enableLink: z.boolean().optional(),
        generalName: z.string().trim().max(100).optional(),
        projectName: z.string().trim().max(100).optional(),
        linkName: z.string().trim().max(100).optional(),
        tabGroup: z
          .enum(["hackathon", "resources", "devground", "helloworld"])
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await getAdmin();
    const patch: Record<string, unknown> = {
      name: data.name,
      description: data.description,
    };
    if (data.slug !== undefined && data.slug !== "") {
      patch.slug = await ensureUniqueSlug(db, data.slug, data.id);
    }
    if (data.password !== undefined) patch.password = data.password;
    if (data.githubRequired !== undefined)
      patch.github_required = data.githubRequired;
    if (data.enableNotice !== undefined) patch.enable_notice = data.enableNotice;
    if (data.enableQuestion !== undefined)
      patch.enable_question = data.enableQuestion;
    if (data.enableGeneral !== undefined)
      patch.enable_general = data.enableGeneral;
    if (data.enableProject !== undefined)
      patch.enable_project = data.enableProject;
    if (data.enableLink !== undefined) patch.enable_link = data.enableLink;
    if (data.generalName !== undefined)
      patch.general_name = data.generalName || "일반게시판";
    if (data.projectName !== undefined)
      patch.project_name = data.projectName || "산출물";
    if (data.linkName !== undefined)
      patch.link_name = data.linkName || "링크";
    if (data.tabGroup !== undefined) patch.tab_group = data.tabGroup;
    const { error } = await db.from("categories").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const db = await getAdmin();
    const { error } = await db.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin-only: opens evaluation for a board and shuffles the order by setting a
// new random eval_seed. Pressing it again re-shuffles everyone's order.
export const shuffleEvaluation = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const db = await getAdmin();
    const seed = Math.floor(Math.random() * 0x7fffffff);
    const { error } = await db
      .from("categories")
      .update({ eval_open: true, eval_seed: seed })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, seed };
  });

// Admin-only: closes evaluation for a board (locks submission again).
export const closeEvaluation = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const db = await getAdmin();
    const { error } = await db
      .from("categories")
      .update({ eval_open: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });



export const verifyBoardPassword = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        categoryId: z.string().uuid(),
        password: z.string().max(100),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const db = await getAdmin();
    const { data: row, error } = await db
      .from("categories")
      .select("password")
      .eq("id", data.categoryId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { ok: false };
    // Empty password = open board.
    if (!row.password) return { ok: true };
    return { ok: row.password === data.password };
  });

/* ------------------------------- Events ------------------------------- */

export const listEvents = createServerFn({ method: "GET" }).handler(
  async (): Promise<EventDTO[]> => {
    const db = await getAdmin();
    const { data, error } = await db
      .from("events")
      .select("id, title, date, time, location, place_address, latitude, longitude, target, description, attachments, links")
      .order("date", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((e: any) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      time: e.time,
      location: e.location,
      placeAddress: e.place_address ?? "",
      latitude: e.latitude ?? null,
      longitude: e.longitude ?? null,
      target: e.target ?? "",
      description: e.description,
      attachments: Array.isArray(e.attachments) ? e.attachments : [],
      links: Array.isArray(e.links) ? e.links : [],
    }));

  },
);

const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(255),
  url: z.string().trim().url().max(2000),
  size: z.number().int().min(0).default(0),
});

const linkSchema = z.object({
  label: z.string().trim().min(1).max(200),
  url: z.string().trim().url().max(2000),
});

const placeFields = {
  placeAddress: z.string().trim().max(300).default(""),
  latitude: z.number().min(-90).max(90).nullable().default(null),
  longitude: z.number().min(-180).max(180).nullable().default(null),
};

export const createEvent = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        title: z.string().trim().min(1).max(200),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().trim().max(100).default(""),
        location: z.string().trim().max(200).default(""),
        target: z.string().trim().max(200).default(""),
        description: z.string().trim().max(1000).default(""),
        ...placeFields,
        attachments: z.array(attachmentSchema).max(10).default([]),
        links: z.array(linkSchema).max(10).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { placeAddress, latitude, longitude, ...rest } = data;
    const db = await getAdmin();
    const { error } = await db.from("events").insert({
      ...rest,
      place_address: placeAddress,
      latitude,
      longitude,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateEvent = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).max(200),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().trim().max(100).default(""),
        location: z.string().trim().max(200).default(""),
        target: z.string().trim().max(200).default(""),
        description: z.string().trim().max(1000).default(""),
        ...placeFields,
        attachments: z.array(attachmentSchema).max(10).default([]),
        links: z.array(linkSchema).max(10).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { id, placeAddress, latitude, longitude, ...rest } = data;
    const db = await getAdmin();
    const { error } = await db
      .from("events")
      .update({ ...rest, place_address: placeAddress, latitude, longitude })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const searchPlaces = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ query: z.string().trim().min(1).max(100) }).parse(input),
  )
  .handler(async ({ data }): Promise<PlaceResult[]> => {
    const key = process.env.KAKAO_REST_API_KEY;
    if (!key) throw new Error("KAKAO_REST_API_KEY is not configured");
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(
      data.query,
    )}&size=10`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${key}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Kakao search failed (${res.status}): ${body}`);
    }
    const json: any = await res.json();
    return (json.documents ?? []).map((d: any) => ({
      name: d.place_name as string,
      address: (d.road_address_name || d.address_name || "") as string,
      lat: Number(d.y),
      lng: Number(d.x),
    }));
  });

// Uploads a base64-encoded file to the private event-files bucket and returns a
// long-lived signed URL stored alongside the event.
export const uploadEventFile = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        name: z.string().trim().min(1).max(255),
        contentType: z.string().trim().max(200).default("application/octet-stream"),
        dataBase64: z.string().min(1).max(15_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<EventAttachment> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bytes = Buffer.from(data.dataBase64, "base64");
    // Storage object keys must be ASCII-safe. Korean/spaces/special chars in the
    // original filename are kept only in the returned `name`, not in the key.
    const extMatch = data.name.match(/\.([a-zA-Z0-9]{1,10})$/);
    const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : "";
    const path = `${crypto.randomUUID()}${ext}`;
    const { error } = await supabaseAdmin.storage
      .from("event-files")
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (error) throw new Error(error.message);
    // 10-year signed URL so notices stay reachable.
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("event-files")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10, { download: data.name });
    if (signErr || !signed) throw new Error(signErr?.message ?? "signing failed");
    return { name: data.name, url: signed.signedUrl, size: bytes.length };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const db = await getAdmin();
    const { error } = await db.from("events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


/* -------------------------------- Posts ------------------------------- */

const POST_COLUMNS =
  "id, category_id, post_no, type, title, content, author, github_url, deploy_url, og_image_url, series, created_at";

export const listPosts = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ categoryId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<PostDTO[]> => {
    const db = await getAdmin();
    const { data: rows, error } = await db
      .from("posts")
      .select(POST_COLUMNS)
      .eq("category_id", data.categoryId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const posts = rows ?? [];
    const postIds = posts.map((p: any) => p.id);

    // 게시물별 댓글 수(답글 포함)를 한 번의 조회로 집계한다.
    const counts: Record<string, number> = {};
    if (postIds.length > 0) {
      const { data: commentRows, error: cErr } = await db
        .from("comments")
        .select("post_id")
        .in("post_id", postIds);
      if (cErr) throw new Error(cErr.message);
      for (const c of commentRows ?? []) {
        const pid = String((c as any).post_id);
        counts[pid] = (counts[pid] ?? 0) + 1;
      }
    }

    return posts.map((p: any) => mapPost(p, counts[String(p.id)] ?? 0));
  });

export const getPost = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<PostDTO | null> => {
    const db = await getAdmin();
    const { data: row, error } = await db
      .from("posts")
      .select(POST_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ? mapPost(row) : null;
  });

// Resolves a post by its board slug + per-board number for short URLs.
export const getPostByNo = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ slug: z.string().min(1).max(31), postNo: z.number().int().positive() }).parse(input),
  )
  .handler(async ({ data }): Promise<PostDTO | null> => {
    const db = await getAdmin();
    const { data: cat } = await db
      .from("categories")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!cat) return null;
    const { data: row, error } = await db
      .from("posts")
      .select(POST_COLUMNS)
      .eq("category_id", cat.id)
      .eq("post_no", data.postNo)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ? mapPost(row) : null;
  });

// Searches all posts by title, title+content, or author across every category.
export const searchPosts = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        q: z.string().trim().min(1).max(100),
        mode: z.enum(["title", "title_content", "author"]).default("title"),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<SearchResultDTO[]> => {
    const db = await getAdmin();
    // Escape PostgREST ilike wildcards in the user query.
    const term = data.q.replace(/[%_,]/g, (m) => `\\${m}`);
    const pattern = `%${term}%`;

    let query = db
      .from("posts")
      .select(`${POST_COLUMNS}, categories!inner(slug, name)`)
      .order("created_at", { ascending: false })
      .limit(100);

    if (data.mode === "title") {
      query = query.ilike("title", pattern);
    } else if (data.mode === "author") {
      query = query.ilike("author", pattern);
    } else {
      query = query.or(`title.ilike.${pattern},content.ilike.${pattern}`);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const posts = rows ?? [];
    const postIds = posts.map((p: any) => p.id);

    const counts: Record<string, number> = {};
    if (postIds.length > 0) {
      const { data: commentRows, error: cErr } = await db
        .from("comments")
        .select("post_id")
        .in("post_id", postIds);
      if (cErr) throw new Error(cErr.message);
      for (const c of commentRows ?? []) {
        const pid = String((c as any).post_id);
        counts[pid] = (counts[pid] ?? 0) + 1;
      }
    }

    return posts.map((p: any) => ({
      ...mapPost(p, counts[String(p.id)] ?? 0),
      categorySlug: p.categories?.slug ?? "",
      categoryName: p.categories?.name ?? "",
    }));
  });


export const createPost = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        categoryId: z.string().uuid(),
        type: z.enum(["notice", "project", "question", "general", "link"]),
        title: z.string().trim().min(1).max(200),
        content: z.string().max(20000).default(""),
        author: z.string().trim().max(100).default(""),
        githubUrl: z.string().trim().max(300).default(""),
        deployUrl: z.string().trim().max(300).default(""),
        series: z.string().trim().max(100).default(""),
        editPassword: z.string().trim().min(1).max(100),
        nicknamePassword: z.string().trim().max(100).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await getAdmin();
    // Enforce per-board GitHub link requirement.
    const { data: cat } = await db
      .from("categories")
      .select("github_required")
      .eq("id", data.categoryId)
      .maybeSingle();
    if (cat?.github_required && data.type === "project") {
      if (!GITHUB_URL_RE.test(data.githubUrl)) {
        throw new Error("이 카테고리은 GitHub 링크가 필수입니다.");
      }
    }
    // Notices are authored by the operations team.
    const author = data.type === "notice" ? "운영진" : data.author;
    // Verify the author owns this nickname (or claim it on first use).
    await ensureNicknameOwnership(
      db,
      author,
      data.nicknamePassword,
      data.type === "notice",
    );
    // Resolve and cache the deploy site's OG image once at creation time so the
    // board never re-fetches the external site on subsequent loads.
    const ogImageUrl = data.deployUrl
      ? (await resolveOgImage(data.deployUrl)) ?? ""
      : "";
    // Assign the next per-board number, retrying once on a unique collision.
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: maxRow } = await db
        .from("posts")
        .select("post_no")
        .eq("category_id", data.categoryId)
        .order("post_no", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextNo = (maxRow?.post_no ?? 0) + 1;
      const { error } = await db.from("posts").insert({
        category_id: data.categoryId,
        post_no: nextNo,
        type: data.type,
        title: data.title,
        content: data.content,
        author,
        github_url: data.githubUrl,
        deploy_url: data.deployUrl,
        og_image_url: ogImageUrl,
        series: data.series,
        edit_password: data.editPassword,
      });
      if (!error) return { ok: true, postNo: nextNo };
      // Retry on unique violation (concurrent insert); otherwise fail.
      if (!String(error.message ?? "").toLowerCase().includes("duplicate")) {
        throw new Error(error.message);
      }
    }
    throw new Error("게시글 번호를 부여하지 못했어요. 다시 시도해주세요.");
  });


// Verifies the registrant's edit/delete password for a post.
async function checkPostPassword(
  db: { from: (t: string) => any },
  id: string,
  password: string,
): Promise<boolean> {
  const { data: row, error } = await db
    .from("posts")
    .select("edit_password")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  // Admin master password: bypasses the per-post password. Read server-side
  // only (never reaches the client bundle). Empty input never matches.
  const master = process.env.POST_MASTER_PASSWORD;
  if (master && password.length > 0 && password === master) return true;
  if (!row) return false;
  return !!row.edit_password && row.edit_password === password;
}

export const verifyPostPassword = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ id: z.string().uuid(), password: z.string().max(100) })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const db = await getAdmin();
    return { ok: await checkPostPassword(db, data.id, data.password) };
  });

export const updatePost = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        password: z.string().max(100),
        title: z.string().trim().min(1).max(200),
        content: z.string().max(20000).optional(),
        author: z.string().trim().max(100).optional(),
        githubUrl: z.string().trim().max(300).default(""),
        deployUrl: z.string().trim().max(300).default(""),
        series: z.string().trim().max(100).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const db = await getAdmin();
    if (!(await checkPostPassword(db, data.id, data.password))) {
      return { ok: false };
    }
    // Only re-resolve the OG image when the deploy URL actually changed; keep
    // the cached value otherwise to avoid redundant external requests.
    const { data: existing } = await db
      .from("posts")
      .select("type, deploy_url, og_image_url")
      .eq("id", data.id)
      .maybeSingle();
    let ogImageUrl = existing?.og_image_url ?? "";
    if (data.deployUrl !== (existing?.deploy_url ?? "")) {
      ogImageUrl = data.deployUrl
        ? (await resolveOgImage(data.deployUrl)) ?? ""
        : "";
    }
    const patch: Record<string, unknown> = {
      title: data.title,
      github_url: data.githubUrl,
      deploy_url: data.deployUrl,
      og_image_url: ogImageUrl,
    };
    if (data.series !== undefined) patch.series = data.series;
    if (data.content !== undefined) patch.content = data.content;
    // Notices stay authored by the operations team; others can update author.
    if (existing?.type === "notice") {
      patch.author = "운영진";
    } else if (data.author !== undefined) {
      patch.author = data.author;
    }
    const { error } = await db.from("posts").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePost = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ id: z.string().uuid(), password: z.string().max(100) })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const db = await getAdmin();
    if (!(await checkPostPassword(db, data.id, data.password))) {
      return { ok: false };
    }
    const { error } = await db.from("posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin-only: moves a general/question post to another board (category).
// Only the admin master password is accepted — per-post passwords cannot move.
export const movePost = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        password: z.string().max(100),
        targetCategoryId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(
    async ({
      data,
    }): Promise<{ ok: boolean; slug?: string; postNo?: number }> => {
      const master = process.env.POST_MASTER_PASSWORD;
      if (!master || data.password.length === 0 || data.password !== master) {
        return { ok: false };
      }
      const db = await getAdmin();
      const { data: post, error: postErr } = await db
        .from("posts")
        .select("type, category_id")
        .eq("id", data.id)
        .maybeSingle();
      if (postErr) throw new Error(postErr.message);
      if (!post) return { ok: false };
      if (post.type !== "general" && post.type !== "question") {
        throw new Error("일반/질문 게시글만 이동할 수 있어요.");
      }
      const { data: target, error: catErr } = await db
        .from("categories")
        .select("slug, enable_general, enable_question")
        .eq("id", data.targetCategoryId)
        .maybeSingle();
      if (catErr) throw new Error(catErr.message);
      if (!target) return { ok: false };
      // Convert the post type to match the destination board so it shows up
      // in the right section (general boards -> general, question boards ->
      // question). Fall back to the existing type otherwise.
      const newType = target.enable_general
        ? "general"
        : target.enable_question
          ? "question"
          : post.type;
      // Assign the next per-board number in the target board, retrying on
      // a unique collision (concurrent insert/move).
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: maxRow } = await db
          .from("posts")
          .select("post_no")
          .eq("category_id", data.targetCategoryId)
          .order("post_no", { ascending: false })
          .limit(1)
          .maybeSingle();
        const nextNo = (maxRow?.post_no ?? 0) + 1;
        const { error } = await db
          .from("posts")
          .update({
            category_id: data.targetCategoryId,
            post_no: nextNo,
            type: newType,
          })
          .eq("id", data.id);
        if (!error) return { ok: true, slug: target.slug ?? "", postNo: nextNo };
        if (!String(error.message ?? "").toLowerCase().includes("duplicate")) {
          throw new Error(error.message);
        }
      }
      throw new Error("게시글 번호를 부여하지 못했어요. 다시 시도해주세요.");
    },
  );

function mapPost(p: any, commentCount = 0): PostDTO {
  return {
    id: p.id,
    categoryId: p.category_id,
    postNo: p.post_no ?? 0,
    type: p.type,
    title: p.title,
    content: p.content ?? "",
    author: p.author,
    githubUrl: p.github_url,
    deployUrl: p.deploy_url ?? "",
    ogImageUrl: p.og_image_url ?? "",
    series: p.series ?? "",
    createdAt: p.created_at,
    commentCount,
  };
}

/* --------------------------- Review criteria -------------------------- */

export const listCriteria = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        categoryId: z.string().uuid(),
        activeOnly: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<CriterionDTO[]> => {
    const db = await getAdmin();
    let query = db
      .from("review_criteria")
      .select("id, category_id, criterion_name, max_score, is_active, sort_order")
      .eq("category_id", data.categoryId)
      .order("sort_order", { ascending: true });
    if (data.activeOnly) query = query.eq("is_active", true);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []).map(mapCriterion);
  });

export const createCriterion = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        categoryId: z.string().uuid(),
        criterionName: z.string().trim().min(1).max(200),
        maxScore: z.number().int().min(1).max(100).default(5),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await getAdmin();
    const { data: maxRow } = await db
      .from("review_criteria")
      .select("sort_order")
      .eq("category_id", data.categoryId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (maxRow?.sort_order ?? 0) + 1;
    const { error } = await db.from("review_criteria").insert({
      category_id: data.categoryId,
      criterion_name: data.criterionName,
      max_score: data.maxScore,
      sort_order: nextOrder,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateCriterion = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        criterionName: z.string().trim().min(1).max(200).optional(),
        maxScore: z.number().int().min(1).max(100).optional(),
        isActive: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await getAdmin();
    const patch: Record<string, unknown> = {};
    if (data.criterionName !== undefined) patch.criterion_name = data.criterionName;
    if (data.maxScore !== undefined) patch.max_score = data.maxScore;
    if (data.isActive !== undefined) patch.is_active = data.isActive;
    const { error } = await db
      .from("review_criteria")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCriterion = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const db = await getAdmin();
    const { error } = await db.from("review_criteria").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

function mapCriterion(c: any): CriterionDTO {
  return {
    id: c.id,
    categoryId: c.category_id,
    criterionName: c.criterion_name,
    maxScore: c.max_score,
    isActive: c.is_active,
    sortOrder: c.sort_order,
  };
}

/* ------------------------------- Reviews ------------------------------ */

export const listReviews = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ postId: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<ReviewDTO[]> => {
    const db = await getAdmin();
    const { data: rows, error } = await db
      .from("reviews")
      .select("id, post_id, reviewer_name, scores, created_at")
      .eq("post_id", data.postId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      postId: r.post_id,
      reviewerName: r.reviewer_name,
      scores: (r.scores ?? {}) as Record<string, number>,
      createdAt: r.created_at,
    }));
  });

export const createReview = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        postId: z.string().uuid(),
        reviewerName: z.string().trim().min(1).max(100),
        scores: z.record(z.string().uuid(), z.number().min(0).max(100)),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await getAdmin();
    const { data: existing } = await db
      .from("reviews")
      .select("id")
      .eq("post_id", data.postId)
      .eq("reviewer_name", data.reviewerName)
      .maybeSingle();

    const { error } = await db.from("reviews").upsert(
      {
        post_id: data.postId,
        reviewer_name: data.reviewerName,
        scores: data.scores,
      },
      { onConflict: "post_id,reviewer_name" },
    );
    if (error) throw new Error(error.message);
    return { ok: true, updated: !!existing };
  });

export const getMyReview = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        postId: z.string().uuid(),
        reviewerName: z.string().trim().min(1).max(100),
      })
      .parse(input),
  )
  .handler(
    async ({
      data,
    }): Promise<{
      found: boolean;
      createdAt?: string;
      scores?: Record<string, number>;
    }> => {
      const db = await getAdmin();
      const { data: row, error } = await db
        .from("reviews")
        .select("created_at, scores")
        .eq("post_id", data.postId)
        .eq("reviewer_name", data.reviewerName)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!row) return { found: false };
      return {
        found: true,
        createdAt: row.created_at,
        scores: (row.scores ?? {}) as Record<string, number>,
      };
    },
  );

export const listMyReviewedPostIds = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({ reviewerName: z.string().trim().min(1).max(100) })
      .parse(input),
  )
  .handler(async ({ data }): Promise<string[]> => {
    const db = await getAdmin();
    const { data: rows, error } = await db
      .from("reviews")
      .select("post_id")
      .eq("reviewer_name", data.reviewerName);
    if (error) throw new Error(error.message);
    // 정렬해 반환 → 쿼리 데이터 안정화(불필요한 리렌더/리페치 방지)
    const ids: string[] = Array.from(
      new Set((rows ?? []).map((r: any) => String(r.post_id))),
    );
    ids.sort();
    return ids;
  });

/* ------------------------------ Comments ------------------------------ */

export interface CommentDTO {
  id: string;
  postId: string;
  parentId: string | null;
  author: string;
  content: string;
  imageUrls: string[];
  createdAt: string;
}

function mapComment(c: any): CommentDTO {
  return {
    id: c.id,
    postId: c.post_id,
    parentId: c.parent_id ?? null,
    author: c.author ?? "익명",
    content: c.content ?? "",
    imageUrls: Array.isArray(c.image_urls) ? c.image_urls : [],
    createdAt: c.created_at,
  };
}

export const listComments = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ postId: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<CommentDTO[]> => {
    const db = await getAdmin();
    const { data: rows, error } = await db
      .from("comments")
      .select("id, post_id, parent_id, author, content, image_urls, created_at")
      .eq("post_id", data.postId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []).map(mapComment);
  });

export const createComment = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        postId: z.string().uuid(),
        parentId: z.string().uuid().nullable().default(null),
        author: z.string().trim().max(100).default(""),
        content: z.string().trim().max(5000).default(""),
        imageUrls: z.array(z.string().url().max(2000)).max(10).default([]),
        editPassword: z.string().trim().min(1).max(100),
        nicknamePassword: z.string().trim().max(100).default(""),
      })
      .refine((v) => v.content.length > 0 || v.imageUrls.length > 0, {
        message: "내용 또는 이미지를 입력해주세요.",
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const db = await getAdmin();
    // Verify the commenter owns this nickname (or claim it on first use).
    await ensureNicknameOwnership(db, data.author, data.nicknamePassword, false);
    // A reply must point to an existing top-level comment on the same post.
    let parentId: string | null = null;
    if (data.parentId) {
      const { data: parent } = await db
        .from("comments")
        .select("id, post_id, parent_id")
        .eq("id", data.parentId)
        .maybeSingle();
      if (parent && parent.post_id === data.postId && !parent.parent_id) {
        parentId = parent.id;
      }
    }
    const { error } = await db.from("comments").insert({
      post_id: data.postId,
      parent_id: parentId,
      author: data.author || "익명",
      content: data.content,
      image_urls: data.imageUrls,
      edit_password: data.editPassword,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteComment = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ id: z.string().uuid(), password: z.string().max(100) })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const db = await getAdmin();
    const { data: row, error: selErr } = await db
      .from("comments")
      .select("edit_password")
      .eq("id", data.id)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);
    if (!row) return { ok: false };
    // Admin master password bypasses the per-comment password.
    const master = process.env.POST_MASTER_PASSWORD;
    const isMaster = !!master && data.password.length > 0 && data.password === master;
    if (!isMaster && !(row.edit_password && row.edit_password === data.password)) {
      return { ok: false };
    }
    // Remove replies first, then the comment itself.
    await db.from("comments").delete().eq("parent_id", data.id);
    const { error } = await db.from("comments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ----------------------------- GitHub README -------------------------- */

export const fetchReadme = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ githubUrl: z.string().trim().min(1).max(300) }).parse(input),
  )
  .handler(
    async ({ data }): Promise<{ markdown: string | null; error: string | null }> => {
      const match = data.githubUrl.match(
        /github\.com\/([^/\s]+)\/([^/\s#?]+)/i,
      );
      if (!match) {
        return { markdown: null, error: "올바른 GitHub 저장소 링크가 아니에요." };
      }
      const owner = match[1];
      const repo = match[2].replace(/\.git$/i, "");
      const branches = ["main", "master"];
      const files = ["README.md", "readme.md", "README.MD", "Readme.md"];
      try {
        for (const branch of branches) {
          for (const file of files) {
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file}`;
            const res = await fetch(rawUrl);
            if (res.ok) {
              const markdown = await res.text();
              return { markdown, error: null };
            }
          }
        }
        return {
          markdown: null,
          error: "README.md를 찾을 수 없어요. 저장소가 공개 상태인지 확인해주세요.",
        };
      } catch (e) {
        console.error("fetchReadme failed:", e);
        return { markdown: null, error: "README를 불러오는 중 문제가 발생했어요." };
      }
    },
  );

/* ----------------------------- Deploy OG image ------------------------ */

function extractMetaContent(html: string, keys: string[]): string | null {
  for (const key of keys) {
    // property="og:image" content="..."  (either attribute order)
    const re1 = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']`,
      "i",
    );
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["']`,
      "i",
    );
    const m = html.match(re1) ?? html.match(re2);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

// Server-only OG image resolver. Returns an absolute https(s) image URL or null.
// Reused by fetchOgImage (client fallback/backfill) and create/updatePost (cache).
async function resolveOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EduShareBot/1.0)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    // Read at most ~512KB of HTML; OG tags live in <head>.
    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      const decoder = new TextDecoder();
      let received = 0;
      const MAX = 512 * 1024;
      while (received < MAX) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        html += decoder.decode(value, { stream: true });
        if (html.includes("</head>")) break;
      }
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
    } else {
      html = await res.text();
    }

    const raw = extractMetaContent(html, [
      "og:image:secure_url",
      "og:image",
      "twitter:image",
      "twitter:image:src",
    ]);
    if (!raw) return null;

    // Resolve relative URLs against the page URL.
    let resolved: string;
    try {
      resolved = new URL(raw, url).href;
    } catch {
      return null;
    }
    if (!/^https?:\/\//i.test(resolved)) return null;
    return resolved;
  } catch (e) {
    console.error("resolveOgImage failed:", e);
    return null;
  }
}

export const fetchOgImage = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ url: z.string().trim().url().max(500) }).parse(input),
  )
  .handler(async ({ data }): Promise<{ image: string | null }> => {
    return { image: await resolveOgImage(data.url) };
  });

// Backfills the cached OG image for an existing post whose og_image_url is
// empty. Resolves once, stores it, and returns the image so the board can show
// it immediately and never re-fetch the external site again.
export const refreshOgImage = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ postId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<{ image: string | null }> => {
    const db = await getAdmin();
    const { data: row } = await db
      .from("posts")
      .select("deploy_url, og_image_url")
      .eq("id", data.postId)
      .maybeSingle();
    if (!row) return { image: null };
    if (row.og_image_url) return { image: row.og_image_url };
    if (!row.deploy_url) return { image: null };
    const image = await resolveOgImage(row.deploy_url);
    // Persist even empty result is avoided: only cache successful resolutions
    // so we can retry later if the site was temporarily unreachable.
    if (image) {
      await db
        .from("posts")
        .update({ og_image_url: image })
        .eq("id", data.postId);
    }
    return { image };
  });

// Sets a custom thumbnail (og_image_url) for a post after verifying the
// registrant's edit/delete password. The image is uploaded from the browser to
// the post-images bucket first; this only stores the resulting signed URL.
export const setPostThumbnail = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        postId: z.string().uuid(),
        password: z.string().max(100),
        imageUrl: z.string().trim().url().max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; image: string | null }> => {
    const db = await getAdmin();
    const ok = await checkPostPassword(db, data.postId, data.password);
    if (!ok) return { ok: false, image: null };
    const { error } = await db
      .from("posts")
      .update({ og_image_url: data.imageUrl })
      .eq("id", data.postId);
    if (error) throw new Error(error.message);
    return { ok: true, image: data.imageUrl };
  });


/* ------------------------------ Hero slides ----------------------------- */

export interface HeroSlideDTO {
  id: string;
  imageUrl: string;
  caption: string;
  linkUrl: string;
  sortOrder: number;
}

export const listHeroSlides = createServerFn({ method: "GET" }).handler(
  async (): Promise<HeroSlideDTO[]> => {
    const db = await getAdmin();
    const { data, error } = await db
      .from("hero_slides")
      .select("id, image_url, caption, link_url, sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((s: any) => ({
      id: s.id,
      imageUrl: s.image_url,
      caption: s.caption ?? "",
      linkUrl: s.link_url ?? "",
      sortOrder: s.sort_order ?? 0,
    }));
  },
);

// Uploads a base64-encoded image to the private hero-images bucket and returns a
// long-lived signed URL.
export const uploadHeroImage = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        name: z.string().trim().min(1).max(255),
        contentType: z.string().trim().max(200).default("image/jpeg"),
        dataBase64: z.string().min(1).max(15_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ url: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bytes = Buffer.from(data.dataBase64, "base64");
    const extMatch = data.name.match(/\.([a-zA-Z0-9]{1,10})$/);
    const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : "";
    const path = `${crypto.randomUUID()}${ext}`;
    const { error } = await supabaseAdmin.storage
      .from("hero-images")
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (error) throw new Error(error.message);
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("hero-images")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (signErr || !signed) throw new Error(signErr?.message ?? "signing failed");
    return { url: signed.signedUrl };
  });

export const createHeroSlide = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        imageUrl: z.string().trim().url().max(2000),
        caption: z.string().trim().max(200).default(""),
        linkUrl: z.string().trim().max(2000).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await getAdmin();
    const { data: rows } = await db
      .from("hero_slides")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);
    const nextOrder = rows && rows[0] ? (rows[0].sort_order ?? 0) + 1 : 0;
    const { error } = await db.from("hero_slides").insert({
      image_url: data.imageUrl,
      caption: data.caption,
      link_url: data.linkUrl,
      sort_order: nextOrder,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteHeroSlide = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const db = await getAdmin();
    const { error } = await db.from("hero_slides").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Swaps the sort_order of two slides to move one up or down.
export const swapHeroSlideOrder = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        otherId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await getAdmin();
    const { data: rows, error } = await db
      .from("hero_slides")
      .select("id, sort_order")
      .in("id", [data.id, data.otherId]);
    if (error) throw new Error(error.message);
    const a = (rows ?? []).find((r: any) => r.id === data.id);
    const b = (rows ?? []).find((r: any) => r.id === data.otherId);
    if (!a || !b) throw new Error("slide not found");
    await db.from("hero_slides").update({ sort_order: b.sort_order }).eq("id", a.id);
    await db.from("hero_slides").update({ sort_order: a.sort_order }).eq("id", b.id);
    return { ok: true };
  });

// Swaps the sort_order of two categories to move one up or down within a tab.
export const swapCategoryOrder = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        otherId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await getAdmin();
    const { data: rows, error } = await db
      .from("categories")
      .select("id, sort_order")
      .in("id", [data.id, data.otherId]);
    if (error) throw new Error(error.message);
    const a = (rows ?? []).find((r: any) => r.id === data.id);
    const b = (rows ?? []).find((r: any) => r.id === data.otherId);
    if (!a || !b) throw new Error("category not found");
    await db.from("categories").update({ sort_order: b.sort_order }).eq("id", a.id);
    await db.from("categories").update({ sort_order: a.sort_order }).eq("id", b.id);
    return { ok: true };
  });


// ============================================================
// User profiles: levels are computed automatically from activity
// (posts × 5 + comments × 1), awards are admin-managed. No auth in this
// app, so badges are matched by exact (normalized) name.
// ============================================================

export interface UserProfileDTO {
  id: string;
  username: string;
  level: number | null;
  award: string;
  postCount: number;
  commentCount: number;
  points: number;
}

// Public display map keyed by normalized username.
export interface ProfileBadge {
  level: number | null;
  award: string;
}
export type ProfileMap = Record<string, ProfileBadge>;

// Normalizes a username for exact matching (trim + lowercase).
export function normalizeUsername(name: string): string {
  return name.trim().toLowerCase();
}

// Activity scoring: posts are worth 5 points, comments 1 point.
// Linear mapping so that ~200 posts (1000 points) reaches Lv.99.
export function levelFromActivity(
  postCount: number,
  commentCount: number,
): number | null {
  const points = postCount * 5 + commentCount * 1;
  if (points <= 0) return null;
  const level = Math.round((points * 99) / 1000);
  return Math.min(99, Math.max(1, level));
}

// Aggregates posts + comments by normalized author name.
async function getActivityCounts(db: any): Promise<
  Map<string, { postCount: number; commentCount: number }>
> {
  const counts = new Map<string, { postCount: number; commentCount: number }>();
  const bump = (name: string, kind: "post" | "comment") => {
    const key = normalizeUsername(name ?? "");
    if (!key) return;
    const cur = counts.get(key) ?? { postCount: 0, commentCount: 0 };
    if (kind === "post") cur.postCount += 1;
    else cur.commentCount += 1;
    counts.set(key, cur);
  };

  const [postsRes, commentsRes] = await Promise.all([
    db.from("posts").select("author"),
    db.from("comments").select("author"),
  ]);
  if (postsRes.error) throw new Error(postsRes.error.message);
  if (commentsRes.error) throw new Error(commentsRes.error.message);
  for (const r of postsRes.data ?? []) bump(r.author, "post");
  for (const r of commentsRes.data ?? []) bump(r.author, "comment");
  return counts;
}

// Admin: full list of profile mappings with computed levels + activity.
export const listUserProfiles = createServerFn({ method: "GET" }).handler(
  async () => {
    const db = await getAdmin();
    const [profilesRes, counts] = await Promise.all([
      db
        .from("user_profiles")
        .select("id, username, username_key, award")
        .order("username", { ascending: true }),
      getActivityCounts(db),
    ]);
    if (profilesRes.error) throw new Error(profilesRes.error.message);
    return (profilesRes.data ?? []).map((r: any): UserProfileDTO => {
      const c = counts.get(r.username_key) ?? { postCount: 0, commentCount: 0 };
      return {
        id: r.id,
        username: r.username,
        award: r.award ?? "",
        postCount: c.postCount,
        commentCount: c.commentCount,
        points: c.postCount * 5 + c.commentCount * 1,
        level: levelFromActivity(c.postCount, c.commentCount),
      };
    });
  },
);

// Public: lightweight map for rendering badges next to author names.
// Levels come from activity; awards come from admin-managed profiles.
export const getProfileMap = createServerFn({ method: "GET" }).handler(
  async () => {
    const db = await getAdmin();
    const [awardsRes, counts] = await Promise.all([
      db.from("user_profiles").select("username_key, award"),
      getActivityCounts(db),
    ]);
    if (awardsRes.error) throw new Error(awardsRes.error.message);

    const map: ProfileMap = {};
    // Activity-based levels for everyone who has posted or commented.
    for (const [key, c] of counts) {
      map[key] = {
        level: levelFromActivity(c.postCount, c.commentCount),
        award: "",
      };
    }
    // Merge admin-managed awards.
    for (const r of awardsRes.data ?? []) {
      const award = r.award ?? "";
      const existing = map[r.username_key];
      if (existing) existing.award = award;
      else map[r.username_key] = { level: null, award };
    }
    return map;
  },
);

// Admin: create or update an award mapping (keyed by normalized username).
// Levels are auto-computed and not stored here.
export const upsertUserProfile = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        username: z.string().trim().min(1).max(100),
        award: z.string().trim().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await getAdmin();
    const usernameKey = normalizeUsername(data.username);
    const { error } = await db
      .from("user_profiles")
      .upsert(
        {
          username: data.username.trim(),
          username_key: usernameKey,
          award: data.award,
        },
        { onConflict: "username_key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin: delete a mapping.
export const deleteUserProfile = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const db = await getAdmin();
    const { error } = await db
      .from("user_profiles")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin: reset a nickname's password so it can be re-claimed (lost-password
// recovery). Clears the stored hash; next writer under that name re-claims it.
export const resetNicknamePassword = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const db = await getAdmin();
    const { error } = await db
      .from("user_profiles")
      .update({ nickname_password: "", claimed_at: null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Verifies the dedicated profile-admin password. The secret value lives only
// in PROFILE_ADMIN_PASSWORD (server env) and is never returned to clients.
export const verifyProfileAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ password: z.string().max(200) }).parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const secret = process.env.PROFILE_ADMIN_PASSWORD;
    if (!secret || data.password.length === 0) return { ok: false };
    return { ok: data.password === secret };
  });

// ============================================================
// Award badge icon: a single global lucide icon name chosen by the admin.
// Stored in site_settings under the 'award_icon' key.
// ============================================================

// Whitelist of allowed lucide icon names for the award badge. Used both for
// the admin picker and for server-side validation.
export const AWARD_ICON_NAMES = [
  "Trophy",
  "Award",
  "Medal",
  "Star",
  "Crown",
  "Flame",
  "Heart",
  "Zap",
  "Shield",
  "Gem",
  "ThumbsUp",
  "Rocket",
  "Ribbon",
  "Sparkles",
] as const;

export type AwardIconName = (typeof AWARD_ICON_NAMES)[number];

const DEFAULT_AWARD_ICON: AwardIconName = "Trophy";

// Public: returns the globally configured award badge icon name.
export const getAwardIcon = createServerFn({ method: "GET" }).handler(
  async (): Promise<AwardIconName> => {
    const db = await getAdmin();
    const { data, error } = await db
      .from("site_settings")
      .select("value")
      .eq("key", "award_icon")
      .maybeSingle();
    if (error) throw new Error(error.message);
    const value = data?.value as string | undefined;
    return (AWARD_ICON_NAMES as readonly string[]).includes(value ?? "")
      ? (value as AwardIconName)
      : DEFAULT_AWARD_ICON;
  },
);

// Admin: sets the global award badge icon (validated against the whitelist).
export const setAwardIcon = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ icon: z.enum(AWARD_ICON_NAMES) }).parse(input),
  )
  .handler(async ({ data }) => {
    const db = await getAdmin();
    const { error } = await db
      .from("site_settings")
      .upsert(
        { key: "award_icon", value: data.icon },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// Award icon rules: keyword -> icon mappings. When an award name contains a
// rule's keyword (case-insensitive substring), that rule's icon is used.
// Rules are tried in sort_order; the default award icon is the fallback.
// ============================================================

export interface AwardIconRule {
  id: string;
  keyword: string;
  icon: AwardIconName;
  sortOrder: number;
}

// Resolves which icon to use for a given award name. Returns the first
// matching rule's icon (by keyword substring), else the default icon.
export function resolveAwardIcon(
  award: string,
  rules: AwardIconRule[],
  defaultIcon: AwardIconName,
): AwardIconName {
  const text = (award ?? "").trim().toLowerCase();
  if (!text) return defaultIcon;
  for (const rule of rules) {
    const kw = rule.keyword.trim().toLowerCase();
    if (kw && text.includes(kw)) return rule.icon;
  }
  return defaultIcon;
}

// Public: returns all keyword->icon rules ordered by priority.
export const listAwardIconRules = createServerFn({ method: "GET" }).handler(
  async (): Promise<AwardIconRule[]> => {
    const db = await getAdmin();
    const { data, error } = await db
      .from("award_icon_rules")
      .select("id, keyword, icon, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any): AwardIconRule => ({
      id: r.id,
      keyword: r.keyword ?? "",
      icon: (AWARD_ICON_NAMES as readonly string[]).includes(r.icon)
        ? (r.icon as AwardIconName)
        : DEFAULT_AWARD_ICON,
      sortOrder: r.sort_order ?? 0,
    }));
  },
);

// Admin: adds a new keyword->icon rule.
export const addAwardIconRule = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        keyword: z.string().trim().min(1).max(100),
        icon: z.enum(AWARD_ICON_NAMES),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await getAdmin();
    const { data: rows, error: selErr } = await db
      .from("award_icon_rules")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);
    if (selErr) throw new Error(selErr.message);
    const nextOrder = ((rows?.[0]?.sort_order as number | undefined) ?? -1) + 1;
    const { error } = await db
      .from("award_icon_rules")
      .insert({ keyword: data.keyword, icon: data.icon, sort_order: nextOrder });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin: deletes a rule by id.
export const deleteAwardIconRule = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const db = await getAdmin();
    const { error } = await db
      .from("award_icon_rules")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// Likes (post_likes) — anonymous, keyed by normalized nickname.
// ============================================================

type LikeTarget = "post" | "comment";

// Escapes PostgREST ilike wildcards so a nickname matches case-insensitively
// without behaving like a pattern.
function escapeIlike(value: string): string {
  return value.replace(/[%_,\\]/g, (m) => `\\${m}`);
}

// Toggle a like on a post or comment. The liker is identified by their
// (browser-stored) nickname; no password is required to like.
export const toggleLike = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        targetType: z.enum(["post", "comment"]),
        targetId: z.string().uuid(),
        likerName: z.string().trim().max(100),
      })
      .parse(input),
  )
  .handler(
    async ({ data }): Promise<{ liked: boolean; count: number }> => {
      const db = await getAdmin();
      const name = data.likerName.trim();
      const key = normalizeName(name);
      if (!key || key === "익명") {
        throw new Error("닉네임을 먼저 설정해주세요.");
      }

      const { data: existing, error: selErr } = await db
        .from("post_likes")
        .select("id")
        .eq("target_type", data.targetType)
        .eq("target_id", data.targetId)
        .eq("liker_key", key)
        .maybeSingle();
      if (selErr) throw new Error(selErr.message);

      let liked: boolean;
      if (existing) {
        const { error } = await db
          .from("post_likes")
          .delete()
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
        liked = false;
      } else {
        const { error } = await db.from("post_likes").insert({
          target_type: data.targetType,
          target_id: data.targetId,
          liker_key: key,
          liker_name: name,
        });
        if (error) throw new Error(error.message);
        liked = true;
      }

      const { count, error: cErr } = await db
        .from("post_likes")
        .select("id", { count: "exact", head: true })
        .eq("target_type", data.targetType)
        .eq("target_id", data.targetId);
      if (cErr) throw new Error(cErr.message);

      return { liked, count: count ?? 0 };
    },
  );

export type LikeStateMap = Record<string, { count: number; liked: boolean }>;

// Returns like counts + whether the given nickname has liked each target.
export const getLikeState = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        targetType: z.enum(["post", "comment"]),
        targetIds: z.array(z.string().uuid()).max(200).default([]),
        likerName: z.string().trim().max(100).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<LikeStateMap> => {
    const db = await getAdmin();
    const map: LikeStateMap = {};
    for (const id of data.targetIds) map[id] = { count: 0, liked: false };
    if (data.targetIds.length === 0) return map;

    const key = normalizeName(data.likerName);
    const { data: rows, error } = await db
      .from("post_likes")
      .select("target_id, liker_key")
      .eq("target_type", data.targetType)
      .in("target_id", data.targetIds);
    if (error) throw new Error(error.message);

    for (const r of rows ?? []) {
      const id = String(r.target_id);
      const entry = map[id] ?? { count: 0, liked: false };
      entry.count += 1;
      if (key && r.liker_key === key) entry.liked = true;
      map[id] = entry;
    }
    return map;
  });

// ============================================================
// Personal dashboard ("내 페이지").
// ============================================================

// Verifies a nickname + password against the claimed profile. Used by the
// dashboard login. Never returns the stored hash.
export const verifyNicknameLogin = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        username: z.string().trim().min(1).max(100),
        password: z.string().min(1).max(200),
      })
      .parse(input),
  )
  .handler(
    async ({ data }): Promise<{ ok: boolean; username: string }> => {
      const db = await getAdmin();
      const key = normalizeName(data.username);
      const { data: row, error } = await db
        .from("user_profiles")
        .select("username, nickname_password")
        .eq("username_key", key)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!row || !row.nickname_password) {
        throw new Error(
          "등록되지 않은 닉네임이거나 비밀번호가 설정되지 않았습니다. 글이나 댓글을 작성하면 닉네임이 등록됩니다.",
        );
      }
      const incoming = await hashSecret(data.password);
      if (incoming !== row.nickname_password) {
        throw new Error("비밀번호가 일치하지 않습니다.");
      }
      return { ok: true, username: row.username ?? data.username.trim() };
    },
  );

export interface DashPostDTO {
  id: string;
  postNo: number;
  title: string;
  type: string;
  createdAt: string;
  commentCount: number;
  categorySlug: string;
  categoryName: string;
}

export interface DashCommentDTO {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  postId: string;
  postNo: number;
  postTitle: string;
  categorySlug: string;
  categoryName: string;
}

export interface DashLikeDTO {
  id: string;
  targetType: LikeTarget;
  createdAt: string;
  postNo: number;
  postTitle: string;
  categorySlug: string;
  categoryName: string;
  commentExcerpt: string;
  likerName: string;
}

export interface DashboardDTO {
  username: string;
  myPosts: DashPostDTO[];
  myComments: DashCommentDTO[];
  repliesToMe: DashCommentDTO[];
  likesGiven: DashLikeDTO[];
  likesReceived: { total: number; items: DashLikeDTO[] };
}

// Resolves posts to link metadata (post_no, title, category slug/name).
async function buildPostLookup(
  db: { from: (t: string) => any },
  postIds: string[],
): Promise<
  Map<
    string,
    {
      postNo: number;
      title: string;
      categorySlug: string;
      categoryName: string;
    }
  >
> {
  const lookup = new Map<
    string,
    { postNo: number; title: string; categorySlug: string; categoryName: string }
  >();
  const ids = Array.from(new Set(postIds.filter(Boolean)));
  if (ids.length === 0) return lookup;
  const { data: rows, error } = await db
    .from("posts")
    .select("id, post_no, title, categories!inner(slug, name)")
    .in("id", ids);
  if (error) throw new Error(error.message);
  for (const r of rows ?? []) {
    lookup.set(String(r.id), {
      postNo: r.post_no ?? 0,
      title: r.title ?? "",
      categorySlug: r.categories?.slug ?? "",
      categoryName: r.categories?.name ?? "",
    });
  }
  return lookup;
}

// Aggregates a single nickname's posts, comments, comment-reactions, and likes.
// Re-verifies the password on every call (no server session).
export const getMyDashboard = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        username: z.string().trim().min(1).max(100),
        password: z.string().min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<DashboardDTO> => {
    const db = await getAdmin();
    const name = data.username.trim();
    const key = normalizeName(name);

    // Re-authenticate.
    const { data: prof, error: pErr } = await db
      .from("user_profiles")
      .select("username, nickname_password")
      .eq("username_key", key)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!prof || !prof.nickname_password) {
      throw new Error("등록되지 않은 닉네임이거나 비밀번호가 설정되지 않았습니다.");
    }
    if ((await hashSecret(data.password)) !== prof.nickname_password) {
      throw new Error("비밀번호가 일치하지 않습니다.");
    }

    const pat = escapeIlike(name);

    // --- My posts ---
    const { data: postRows, error: postErr } = await db
      .from("posts")
      .select("id, post_no, title, type, created_at, categories!inner(slug, name)")
      .ilike("author", pat)
      .order("created_at", { ascending: false });
    if (postErr) throw new Error(postErr.message);
    const myPostRows = postRows ?? [];
    const myPostIds = myPostRows.map((p: any) => String(p.id));

    // Comment counts for my posts.
    const commentCounts: Record<string, number> = {};
    if (myPostIds.length > 0) {
      const { data: ccRows, error: ccErr } = await db
        .from("comments")
        .select("post_id")
        .in("post_id", myPostIds);
      if (ccErr) throw new Error(ccErr.message);
      for (const c of ccRows ?? []) {
        const pid = String(c.post_id);
        commentCounts[pid] = (commentCounts[pid] ?? 0) + 1;
      }
    }

    const myPosts: DashPostDTO[] = myPostRows.map((p: any) => ({
      id: String(p.id),
      postNo: p.post_no ?? 0,
      title: p.title ?? "",
      type: p.type,
      createdAt: p.created_at,
      commentCount: commentCounts[String(p.id)] ?? 0,
      categorySlug: p.categories?.slug ?? "",
      categoryName: p.categories?.name ?? "",
    }));

    // --- My comments ---
    const { data: myCommentRows, error: mcErr } = await db
      .from("comments")
      .select("id, post_id, author, content, created_at")
      .ilike("author", pat)
      .order("created_at", { ascending: false });
    if (mcErr) throw new Error(mcErr.message);
    const myComments0 = myCommentRows ?? [];

    // --- Replies to me (comments on my posts, by other people) ---
    let repliesRows: any[] = [];
    if (myPostIds.length > 0) {
      const { data: rRows, error: rErr } = await db
        .from("comments")
        .select("id, post_id, author, content, created_at")
        .in("post_id", myPostIds)
        .order("created_at", { ascending: false });
      if (rErr) throw new Error(rErr.message);
      repliesRows = (rRows ?? []).filter(
        (c: any) => normalizeName(c.author ?? "") !== key,
      );
    }

    // --- Likes given ---
    const { data: givenRows, error: gErr } = await db
      .from("post_likes")
      .select("id, target_type, target_id, liker_name, created_at")
      .eq("liker_key", key)
      .order("created_at", { ascending: false });
    if (gErr) throw new Error(gErr.message);
    const givenLikes = givenRows ?? [];

    // --- Likes received (on my posts + my comments) ---
    const myCommentIds = myComments0.map((c: any) => String(c.id));
    const receivedLikes: any[] = [];
    if (myPostIds.length > 0) {
      const { data: rl, error } = await db
        .from("post_likes")
        .select("id, target_type, target_id, liker_name, created_at")
        .eq("target_type", "post")
        .in("target_id", myPostIds);
      if (error) throw new Error(error.message);
      receivedLikes.push(...(rl ?? []));
    }
    if (myCommentIds.length > 0) {
      const { data: rl, error } = await db
        .from("post_likes")
        .select("id, target_type, target_id, liker_name, created_at")
        .eq("target_type", "comment")
        .in("target_id", myCommentIds);
      if (error) throw new Error(error.message);
      receivedLikes.push(...(rl ?? []));
    }
    receivedLikes.sort((a, b) =>
      String(b.created_at).localeCompare(String(a.created_at)),
    );

    // --- Resolve comments referenced by likes to their parent posts ---
    const likeCommentIds = [...givenLikes, ...receivedLikes]
      .filter((l) => l.target_type === "comment")
      .map((l) => String(l.target_id));
    const commentLookup = new Map<string, { content: string; postId: string }>();
    const uniqueLikeCommentIds = Array.from(new Set(likeCommentIds));
    if (uniqueLikeCommentIds.length > 0) {
      const { data: cRows, error } = await db
        .from("comments")
        .select("id, post_id, content")
        .in("id", uniqueLikeCommentIds);
      if (error) throw new Error(error.message);
      for (const c of cRows ?? []) {
        commentLookup.set(String(c.id), {
          content: c.content ?? "",
          postId: String(c.post_id),
        });
      }
    }

    // Collect every post id we must resolve to a link.
    const postIdsToResolve = new Set<string>(myPostIds);
    for (const c of myComments0) postIdsToResolve.add(String(c.post_id));
    for (const c of repliesRows) postIdsToResolve.add(String(c.post_id));
    for (const l of [...givenLikes, ...receivedLikes]) {
      if (l.target_type === "post") postIdsToResolve.add(String(l.target_id));
      else {
        const cm = commentLookup.get(String(l.target_id));
        if (cm) postIdsToResolve.add(cm.postId);
      }
    }
    const postLookup = await buildPostLookup(db, Array.from(postIdsToResolve));

    const mapDashComment = (c: any): DashCommentDTO => {
      const post = postLookup.get(String(c.post_id));
      return {
        id: String(c.id),
        content: c.content ?? "",
        author: c.author ?? "익명",
        createdAt: c.created_at,
        postId: String(c.post_id),
        postNo: post?.postNo ?? 0,
        postTitle: post?.title ?? "(삭제된 글)",
        categorySlug: post?.categorySlug ?? "",
        categoryName: post?.categoryName ?? "",
      };
    };

    const mapDashLike = (l: any): DashLikeDTO => {
      let postId = "";
      let excerpt = "";
      if (l.target_type === "post") {
        postId = String(l.target_id);
      } else {
        const cm = commentLookup.get(String(l.target_id));
        if (cm) {
          postId = cm.postId;
          excerpt = cm.content.slice(0, 80);
        }
      }
      const post = postLookup.get(postId);
      return {
        id: String(l.id),
        targetType: l.target_type as LikeTarget,
        createdAt: l.created_at,
        postNo: post?.postNo ?? 0,
        postTitle: post?.title ?? "(삭제된 글)",
        categorySlug: post?.categorySlug ?? "",
        categoryName: post?.categoryName ?? "",
        commentExcerpt: excerpt,
        likerName: l.liker_name ?? "",
      };
    };

    return {
      username: prof.username ?? name,
      myPosts,
      myComments: myComments0.map(mapDashComment),
      repliesToMe: repliesRows.map(mapDashComment),
      likesGiven: givenLikes.map(mapDashLike),
      likesReceived: {
        total: receivedLikes.length,
        items: receivedLikes.map(mapDashLike),
      },
    };
  });
