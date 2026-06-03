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
  generalName: string;
  tabGroup: TabGroup;
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

export interface EventDTO {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
}

export interface PostDTO {
  id: string;
  categoryId: string;
  postNo: number;
  type: "notice" | "project" | "question" | "general";
  title: string;
  content: string;
  author: string;
  githubUrl: string;
  deployUrl: string;
  ogImageUrl: string;
  createdAt: string;
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
        "id, slug, name, description, sort_order, password, github_required, enable_notice, enable_question, enable_general, enable_project, general_name, tab_group",
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
      generalName: c.general_name ?? "일반게시판",
      tabGroup: (c.tab_group ?? "hackathon") as TabGroup,
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
        generalName: z.string().trim().max(100).default("일반게시판"),
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
      general_name: data.generalName || "일반게시판",
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
        generalName: z.string().trim().max(100).optional(),
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
    if (data.generalName !== undefined)
      patch.general_name = data.generalName || "일반게시판";
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
      .select("id, title, date, time, location, description")
      .order("date", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((e: any) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      time: e.time,
      location: e.location,
      description: e.description,
    }));
  },
);

export const createEvent = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        title: z.string().trim().min(1).max(200),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().trim().max(100).default(""),
        location: z.string().trim().max(200).default(""),
        description: z.string().trim().max(1000).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await getAdmin();
    const { error } = await db.from("events").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
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
  "id, category_id, post_no, type, title, content, author, github_url, deploy_url, og_image_url, created_at";

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
    return (rows ?? []).map(mapPost);
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


export const createPost = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        categoryId: z.string().uuid(),
        type: z.enum(["notice", "project", "question", "general"]),
        title: z.string().trim().min(1).max(200),
        content: z.string().max(20000).default(""),
        author: z.string().trim().max(100).default(""),
        githubUrl: z.string().trim().max(300).default(""),
        deployUrl: z.string().trim().max(300).default(""),
        editPassword: z.string().trim().min(1).max(100),
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
        throw new Error("이 게시판은 GitHub 링크가 필수입니다.");
      }
    }
    // Notices are authored by the operations team.
    const author = data.type === "notice" ? "운영진" : data.author;
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

function mapPost(p: any): PostDTO {
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
    createdAt: p.created_at,
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
        reviewerName: z.string().trim().max(100).default(""),
        scores: z.record(z.string().uuid(), z.number().min(0).max(100)),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await getAdmin();
    const { error } = await db.from("reviews").insert({
      post_id: data.postId,
      reviewer_name: data.reviewerName,
      scores: data.scores,
    });
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
