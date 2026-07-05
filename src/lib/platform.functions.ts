import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import bcrypt from "bcryptjs";

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
    storage: any;
    rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
  };
}

// ----------------------------- Admin authorization --------------------------
// Admin-only server functions verify the dashboard password server-side. The
// secret value lives only in ADMIN_PASSWORD (server env) and is never returned
// to clients. Empty input and a missing secret are always rejected. A generic
// error keeps the response opaque to anonymous callers.
function requireAdmin(password: string | undefined): void {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret || !password || password !== secret) {
    throw new Error("권한이 없습니다.");
  }
}

// Profile-tab operations are gated by the dedicated PROFILE_ADMIN_PASSWORD
// (second-level admin password), matching the existing profile gate.
function requireProfileAdmin(password: string | undefined): void {
  const secret = process.env.PROFILE_ADMIN_PASSWORD;
  if (!secret || !password || password !== secret) {
    throw new Error("권한이 없습니다.");
  }
}

// Verifies the dashboard admin password for the admin gate.
export const verifyAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ password: z.string().max(200) }).parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const secret = process.env.ADMIN_PASSWORD;
    if (!secret || data.password.length === 0) return { ok: false };
    return { ok: data.password === secret };
  });

// ----------------------------- Nickname ownership ----------------------------
// Anonymous community: authors are free-text. To stop nickname spoofing, a
// nickname is "claimed" with a password the first time it is used; subsequent
// posts/comments under the same (normalized) name must supply that password.
// The password is stored only as a SHA-256 hash and never returned to clients.

function normalizeName(name: string): string {
  return (name ?? "").trim().toLowerCase();
}

// Secrets (nickname passwords, recovery answers) are salted and hashed with
// bcrypt before storage. New values use bcrypt; legacy saltless SHA-256 hashes
// stay verifiable so existing nicknames keep working without a migration.
const BCRYPT_COST = 10;

async function hashSecret(secret: string): Promise<string> {
  return bcrypt.hash(`sendev-nick:${secret}`, BCRYPT_COST);
}

