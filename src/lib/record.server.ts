// Server-only helpers for the 도전형 활동기록 feature.
// Mirrors the security model used by platform.functions.ts: every read/write
// goes through the service-role client inside a server handler, and writers are
// authenticated with their nickname password (or the admin password).
import bcrypt from "bcryptjs";

import {
  RECORD_ROW_KINDS as ROW_KINDS,
  RECORD_FINAL_FIELDS,
  type RecordRowKindName,
} from "./record-schema";

export type RecordRowKind = RecordRowKindName;

export const RECORD_ROW_KINDS: RecordRowKind[] = [...ROW_KINDS];


export interface RecordDb {
  from: (table: string) => any;
  storage: any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
}

export async function getRecordDb(): Promise<RecordDb> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as RecordDb;
}

export function normalizeName(name: string): string {
  return (name ?? "").trim().toLowerCase();
}

export function isAdminPassword(password: string | undefined): boolean {
  const secret = process.env.ADMIN_PASSWORD;
  return !!secret && !!password && password === secret;
}

async function sha256Legacy(secret: string): Promise<string> {
  const bytes = new TextEncoder().encode(`sendev-nick:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifySecret(plaintext: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  if (stored.startsWith("$2")) {
    return bcrypt.compare(`sendev-nick:${plaintext}`, stored);
  }
  return (await sha256Legacy(plaintext)) === stored;
}

// Verifies (or first-time claims) ownership of a nickname — same rules as the
// board write forms so a team member authenticates with the password they
// already use elsewhere on the site.
export async function ensureNickname(
  db: RecordDb,
  author: string,
  nicknamePassword: string,
): Promise<string> {
  const name = (author ?? "").trim();
  const key = normalizeName(name);
  if (!key || key === "익명") {
    throw new Error("활동기록은 닉네임으로만 작성할 수 있어요.");
  }
  const { data: row, error } = await db
    .from("user_profiles")
    .select("id, nickname_password")
    .eq("username_key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (row && row.nickname_password) {
    if (!nicknamePassword) {
      throw new Error("이미 사용 중인 닉네임입니다. 닉네임 비밀번호를 입력해주세요.");
    }
    if (!(await verifySecret(nicknamePassword, row.nickname_password))) {
      throw new Error("닉네임 비밀번호가 맞지 않습니다.");
    }
    return name;
  }

  if (!nicknamePassword || nicknamePassword.trim().length < 4) {
    throw new Error("닉네임 비밀번호를 4자 이상 입력해 닉네임을 등록해주세요.");
  }
  const hashed = await bcrypt.hash(`sendev-nick:${nicknamePassword.trim()}`, 10);
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
  return name;
}

// A record post may be edited by any of its team members (each authenticating
// with their own nickname password) or by an admin.
export async function requireTeamMember(
  db: RecordDb,
  postId: string,
  author: string,
  nicknamePassword: string,
  adminPassword: string,
): Promise<string> {
  if (isAdminPassword(adminPassword)) return (author ?? "").trim() || "관리자";
  const name = await ensureNickname(db, author, nicknamePassword);
  const { data: member } = await db
    .from("record_members")
    .select("id")
    .eq("post_id", postId)
    .eq("username_key", normalizeName(name))
    .maybeSingle();
  if (!member) {
    throw new Error("이 활동기록의 팀원만 수정할 수 있어요.");
  }
  return name;
}

/* ------------------------- Record overview (admin) ------------------------ */

export interface RecordOverviewMember {
  id: string;
  username: string;
  usernameKey: string;
  affiliation: string;
  role: string;
}

export type RecordOverviewFinal = Record<
  (typeof RECORD_FINAL_FIELDS)[number]["key"],
  string
> & {
  updatedBy: string;
  updatedAt: string;
};

export interface RecordOverviewRow {
  kind: RecordRowKind;
  sortOrder: number;
  subtype: string;
  author: string;
  col1: string;
  col2: string;
  col3: string;
  col4: string;
  col5: string;
  col6: string;
  updatedBy: string;
  updatedAt: string;
}

export interface RecordOverviewReflection {
  id: string;
  username: string;
  usernameKey: string;
  affiliation: string;
  role: string;
  q1: string;
  q2: string;
  promises: string[];
  promiseDetail: string;
  spreadPlan: string;
  updatedAt: string;
}


export interface RecordOverviewEthics {
  id: string;
  username: string;
  usernameKey: string;
  s1: number;
  s2: number;
  s3: number;
  s4: number;
  s5: number;
  s6: number;
  s7: number;
  extraPromise: string;
  updatedAt: string;
}

export interface RecordOverviewTeam {
  postId: string;
  postNo: number;
  categoryId: string;
  slug: string;
  teamName: string;
  members: RecordOverviewMember[];
  final: RecordOverviewFinal | null;
  rows: RecordOverviewRow[];
  reflections: RecordOverviewReflection[];
  ethics: RecordOverviewEthics[];
}

export interface RecordOverviewResult {
  categoryId: string;
  slug: string;
  teams: RecordOverviewTeam[];
}

export async function fetchRecordOverview(
  db: RecordDb,
  categoryId: string,
): Promise<RecordOverviewResult> {
  const { data: category } = await db
    .from("categories")
    .select("id, slug")
    .eq("id", categoryId)
    .maybeSingle();
  if (!category) throw new Error("게시판을 찾을 수 없어요.");

  const { data: posts, error: postsErr } = await db
    .from("posts")
    .select("id, post_no, title, category_id")
    .eq("category_id", categoryId)
    .eq("type", "record")
    .order("post_no", { ascending: true });
  if (postsErr) throw new Error(postsErr.message);

  const postIds = (posts ?? []).map((p: any) => p.id);
  if (postIds.length === 0) {
    return { categoryId, slug: category.slug as string, teams: [] };
  }

  const [{ data: members }, { data: finals }, { data: rows }, { data: reflections }, { data: ethics }] =
    await Promise.all([
      db
        .from("record_members")
        .select("id, post_id, username, username_key")
        .in("post_id", postIds)
        .order("created_at", { ascending: true }),
      db.from("record_final").select("*").in("post_id", postIds),
      db
        .from("record_rows")
        .select("*")
        .in("post_id", postIds)
        .order("kind", { ascending: true })
        .order("sort_order", { ascending: true }),
      db
        .from("record_reflections")
        .select("id, post_id, username, username_key, content, promise, updated_at")
        .in("post_id", postIds)
        .order("created_at", { ascending: true }),
      db
        .from("record_ethics")
        .select("*")
        .in("post_id", postIds)
        .order("created_at", { ascending: true }),
    ]);

  const finalByPost = new Map<string, any>((finals ?? []).map((f: any) => [f.post_id, f]));
  const rowsByPost = new Map<string, any[]>();
  for (const r of rows ?? []) {
    const list = rowsByPost.get(r.post_id) ?? [];
    list.push(r);
    rowsByPost.set(r.post_id, list);
  }
  const membersByPost = new Map<string, any[]>();
  for (const m of members ?? []) {
    const list = membersByPost.get(m.post_id) ?? [];
    list.push(m);
    membersByPost.set(m.post_id, list);
  }
  const reflectionsByPost = new Map<string, any[]>();
  for (const r of reflections ?? []) {
    const list = reflectionsByPost.get(r.post_id) ?? [];
    list.push(r);
    reflectionsByPost.set(r.post_id, list);
  }
  const ethicsByPost = new Map<string, any[]>();
  for (const e of ethics ?? []) {
    const list = ethicsByPost.get(e.post_id) ?? [];
    list.push(e);
    ethicsByPost.set(e.post_id, list);
  }



  const teams = (posts ?? []).map((p: any): RecordOverviewTeam => {
    const f = finalByPost.get(p.id);
    const finalDto: RecordOverviewFinal | null = f
      ? ({
          ...(Object.fromEntries(
            RECORD_FINAL_FIELDS.map((field) => [field.key, f[field.column] ?? ""]),
          ) as Record<(typeof RECORD_FINAL_FIELDS)[number]["key"], string>),
          updatedBy: f.updated_by ?? "",
          updatedAt: f.updated_at ?? "",
        } as RecordOverviewFinal)
      : null;

    return {
      postId: p.id,
      postNo: p.post_no ?? 0,
      categoryId: p.category_id,
      slug: category.slug as string,
      teamName: p.title,
      members: (membersByPost.get(p.id) ?? []).map((m: any) => ({
        id: m.id,
        username: m.username,
        usernameKey: m.username_key,
        affiliation: m.affiliation ?? "",
        role: m.role ?? "",
      })),
      final: finalDto,
      rows: (rowsByPost.get(p.id) ?? []).map((r: any) => ({
        kind: r.kind as RecordRowKind,
        sortOrder: r.sort_order ?? 0,
        subtype: r.subtype ?? "",
        author: r.author ?? "",
        col1: r.col1 ?? "",
        col2: r.col2 ?? "",
        col3: r.col3 ?? "",
        col4: r.col4 ?? "",
        col5: r.col5 ?? "",
        col6: r.col6 ?? "",
        updatedBy: r.updated_by ?? "",
        updatedAt: r.updated_at ?? "",
      })),
      reflections: (reflectionsByPost.get(p.id) ?? []).map((r: any) => ({
        id: r.id,
        username: r.username,
        usernameKey: r.username_key,
        affiliation: r.affiliation ?? "",
        role: r.role ?? "",
        q1: r.q1 ?? "",
        q2: r.q2 ?? "",
        promises: Array.isArray(r.promises) ? r.promises : [],
        promiseDetail: r.promise_detail ?? "",
        spreadPlan: r.spread_plan ?? "",
        updatedAt: r.updated_at ?? "",
      })),
      ethics: (ethicsByPost.get(p.id) ?? []).map((e: any) => ({
        id: e.id,
        username: e.username ?? "",
        usernameKey: e.username_key,
        s1: Number(e.s1 ?? 0),
        s2: Number(e.s2 ?? 0),
        s3: Number(e.s3 ?? 0),
        s4: Number(e.s4 ?? 0),
        s5: Number(e.s5 ?? 0),
        s6: Number(e.s6 ?? 0),
        s7: Number(e.s7 ?? 0),
        extraPromise: e.extra_promise ?? "",
        updatedAt: e.updated_at ?? "",
      })),
    };
  });



  return { categoryId, slug: category.slug as string, teams };
}