async function sha256Legacy(secret: string): Promise<string> {
  const bytes = new TextEncoder().encode(`sendev-nick:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Compares a plaintext secret against a stored hash. bcrypt hashes start with
// "$2"; anything else is treated as a legacy SHA-256 hex digest.
async function verifySecret(plaintext: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  if (stored.startsWith("$2")) {
    return bcrypt.compare(`sendev-nick:${plaintext}`, stored);
  }
  return (await sha256Legacy(plaintext)) === stored;
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
    if (!(await verifySecret(nicknamePassword, row.nickname_password))) {
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

// Returns whether a nickname is already "claimed" (has a registered password).
// Used by write forms to decide if the user must confirm a new password.
// Returns only a boolean — never the password hash.
export const getNicknameStatus = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ name: z.string().trim().max(100).default("") }).parse(input),
  )
  .handler(async ({ data }) => {
    const key = normalizeName(data.name);
    if (!key || key === "익명") return { claimed: false };
    const db = await getAdmin();
    const { data: row } = await db
      .from("user_profiles")
      .select("nickname_password")
      .eq("username_key", key)
      .maybeSingle();
    return { claimed: !!row && !!row.nickname_password };
  });

export type TabGroup = "hackathon" | "resources" | "devground" | "helloworld";

export interface CategoryDTO {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  hasPassword: boolean;
  githubRequired: boolean;
  parentId: string | null;
  isGroup: boolean;
  enablePost: boolean;
  enableProject: boolean;
  enableLink: boolean;
  enableProblem: boolean;
  generalName: string;
  projectName: string;
  linkName: string;
  problemName: string;
  tabGroup: TabGroup;
  evalOpen: boolean;
  evalSeed: number;
  reviewAllowlistOnly: boolean;
  hidden: boolean;
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
  type: "post" | "project" | "link" | "problem";
  pinned: boolean;
  title: string;
  content: string;
  author: string;
  githubUrl: string;
  deployUrl: string;
  ogImageUrl: string;
  series: string;
  problemArea: string;
  problemFrequency: string;
  parentPostId: string | null;
  createdAt: string;
  commentCount: number;
  viewCount: number;
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
        "id, slug, name, description, sort_order, password, github_required, parent_id, is_group, enable_post, enable_project, enable_link, enable_problem, general_name, project_name, link_name, problem_name, tab_group, eval_open, eval_seed, review_allowlist_only, hidden",
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
      parentId: c.parent_id ?? null,
      isGroup: !!c.is_group,
      enablePost: c.enable_post ?? true,
      enableProject: c.enable_project ?? true,
      enableLink: c.enable_link ?? false,
      enableProblem: c.enable_problem ?? false,
      generalName: c.general_name ?? "일반게시판",
      projectName: c.project_name ?? "산출물",
      linkName: c.link_name ?? "링크",
      problemName: c.problem_name ?? "문제ZIP",
      tabGroup: (c.tab_group ?? "hackathon") as TabGroup,
      evalOpen: !!c.eval_open,
      evalSeed: Number(c.eval_seed ?? 0),
      reviewAllowlistOnly: !!c.review_allowlist_only,
      hidden: !!c.hidden,
    }));
  },
);

// Admin-only: returns the stored password for a single board so the edit
// modal can prefill it. Not exposed through listCategories to keep passwords
// out of the public board list.
export const getCategoryPassword = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), adminPassword: z.string().max(200).default("") }).parse(input),
  )
  .handler(async ({ data }): Promise<{ password: string }> => {
    requireAdmin(data.adminPassword);
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
        parentId: z.string().uuid().nullable().optional(),
        isGroup: z.boolean().default(false),
        enablePost: z.boolean().default(true),
        enableProject: z.boolean().default(true),
        enableLink: z.boolean().default(false),
        enableProblem: z.boolean().default(false),
        generalName: z.string().trim().max(100).default("일반게시판"),
        projectName: z.string().trim().max(100).default("산출물"),
        linkName: z.string().trim().max(100).default("링크"),
        problemName: z.string().trim().max(100).default("문제ZIP"),
        tabGroup: z
          .enum(["hackathon", "resources", "devground", "helloworld"])
          .default("hackathon"),
        hidden: z.boolean().default(false),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.adminPassword);
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
      parent_id: data.parentId ?? null,
      is_group: data.isGroup,
      enable_post: data.enablePost,
      enable_project: data.enableProject,
      enable_link: data.enableLink,
      enable_problem: data.enableProblem,
      general_name: data.generalName || "일반게시판",
      project_name: data.projectName || "산출물",
      link_name: data.linkName || "링크",
      problem_name: data.problemName || "문제ZIP",
      tab_group: data.tabGroup,
      hidden: data.hidden,
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
        parentId: z.string().uuid().nullable().optional(),
        isGroup: z.boolean().optional(),
        enablePost: z.boolean().optional(),
        enableProject: z.boolean().optional(),
        enableLink: z.boolean().optional(),
        enableProblem: z.boolean().optional(),
        generalName: z.string().trim().max(100).optional(),
        projectName: z.string().trim().max(100).optional(),
        linkName: z.string().trim().max(100).optional(),
        problemName: z.string().trim().max(100).optional(),
        tabGroup: z
          .enum(["hackathon", "resources", "devground", "helloworld"])
          .optional(),
        hidden: z.boolean().optional(),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.adminPassword);
    const db = await getAdmin();
    // Prevent setting a category's parent to itself.
    if (data.parentId !== undefined && data.parentId === data.id) {
      throw new Error("자기 자신을 상위 폴더로 지정할 수 없어요.");
    }
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
    if (data.parentId !== undefined) patch.parent_id = data.parentId;
    if (data.isGroup !== undefined) patch.is_group = data.isGroup;
    if (data.enablePost !== undefined) patch.enable_post = data.enablePost;
    if (data.enableProject !== undefined)
      patch.enable_project = data.enableProject;
    if (data.enableLink !== undefined) patch.enable_link = data.enableLink;
    if (data.enableProblem !== undefined) patch.enable_problem = data.enableProblem;
    if (data.generalName !== undefined)
      patch.general_name = data.generalName || "일반게시판";
    if (data.projectName !== undefined)
      patch.project_name = data.projectName || "산출물";
    if (data.linkName !== undefined)
      patch.link_name = data.linkName || "링크";
    if (data.problemName !== undefined)
      patch.problem_name = data.problemName || "문제ZIP";
    if (data.tabGroup !== undefined) patch.tab_group = data.tabGroup;
    if (data.hidden !== undefined) patch.hidden = data.hidden;
    const { error } = await db.from("categories").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid(), adminPassword: z.string().max(200).default("") }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin(data.adminPassword);
    const db = await getAdmin();
    const { error } = await db.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin-only: opens evaluation for a board and shuffles the order by setting a
// new random eval_seed. Pressing it again re-shuffles everyone's order.
export const shuffleEvaluation = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid(), adminPassword: z.string().max(200).default("") }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin(data.adminPassword);
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
  .inputValidator((input) => z.object({ id: z.string().uuid(), adminPassword: z.string().max(200).default("") }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin(data.adminPassword);
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
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.adminPassword);
    const { adminPassword: _ap, placeAddress, latitude, longitude, ...rest } = data;
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
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.adminPassword);
    const { id, adminPassword: _ap, placeAddress, latitude, longitude, ...rest } = data;
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
        dataBase64: z.string().min(1).max(4_500_000),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<EventAttachment> => {
    requireAdmin(data.adminPassword);
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
  .inputValidator((input) => z.object({ id: z.string().uuid(), adminPassword: z.string().max(200).default("") }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin(data.adminPassword);
    const db = await getAdmin();
    const { error } = await db.from("events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


/* -------------------------------- Posts ------------------------------- */

const POST_COLUMNS =
  "id, category_id, post_no, type, pinned, title, content, author, github_url, deploy_url, og_image_url, series, problem_area, problem_frequency, parent_post_id, created_at, view_count";

// Returns true when the caller may read a protected board's content. Open
// boards (no password) always pass. Protected boards pass only when the
// supplied board password matches, or when a valid admin password is given.
// SSR-safe: callers withhold content (empty/null) on failure, never throw.
function isAdminPassword(pw: string | undefined): boolean {
  const secret = process.env.ADMIN_PASSWORD;
  return !!secret && !!pw && pw === secret;
}

async function boardAccessOk(
  db: { from: (t: string) => any },
  categoryId: string,
  boardPassword: string | undefined,
  adminPassword: string | undefined,
): Promise<boolean> {
  if (isAdminPassword(adminPassword)) return true;
  const { data: cat } = await db
    .from("categories")
    .select("password")
    .eq("id", categoryId)
    .maybeSingle();
  if (!cat || !cat.password) return true;
  return (boardPassword ?? "") === cat.password;
}

export const listPosts = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        categoryId: z.string().uuid(),
        boardPassword: z.string().max(100).optional(),
        adminPassword: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<PostDTO[]> => {
    const db = await getAdmin();
    // Protected boards withhold their listing unless the password is supplied.
    if (!(await boardAccessOk(db, data.categoryId, data.boardPassword, data.adminPassword))) {
      return [];
    }
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
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        boardPassword: z.string().max(100).optional(),
        adminPassword: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<PostDTO | null> => {
    const db = await getAdmin();
    const { data: row, error } = await db
      .from("posts")
      .select(POST_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    // Withhold the post when its board is protected and unverified.
    if (!(await boardAccessOk(db, row.category_id, data.boardPassword, data.adminPassword))) {
      return null;
    }
    return mapPost(row);
  });

// Resolves a post by its board slug + per-board number for short URLs.
export const getPostByNo = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        slug: z.string().min(1).max(31),
        postNo: z.number().int().positive(),
        boardPassword: z.string().max(100).optional(),
        adminPassword: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<PostDTO | null> => {
    const db = await getAdmin();
    const { data: cat } = await db
      .from("categories")
      .select("id, password")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!cat) return null;
    // Withhold content when the board is protected and unverified.
    if (
      !isAdminPassword(data.adminPassword) &&
      cat.password &&
      (data.boardPassword ?? "") !== cat.password
    ) {
      return null;
    }
    const { data: row, error } = await db
      .from("posts")
      .select(POST_COLUMNS)
      .eq("category_id", cat.id)
      .eq("post_no", data.postNo)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ? mapPost(row) : null;
  });

// Lightweight item for prev/next navigation within a board (no body/comments).
export interface PostNavItemDTO {
  id: string;
  postNo: number;
  type: string;
  pinned: boolean;
  title: string;
}

// Returns a lightweight list of a board's posts (only the columns needed for
// prev/next navigation). Excludes body content and comment aggregation to keep
// the payload and query cost minimal compared to listPosts.
export const listPostNav = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        slug: z.string().min(1).max(31),
        boardPassword: z.string().max(100).optional(),
        adminPassword: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<PostNavItemDTO[]> => {
    const db = await getAdmin();
    const { data: cat } = await db
      .from("categories")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!cat) return [];
    if (!(await boardAccessOk(db, cat.id, data.boardPassword, data.adminPassword))) {
      return [];
    }
    const { data: rows, error } = await db
      .from("posts")
      .select("id, post_no, type, pinned, title, created_at")
      .eq("category_id", cat.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((p: any) => ({
      id: p.id,
      postNo: p.post_no ?? 0,
      type: p.type,
      pinned: !!p.pinned,
      title: p.title,
    }));
  });

// A single episode within a reply-chain series (lightweight stub for listing).
export interface PostChainItemDTO {
  id: string;
  postNo: number;
  title: string;
  author: string;
  parentPostId: string | null;
  createdAt: string;
}

// Returns the full reply-chain series a post belongs to (root -> all
// descendants), ordered by creation time, via a single recursive RPC call.
export const listPostChain = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ postId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<PostChainItemDTO[]> => {
    const db = await getAdmin();
    const { data: rows, error } = await db.rpc("get_post_chain", {
      p_post_id: data.postId,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      postNo: r.post_no ?? 0,
      title: r.title,
      author: r.author,
      parentPostId: r.parent_post_id ?? null,
      createdAt: r.created_at,
    }));
  });


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
        type: z.enum(["post", "project", "link", "problem"]).default("post"),
        pinned: z.boolean().default(false),
        title: z.string().trim().min(1).max(200),
        problemArea: z.string().trim().max(100).default(""),
        problemFrequency: z.string().trim().max(100).default(""),
        content: z.string().max(20000).default(""),
        author: z.string().trim().max(100).default(""),
        githubUrl: z.string().trim().max(300).default(""),
        deployUrl: z.string().trim().max(300).default(""),
        series: z.string().trim().max(100).default(""),
        parentPostId: z.string().uuid().nullable().default(null),
        nicknamePassword: z.string().trim().max(100).default(""),
        adminPassword: z.string().max(200).default(""),
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
    const author = data.author;
    // Verify the author owns this nickname (or claim it on first use).
    await ensureNicknameOwnership(db, author, data.nicknamePassword, false);
    // Validate the optional parent (reply chain): it must exist and live in the
    // same category. Cross-category chains would break next/prev navigation.
    let parentPostId: string | null = null;
    if (data.parentPostId) {
      const { data: parent } = await db
        .from("posts")
        .select("id, category_id")
        .eq("id", data.parentPostId)
        .maybeSingle();
      if (parent && parent.category_id === data.categoryId) {
        parentPostId = parent.id;
      }
    }
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
        pinned: data.type === "post" ? data.pinned : false,
        title: data.title,
        content: data.content,
        author,
        github_url: data.githubUrl,
        deploy_url: data.deployUrl,
        og_image_url: ogImageUrl,
        series: data.series,
        problem_area: data.type === "problem" ? data.problemArea : "",
        problem_frequency: data.type === "problem" ? data.problemFrequency : "",
        parent_post_id: parentPostId,
      });
      if (!error) return { ok: true, postNo: nextNo };
      // Retry on unique violation (concurrent insert); otherwise fail.
      if (!String(error.message ?? "").toLowerCase().includes("duplicate")) {
        throw new Error(error.message);
      }
    }
    throw new Error("게시글 번호를 부여하지 못했어요. 다시 시도해주세요.");
  });


// Verifies the right to edit/delete a post.
// Unified model: the post author's nickname password (hashed) is the single
// credential. The admin master password always passes. Legacy posts that only
// have a plaintext edit_password keep working as a fallback.
async function checkPostPassword(
  db: { from: (t: string) => any },
  id: string,
  password: string,
): Promise<boolean> {
  const { data: row, error } = await db
    .from("posts")
    .select("author, edit_password")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  // Admin master password: bypasses all per-post checks. Read server-side
  // only (never reaches the client bundle). Empty input never matches.
  const master = process.env.POST_MASTER_PASSWORD;
  if (master && password.length > 0 && password === master) return true;
  if (!row || password.length === 0) return false;

  // Primary: match the author's nickname password.
  const key = normalizeName((row.author ?? "").trim());
  if (key && key !== "익명") {
    const { data: prof } = await db
      .from("user_profiles")
      .select("nickname_password")
      .eq("username_key", key)
      .maybeSingle();
    if (prof?.nickname_password) {
      if (await verifySecret(password, prof.nickname_password)) return true;
    }
  }

  // Fallback: legacy plaintext per-post password.
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
        pinned: z.boolean().optional(),
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
    if (data.author !== undefined) patch.author = data.author;
    // Only "post" type entries can be pinned (notice).
    if (data.pinned !== undefined && existing?.type === "post") {
      patch.pinned = data.pinned;
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

// Admin-only: moves a post to another board (category).
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
      if (post.type !== "post") {
        throw new Error("글 게시판 글만 이동할 수 있어요.");
      }
      const { data: target, error: catErr } = await db
        .from("categories")
        .select("slug, enable_post")
        .eq("id", data.targetCategoryId)
        .maybeSingle();
      if (catErr) throw new Error(catErr.message);
      if (!target) return { ok: false };
      // Move the entire connected series (this post's chain) in a single
      // transaction so the series stays within one board and next/prev links
      // never break. Returns the clicked post's new per-board number.
      const { data: newNo, error: moveErr } = await db.rpc("move_post_chain", {
        p_post_id: data.id,
        p_target_category: data.targetCategoryId,
      });
      if (moveErr) throw new Error(moveErr.message);
      if (newNo == null) return { ok: false };
      return { ok: true, slug: target.slug ?? "", postNo: Number(newNo) };
    },
  );

function mapPost(p: any, commentCount = 0): PostDTO {
  return {
    id: p.id,
    categoryId: p.category_id,
    postNo: p.post_no ?? 0,
    type: p.type,
    pinned: !!p.pinned,
    title: p.title,
    content: p.content ?? "",
    author: p.author,
    githubUrl: p.github_url,
    deployUrl: p.deploy_url ?? "",
    ogImageUrl: p.og_image_url ?? "",
    series: p.series ?? "",
    problemArea: p.problem_area ?? "",
    problemFrequency: p.problem_frequency ?? "",
    parentPostId: p.parent_post_id ?? null,
    createdAt: p.created_at,
    commentCount,
    viewCount: p.view_count ?? 0,
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
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.adminPassword);
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
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.adminPassword);
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
  .inputValidator((input) => z.object({ id: z.string().uuid(), adminPassword: z.string().max(200).default("") }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin(data.adminPassword);
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

/* ----------------------- Review allowlist (admin) ---------------------- */

export interface ReviewAllowlistEntryDTO {
  id: string;
  reviewerName: string;
  createdAt: string;
}

export const listReviewAllowlist = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        categoryId: z.string().uuid(),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<ReviewAllowlistEntryDTO[]> => {
    requireAdmin(data.adminPassword);
    const db = await getAdmin();
    const { data: rows, error } = await db
      .from("review_allowlist")
      .select("id, reviewer_name, created_at")
      .eq("category_id", data.categoryId)
      .order("reviewer_name", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      reviewerName: r.reviewer_name,
      createdAt: r.created_at,
    }));
  });

export const addReviewAllowlistName = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        categoryId: z.string().uuid(),
        reviewerName: z.string().trim().min(1).max(100),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.adminPassword);
    const db = await getAdmin();
    const key = normalizeName(data.reviewerName);
    if (!key) throw new Error("닉네임을 입력해 주세요.");
    const { error } = await db.from("review_allowlist").upsert(
      {
        category_id: data.categoryId,
        reviewer_name: data.reviewerName,
        reviewer_key: key,
      },
      { onConflict: "category_id,reviewer_key", ignoreDuplicates: true },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addReviewAllowlistNames = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        categoryId: z.string().uuid(),
        reviewerNames: z
          .array(z.string().trim().min(1).max(100))
          .min(1)
          .max(500),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.adminPassword);
    const db = await getAdmin();
    const seen = new Set<string>();
    const rows: {
      category_id: string;
      reviewer_name: string;
      reviewer_key: string;
    }[] = [];
    for (const name of data.reviewerNames) {
      const key = normalizeName(name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      rows.push({
        category_id: data.categoryId,
        reviewer_name: name.trim(),
        reviewer_key: key,
      });
    }
    if (rows.length === 0) return { ok: true, added: 0 };
    const { error } = await db
      .from("review_allowlist")
      .upsert(rows, {
        onConflict: "category_id,reviewer_key",
        ignoreDuplicates: true,
      });
    if (error) throw new Error(error.message);
    return { ok: true, added: rows.length };
  });

export const removeReviewAllowlistName = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.adminPassword);
    const db = await getAdmin();
    const { error } = await db.from("review_allowlist").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setReviewAllowlistOnly = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        enabled: z.boolean(),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.adminPassword);
    const db = await getAdmin();
    const { error } = await db
      .from("categories")
      .update({ review_allowlist_only: data.enabled })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------- Category reviews (admin) ----------------------- */

export interface CategoryReviewDTO {
  id: string;
  postId: string;
  postTitle: string;
  postNo: number | null;
  reviewerName: string;
  createdAt: string;
}

export const listCategoryReviews = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        categoryId: z.string().uuid(),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<CategoryReviewDTO[]> => {
    requireAdmin(data.adminPassword);
    const db = await getAdmin();
    const { data: posts, error: postsErr } = await db
      .from("posts")
      .select("id, title, post_no")
      .eq("category_id", data.categoryId)
      .eq("type", "project");
    if (postsErr) throw new Error(postsErr.message);
    const postList = posts ?? [];
    if (postList.length === 0) return [];
    const postMap = new Map<string, { title: string; postNo: number | null }>(
      postList.map((p: any) => [
        p.id as string,
        { title: p.title as string, postNo: (p.post_no ?? null) as number | null },
      ]),
    );
    const { data: rows, error } = await db
      .from("reviews")
      .select("id, post_id, reviewer_name, created_at")
      .in("post_id", postList.map((p: any) => p.id))
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      postId: r.post_id,
      postTitle: postMap.get(r.post_id)?.title ?? "(삭제된 산출물)",
      postNo: postMap.get(r.post_id)?.postNo ?? null,
      reviewerName: r.reviewer_name,
      createdAt: r.created_at,
    }));
  });

export const deleteReview = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.adminPassword);
    const db = await getAdmin();
    const { error } = await db.from("reviews").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });



export const createReview = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        postId: z.string().uuid(),
        reviewerName: z.string().trim().min(1).max(100),
        nicknamePassword: z.string().trim().max(100).default(""),
        scores: z.record(z.string().uuid(), z.number().min(0).max(100)),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await getAdmin();
    // Verify the reviewer owns this nickname (or claim it on first use),
    // matching the post/comment flow so reviews can't be spoofed.
    await ensureNicknameOwnership(db, data.reviewerName, data.nicknamePassword, false);

    // If the post's category restricts reviews to a pre-approved nickname
    // allowlist, enforce membership before accepting the review.
    const { data: postRow, error: postErr } = await db
      .from("posts")
      .select("category_id")
      .eq("id", data.postId)
      .maybeSingle();
    if (postErr) throw new Error(postErr.message);
    if (!postRow) throw new Error("평가 대상을 찾을 수 없어요.");

    const { data: catRow, error: catErr } = await db
      .from("categories")
      .select("review_allowlist_only")
      .eq("id", postRow.category_id)
      .maybeSingle();
    if (catErr) throw new Error(catErr.message);

    if (catRow?.review_allowlist_only) {
      const key = normalizeName(data.reviewerName);
      const { data: allowed, error: allowErr } = await db
        .from("review_allowlist")
        .select("id")
        .eq("category_id", postRow.category_id)
        .eq("reviewer_key", key)
        .maybeSingle();
      if (allowErr) throw new Error(allowErr.message);
      if (!allowed) {
        throw new Error("이 평가는 등록된 평가자 명단의 닉네임만 참여할 수 있어요.");
      }
    }

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

/* ------------------------------ Post reads (읽음 추적) ------------------------------ */

export interface PostStub {
  id: string;
  categoryId: string;
  type: string;
}

// 모든 게시글의 최소 정보(제목/본문 미포함, 비밀번호 무관)만 반환.
// 카테고리 카드의 미열람 수 계산에 사용.
// 주의: Supabase 쿼리당 기본 1000행 제한. 현재 글 수는 100개 미만이라 무관하나,
// 글이 1000개를 넘으면 범위/페이지네이션 처리가 필요함.
export const listPostStubs = createServerFn({ method: "GET" }).handler(
  async (): Promise<PostStub[]> => {
    const db = await getAdmin();
    const { data: rows, error } = await db
      .from("posts")
      .select("id, category_id, type")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      id: String(r.id),
      categoryId: String(r.category_id),
      type: String(r.type),
    }));
  },
);

// 특정 닉네임이 읽은 모든 게시글 id 목록.
// 주의: 1000행 제한 — 한 사용자가 1000개 이상 읽으면 범위 처리가 필요함.
export const listReadPostIds = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ author: z.string().trim().min(1).max(50) }).parse(input),
  )
  .handler(async ({ data }): Promise<string[]> => {
    const usernameKey = normalizeUsername(data.author);
    if (!usernameKey) return [];
    const db = await getAdmin();
    const { data: rows, error } = await db
      .from("post_reads")
      .select("post_id")
      .eq("username_key", usernameKey)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids: string[] = Array.from(
      new Set((rows ?? []).map((r: any) => String(r.post_id))),
    );
    ids.sort();
    return ids;
  });

// 글을 읽음으로 기록(닉네임 정규화 키 + post_id, 중복은 무시).
// 검증 실패 시 조용히 무시 — 읽음은 비핵심 기능이라 에러로 흐름을 막지 않음.
export const markPostRead = createServerFn({ method: "POST" })
  .inputValidator((input) => {
    const parsed = z
      .object({
        author: z.string().trim().min(1).max(50),
        postId: z.string().uuid(),
      })
      .safeParse(input);
    return parsed.success ? parsed.data : null;
  })
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    if (!data) return { ok: false };
    const usernameKey = normalizeUsername(data.author);
    if (!usernameKey) return { ok: false };
    const db = await getAdmin();
    const { error } = await db
      .from("post_reads")
      .upsert(
        { username_key: usernameKey, post_id: data.postId },
        { onConflict: "username_key,post_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// 게시글 조회수를 1 증가시킨다. 상세 페이지 진입 시마다 호출(새로고침 포함).
// 조회수는 비핵심 지표이므로 입력 검증 실패 시 조용히 무시한다.
export const incrementPostView = createServerFn({ method: "POST" })
  .inputValidator((input) => {
    const parsed = z.object({ postId: z.string().uuid() }).safeParse(input);
    return parsed.success ? parsed.data : null;
  })
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    if (!data) return { ok: false };
    const db = await getAdmin();
    const { error } = await db.rpc("increment_post_view", { p_id: data.postId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });


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
        author: z.string().trim().min(1).max(100),
        content: z.string().trim().max(5000).default(""),
        imageUrls: z.array(z.string().url().max(2000)).max(10).default([]),
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
      author: data.author,
      content: data.content,
      image_urls: data.imageUrls,
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
      .select("author, edit_password")
      .eq("id", data.id)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);
    if (!row) return { ok: false };

    // Admin master password bypasses all per-comment checks.
    const master = process.env.POST_MASTER_PASSWORD;
    const isMaster =
      !!master && data.password.length > 0 && data.password === master;

    let allowed = isMaster;
    if (!allowed && data.password.length > 0) {
      // Primary: match the comment author's nickname password.
      const key = normalizeName((row.author ?? "").trim());
      if (key && key !== "익명") {
        const { data: prof } = await db
          .from("user_profiles")
          .select("nickname_password")
          .eq("username_key", key)
          .maybeSingle();
        if (prof?.nickname_password) {
          if (await verifySecret(data.password, prof.nickname_password)) allowed = true;
        }
      }
      // Fallback: legacy plaintext per-comment password.
      if (!allowed && row.edit_password && row.edit_password === data.password) {
        allowed = true;
      }
    }
    if (!allowed) return { ok: false };
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

export interface LinkPreview {
  image: string | null;
  title: string | null;
  siteName: string | null;
}

// Server-only OG metadata resolver for arbitrary links placed in post bodies.
// Extracts image, title (og:title → <title>), and site name (og:site_name →
// hostname). Returns null fields when the page can't be read.
async function resolveOgMeta(url: string): Promise<LinkPreview> {
  let hostname: string | null = null;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }
  const empty: LinkPreview = { image: null, title: null, siteName: hostname };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EduShareBot/1.0)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return empty;

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

    const rawImage = extractMetaContent(html, [
      "og:image:secure_url",
      "og:image",
      "twitter:image",
      "twitter:image:src",
    ]);
    let image: string | null = null;
    if (rawImage) {
      try {
        const resolved = new URL(rawImage, url).href;
        if (/^https?:\/\//i.test(resolved)) image = resolved;
      } catch {
        /* ignore */
      }
    }

    let title =
      extractMetaContent(html, ["og:title", "twitter:title"]) ?? null;
    if (!title) {
      const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (m && m[1]) title = m[1].trim();
    }

    const siteName =
      extractMetaContent(html, ["og:site_name"]) ?? hostname ?? null;

    return { image, title: title || null, siteName };
  } catch (e) {
    console.error("resolveOgMeta failed:", e);
    return empty;
  }
}

export const fetchLinkPreview = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ url: z.string().trim().url().max(500) }).parse(input),
  )
  .handler(async ({ data }): Promise<LinkPreview> => {
    return resolveOgMeta(data.url);
  });

// Resolves a Canva link (including canva.link short links) by following
// redirects server-side to the final canva.com design URL, then classifies it:
// - a ".../view" link is publicly embeddable  -> kind "view" + embed URL
// - a ".../edit" link is a project/edit link  -> kind "edit" (icon only)
// Keeps cost low: HEAD requests, manual redirect following, max a few hops.
export interface CanvaResolution {
  kind: "view" | "edit" | "other";
  embedUrl: string | null;
}

async function followRedirects(start: string, maxHops = 5): Promise<string> {
  let current = start;
  for (let i = 0; i < maxHops; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    let res: Response;
    try {
      res = await fetch(current, {
        method: "HEAD",
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; EduShareBot/1.0)" },
      });
    } finally {
      clearTimeout(timeout);
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return current;
      try {
        current = new URL(loc, current).href;
      } catch {
        return current;
      }
      continue;
    }
    return current;
  }
  return current;
}

export const resolveCanvaLink = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ url: z.string().trim().url().max(500) }).parse(input),
  )
  .handler(async ({ data }): Promise<CanvaResolution> => {
    let host: string;
    try {
      host = new URL(data.url).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      return { kind: "other", embedUrl: null };
    }
    if (host !== "canva.link" && host !== "canva.com") {
      return { kind: "other", embedUrl: null };
    }
    try {
      const finalUrl = await followRedirects(data.url);
      const u = new URL(finalUrl);
      const finalHost = u.hostname.replace(/^www\./, "").toLowerCase();
      if (finalHost !== "canva.com" || !u.pathname.includes("/design/")) {
        return { kind: "other", embedUrl: null };
      }
      if (/\/view\/?$/.test(u.pathname)) {
        const base = `${u.origin}${u.pathname.replace(/\/$/, "")}`;
        return { kind: "view", embedUrl: `${base}?embed` };
      }
      if (/\/edit\/?$/.test(u.pathname)) {
        return { kind: "edit", embedUrl: null };
      }
      return { kind: "other", embedUrl: null };
    } catch (e) {
      console.error("resolveCanvaLink failed:", e);
      return { kind: "other", embedUrl: null };
    }
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
        dataBase64: z.string().min(1).max(3_000_000),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ url: string }> => {
    requireAdmin(data.adminPassword);
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
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.adminPassword);
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
  .inputValidator((input) => z.object({ id: z.string().uuid(), adminPassword: z.string().max(200).default("") }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin(data.adminPassword);
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
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.adminPassword);
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
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.adminPassword);
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

export interface UserAwardDTO {
  id: string;
  name: string;
}

export interface UserProfileDTO {
  id: string;
  username: string;
  level: number | null;
  awards: UserAwardDTO[];
  postCount: number;
  commentCount: number;
  points: number;
}

// Public display map keyed by normalized username.
export interface ProfileBadge {
  level: number | null;
  awards: string[];
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

// Fetches all awards grouped by normalized username_key, ordered by sort_order.
async function getAwardsByKey(
  db: any,
): Promise<Map<string, UserAwardDTO[]>> {
  const map = new Map<string, UserAwardDTO[]>();
  const { data, error } = await db
    .from("user_awards")
    .select("id, username_key, name, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  for (const r of data ?? []) {
    const key = r.username_key as string;
    const list = map.get(key) ?? [];
    list.push({ id: String(r.id), name: r.name ?? "" });
    map.set(key, list);
  }
  return map;
}

// Admin: full list of profile mappings with computed levels + activity.
export const listUserProfiles = createServerFn({ method: "GET" }).handler(
  async () => {
    const db = await getAdmin();
    const [profilesRes, counts, awardsByKey] = await Promise.all([
      db
        .from("user_profiles")
        .select("id, username, username_key")
        .order("username", { ascending: true }),
      getActivityCounts(db),
      getAwardsByKey(db),
    ]);
    if (profilesRes.error) throw new Error(profilesRes.error.message);
    return (profilesRes.data ?? []).map((r: any): UserProfileDTO => {
      const c = counts.get(r.username_key) ?? { postCount: 0, commentCount: 0 };
      return {
        id: r.id,
        username: r.username,
        awards: awardsByKey.get(r.username_key) ?? [],
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
    const [awardsByKey, counts] = await Promise.all([
      getAwardsByKey(db),
      getActivityCounts(db),
    ]);

    const map: ProfileMap = {};
    // Activity-based levels for everyone who has posted or commented.
    for (const [key, c] of counts) {
      map[key] = {
        level: levelFromActivity(c.postCount, c.commentCount),
        awards: [],
      };
    }
    // Merge admin-managed awards.
    for (const [key, list] of awardsByKey) {
      const awards = list.map((a) => a.name).filter((n) => n.trim().length > 0);
      const existing = map[key];
      if (existing) existing.awards = awards;
      else map[key] = { level: null, awards };
    }
    return map;
  },
);

// Admin: register/keep a username mapping (so it can be password-managed).
// Levels are auto-computed; awards are managed separately via addUserAward.
export const upsertUserProfile = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        username: z.string().trim().min(1).max(100),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireProfileAdmin(data.adminPassword);
    const db = await getAdmin();
    const usernameKey = normalizeUsername(data.username);
    const { error } = await db
      .from("user_profiles")
      .upsert(
        {
          username: data.username.trim(),
          username_key: usernameKey,
        },
        { onConflict: "username_key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin: add a single badge to a user (keyed by normalized username).
export const addUserAward = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        username: z.string().trim().min(1).max(100),
        name: z.string().trim().min(1).max(200),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireProfileAdmin(data.adminPassword);
    const db = await getAdmin();
    const usernameKey = normalizeUsername(data.username);
    // Ensure a profile row exists so the name can be managed.
    await db
      .from("user_profiles")
      .upsert(
        { username: data.username.trim(), username_key: usernameKey },
        { onConflict: "username_key" },
      );
    // Append after existing badges.
    const { count } = await db
      .from("user_awards")
      .select("id", { count: "exact", head: true })
      .eq("username_key", usernameKey);
    const { error } = await db.from("user_awards").insert({
      username: data.username.trim(),
      username_key: usernameKey,
      name: data.name,
      sort_order: count ?? 0,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin: delete a single badge.
export const deleteUserAward = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), adminPassword: z.string().max(200).default("") }).parse(input),
  )
  .handler(async ({ data }) => {
    requireProfileAdmin(data.adminPassword);
    const db = await getAdmin();
    const { error } = await db
      .from("user_awards")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin: delete a mapping.
export const deleteUserProfile = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), adminPassword: z.string().max(200).default("") }).parse(input),
  )
  .handler(async ({ data }) => {
    requireProfileAdmin(data.adminPassword);
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
    z.object({ id: z.string().uuid(), adminPassword: z.string().max(200).default("") }).parse(input),
  )
  .handler(async ({ data }) => {
    requireProfileAdmin(data.adminPassword);
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

// Normalizes a recovery answer so trivial differences (case, spacing) don't
// block a legitimate owner. Hashed the same way as passwords.
function normalizeAnswer(answer: string): string {
  return answer.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

// Sets/updates the recovery question + answer for a nickname. Requires the
// current nickname password, so only the owner can configure recovery.
export const setRecoveryQuestion = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        username: z.string().trim().min(1).max(100),
        password: z.string().min(1).max(200),
        question: z.string().trim().min(2).max(200),
        answer: z.string().trim().min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const db = await getAdmin();
    const key = normalizeName(data.username);
    const { data: row, error } = await db
      .from("user_profiles")
      .select("id, nickname_password")
      .eq("username_key", key)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row || !row.nickname_password) {
      throw new Error("등록되지 않은 닉네임이거나 비밀번호가 설정되지 않았습니다.");
    }
    if (!(await verifySecret(data.password, row.nickname_password))) {
      throw new Error("비밀번호가 일치하지 않습니다.");
    }
    const hashedAnswer = await hashSecret(normalizeAnswer(data.answer));
    const { error: upErr } = await db
      .from("user_profiles")
      .update({
        recovery_question: data.question.trim(),
        recovery_answer: hashedAnswer,
      })
      .eq("id", row.id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true };
  });

// Returns ONLY the recovery question text for a nickname (never the answer).
// Used to start the lost-password recovery flow.
export const getRecoveryQuestion = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ username: z.string().trim().min(1).max(100) }).parse(input),
  )
  .handler(async ({ data }): Promise<{ question: string | null }> => {
    const db = await getAdmin();
    const key = normalizeName(data.username);
    const { data: row, error } = await db
      .from("user_profiles")
      .select("recovery_question, recovery_answer, nickname_password")
      .eq("username_key", key)
      .maybeSingle();
    if (error) throw new Error(error.message);
    // Only expose a question when a claim + recovery answer both exist.
    if (!row || !row.nickname_password || !row.recovery_answer) {
      return { question: null };
    }
    const q = (row.recovery_question ?? "").trim();
    return { question: q.length > 0 ? q : null };
  });

// Lets the owner reset their nickname password by answering the recovery
// question correctly. No admin involvement, no impersonation via posts.
export const recoverNicknamePassword = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        username: z.string().trim().min(1).max(100),
        answer: z.string().trim().min(1).max(200),
        newPassword: z.string().min(4).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const db = await getAdmin();
    const key = normalizeName(data.username);
    const { data: row, error } = await db
      .from("user_profiles")
      .select("id, recovery_answer")
      .eq("username_key", key)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row || !row.recovery_answer) {
      throw new Error(
        "이 닉네임에는 복구 질문이 설정되어 있지 않습니다. 관리자에게 초기화를 요청해주세요.",
      );
    }
    if (!(await verifySecret(normalizeAnswer(data.answer), row.recovery_answer))) {
      throw new Error("복구 답변이 일치하지 않습니다.");
    }
    const hashed = await hashSecret(data.newPassword.trim());
    const { error: upErr } = await db
      .from("user_profiles")
      .update({ nickname_password: hashed })
      .eq("id", row.id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true };
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

// ============================================================
// 문제ZIP 게시판: 영역(Q1)/빈도(Q2) 선택지. 관리자가 편집하며
// site_settings 테이블에 JSON 문자열로 저장된다.
// ============================================================

export interface ProblemOptions {
  areas: string[];
  frequencies: string[];
}

const DEFAULT_PROBLEM_AREAS = [
  "💊보건/건강",
  "📝행정/공문",
  "👩‍🏫수업/평가",
  "💬학부모소통",
  "🏃‍♂️학교행사",
];
const DEFAULT_PROBLEM_FREQUENCIES = [
  "숨 쉴 때마다 (매일)",
  "잊을 만하면 (주 1~2회)",
  "시즌 한정 (학기초/말)",
];

function parseStringArray(raw: unknown, fallback: string[]): string[] {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const items = parsed
        .map((v) => String(v ?? "").trim())
        .filter((v) => v.length > 0);
      return items.length > 0 ? items : fallback;
    }
  } catch {
    /* fall through to fallback */
  }
  return fallback;
}

// Public: returns the admin-editable 영역/빈도 option lists for 문제ZIP.
export const getProblemOptions = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProblemOptions> => {
    const db = await getAdmin();
    const { data, error } = await db
      .from("site_settings")
      .select("key, value")
      .in("key", ["problem_areas", "problem_frequencies"]);
    if (error) throw new Error(error.message);
    const map = new Map<string, string>(
      (data ?? []).map((r: any) => [r.key, r.value as string]),
    );
    return {
      areas: parseStringArray(map.get("problem_areas"), DEFAULT_PROBLEM_AREAS),
      frequencies: parseStringArray(
        map.get("problem_frequencies"),
        DEFAULT_PROBLEM_FREQUENCIES,
      ),
    };
  },
);

// Admin: replaces the 영역/빈도 option lists (gated by dashboard password).
export const setProblemOptions = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        areas: z.array(z.string().trim().min(1).max(60)).max(30),
        frequencies: z.array(z.string().trim().min(1).max(60)).max(30),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.adminPassword);
    const db = await getAdmin();
    const { error } = await db.from("site_settings").upsert(
      [
        { key: "problem_areas", value: JSON.stringify(data.areas) },
        { key: "problem_frequencies", value: JSON.stringify(data.frequencies) },
      ],
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });



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
    z.object({ icon: z.enum(AWARD_ICON_NAMES), adminPassword: z.string().max(200).default("") }).parse(input),
  )
  .handler(async ({ data }) => {
    requireProfileAdmin(data.adminPassword);
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
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireProfileAdmin(data.adminPassword);
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
    z
      .object({ id: z.string().uuid(), adminPassword: z.string().max(200).default("") })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireProfileAdmin(data.adminPassword);
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
      if (!(await verifySecret(data.password, row.nickname_password))) {
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
  level: number | null;
  points: number;
  awards: string[];
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
    if (!(await verifySecret(data.password, prof.nickname_password))) {
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

    const points = myPosts.length * 5 + myComments0.length * 1;

    // Badges from the dedicated awards table (ordered).
    const { data: awardRows, error: awErr } = await db
      .from("user_awards")
      .select("name, sort_order, created_at")
      .eq("username_key", key)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (awErr) throw new Error(awErr.message);
    const awards = (awardRows ?? [])
      .map((a: any) => (a.name ?? "").trim())
      .filter((n: string) => n.length > 0);

    return {
      username: prof.username ?? name,
      level: levelFromActivity(myPosts.length, myComments0.length),
      points,
      awards,
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

// Renames a nickname while preserving all linked activity (level, badges,
// posts, comments, likes given/received, reviews). Because authorship is stored
// as free text, we migrate every occurrence of the old name to the new one.
export const renameNickname = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        username: z.string().trim().min(1).max(100),
        password: z.string().min(1).max(200),
        newUsername: z.string().trim().min(1).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; username: string }> => {
    const db = await getAdmin();
    const oldName = data.username.trim();
    const oldKey = normalizeName(oldName);
    const newName = data.newUsername.trim();
    const newKey = normalizeName(newName);

    // Validate the new name.
    if (!newName) {
      throw new Error("새 닉네임을 입력해주세요.");
    }
    if (newKey === "익명" || newKey === "운영진") {
      throw new Error("사용할 수 없는 닉네임입니다.");
    }

    // Authenticate as the current owner.
    const { data: prof, error: pErr } = await db
      .from("user_profiles")
      .select("username, nickname_password")
      .eq("username_key", oldKey)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!prof || !prof.nickname_password) {
      throw new Error("등록되지 않은 닉네임이거나 비밀번호가 설정되지 않았습니다.");
    }
    if (!(await verifySecret(data.password, prof.nickname_password))) {
      throw new Error("비밀번호가 일치하지 않습니다.");
    }

    const keyChanged = newKey !== oldKey;

    // Collision check (skip when only the display casing/spacing changes).
    if (keyChanged) {
      const { data: existing, error: exErr } = await db
        .from("user_profiles")
        .select("id")
        .eq("username_key", newKey)
        .maybeSingle();
      if (exErr) throw new Error(exErr.message);
      if (existing) {
        throw new Error("이미 사용 중인 닉네임이에요. 다른 닉네임을 입력해주세요.");
      }

      const newPat = escapeIlike(newName);
      const { data: takenPost, error: tpErr } = await db
        .from("posts")
        .select("id")
        .ilike("author", newPat)
        .limit(1);
      if (tpErr) throw new Error(tpErr.message);
      const { data: takenComment, error: tcErr } = await db
        .from("comments")
        .select("id")
        .ilike("author", newPat)
        .limit(1);
      if (tcErr) throw new Error(tcErr.message);
      if ((takenPost?.length ?? 0) > 0 || (takenComment?.length ?? 0) > 0) {
        throw new Error("이미 다른 사용자가 사용 중인 닉네임이에요. 다른 닉네임을 입력해주세요.");
      }
    }

    const oldPat = escapeIlike(oldName);

    // Migrate the profile (keeps level, password, recovery Q&A intact).
    const { error: upProfErr } = await db
      .from("user_profiles")
      .update({ username: newName, username_key: newKey })
      .eq("username_key", oldKey);
    if (upProfErr) throw new Error(upProfErr.message);

    // Migrate badges.
    const { error: awErr } = await db
      .from("user_awards")
      .update({ username: newName, username_key: newKey })
      .eq("username_key", oldKey);
    if (awErr) throw new Error(awErr.message);

    // Migrate authored posts & comments (case-insensitive exact match).
    const { error: postErr } = await db
      .from("posts")
      .update({ author: newName })
      .ilike("author", oldPat);
    if (postErr) throw new Error(postErr.message);

    const { error: commentErr } = await db
      .from("comments")
      .update({ author: newName })
      .ilike("author", oldPat);
    if (commentErr) throw new Error(commentErr.message);

    // Migrate likes given (display name + normalized key).
    const { error: likeErr } = await db
      .from("post_likes")
      .update({ liker_name: newName, liker_key: newKey })
      .eq("liker_key", oldKey);
    if (likeErr) throw new Error(likeErr.message);

    // Migrate reviews. Unique (post_id, reviewer_name) could rarely collide;
    // update what we can and ignore conflicts so the rename still succeeds.
    const { error: reviewErr } = await db
      .from("reviews")
      .update({ reviewer_name: newName })
      .ilike("reviewer_name", oldPat);
    if (reviewErr && !/duplicate|unique/i.test(reviewErr.message)) {
      throw new Error(reviewErr.message);
    }

    return { ok: true, username: newName };
  });

// ----------------------------- Hackathon reviews -----------------------------
// Participants who posted in any hackathon-tab board can leave a short "review"
// (소감) shown as a colorful sticky note. Write/edit/delete reuse the shared
// nickname-ownership credential; eligibility requires at least one hackathon
// post under the author's nickname.

export const HACKATHON_REVIEW_TYPES = ["intro", "growth", "challenge"] as const;
export type HackathonParticipantType = (typeof HACKATHON_REVIEW_TYPES)[number];

const HACKATHON_REVIEW_COLORS = [
  "yellow",
  "pink",
  "green",
  "blue",
  "purple",
  "orange",
] as const;

export interface HackathonReviewDTO {
  id: string;
  nickname: string;
  participantType: HackathonParticipantType;
  content: string;
  color: string;
  createdAt: string;
}

// Returns true if the nickname authored at least one post in a hackathon-tab
// category. Used to gate review creation.
async function nicknameHasHackathonPost(
  db: { from: (t: string) => any },
  author: string,
): Promise<boolean> {
  const name = (author ?? "").trim();
  if (!name) return false;
  const { data: cats, error: catErr } = await db
    .from("categories")
    .select("id")
    .eq("tab_group", "hackathon");
  if (catErr) throw new Error(catErr.message);
  const ids = (cats ?? []).map((c: { id: string }) => c.id);
  if (ids.length === 0) return false;
  const { data: rows, error } = await db
    .from("posts")
    .select("id")
    .ilike("author", name)
    .in("category_id", ids)
    .limit(1);
  if (error) throw new Error(error.message);
  return (rows ?? []).length > 0;
}

export const listHackathonReviews = createServerFn({ method: "GET" }).handler(
  async (): Promise<HackathonReviewDTO[]> => {
    const db = await getAdmin();
    const { data, error } = await db
      .from("hackathon_reviews")
      .select("id, nickname, participant_type, content, color, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      nickname: r.nickname,
      participantType: r.participant_type,
      content: r.content,
      color: r.color,
      createdAt: r.created_at,
    }));
  },
);

export const checkHackathonEligibility = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ author: z.string().trim().max(100) }).parse(input),
  )
  .handler(async ({ data }): Promise<{ eligible: boolean }> => {
    const db = await getAdmin();
    const eligible = await nicknameHasHackathonPost(db, data.author);
    return { eligible };
  });

export const createHackathonReview = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        nickname: z.string().trim().min(1).max(100),
        nicknamePassword: z.string().trim().max(100).default(""),
        participantType: z.enum(HACKATHON_REVIEW_TYPES),
        content: z.string().trim().min(1).max(1000),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true; id: string }> => {
    const db = await getAdmin();
    // Verify nickname ownership (or first-time claim with password).
    await ensureNicknameOwnership(db, data.nickname, data.nicknamePassword, false);
    // Eligibility: must have at least one hackathon-tab post.
    const eligible = await nicknameHasHackathonPost(db, data.nickname);
    if (!eligible) {
      throw new Error(
        "후기는 해커톤(입문형·성장형·도전형) 게시판에 글을 1개 이상 작성한 닉네임만 쓸 수 있어요.",
      );
    }
    const color =
      HACKATHON_REVIEW_COLORS[
        Math.floor(Math.random() * HACKATHON_REVIEW_COLORS.length)
      ];
    const { data: row, error } = await db
      .from("hackathon_reviews")
      .insert({
        nickname: data.nickname,
        participant_type: data.participantType,
        content: data.content,
        color,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const updateHackathonReview = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        nickname: z.string().trim().min(1).max(100),
        nicknamePassword: z.string().trim().max(100).default(""),
        participantType: z.enum(HACKATHON_REVIEW_TYPES),
        content: z.string().trim().min(1).max(1000),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const db = await getAdmin();
    const { data: existing, error: getErr } = await db
      .from("hackathon_reviews")
      .select("id, nickname")
      .eq("id", data.id)
      .maybeSingle();
    if (getErr) throw new Error(getErr.message);
    if (!existing) throw new Error("후기를 찾을 수 없어요.");
    if (normalizeName(existing.nickname) !== normalizeName(data.nickname)) {
      throw new Error("본인이 작성한 후기만 수정할 수 있어요.");
    }
    await ensureNicknameOwnership(db, data.nickname, data.nicknamePassword, false);
    const { error } = await db
      .from("hackathon_reviews")
      .update({
        participant_type: data.participantType,
        content: data.content,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteHackathonReview = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        nickname: z.string().trim().min(1).max(100),
        nicknamePassword: z.string().trim().max(100).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const db = await getAdmin();
    const { data: existing, error: getErr } = await db
      .from("hackathon_reviews")
      .select("id, nickname")
      .eq("id", data.id)
      .maybeSingle();
    if (getErr) throw new Error(getErr.message);
    if (!existing) throw new Error("후기를 찾을 수 없어요.");
    if (normalizeName(existing.nickname) !== normalizeName(data.nickname)) {
      throw new Error("본인이 작성한 후기만 삭제할 수 있어요.");
    }
    await ensureNicknameOwnership(db, data.nickname, data.nicknamePassword, false);
    const { error } = await db
      .from("hackathon_reviews")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
