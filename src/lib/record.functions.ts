import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { RecordRowKind } from "./record.server";

export interface RecordMemberDTO {
  id: string;
  username: string;
  usernameKey: string;
}

export interface RecordFinalDTO {
  postId: string;
  serviceName: string;
  oneLiner: string;
  targetUser: string;
  problem: string;
  solution: string;
  heroImageUrl: string;
  deployUrl: string;
  githubUrl: string;
  techStack: string;
  envNames: string;
  updatedBy: string;
  updatedAt: string;
}

export interface RecordRowDTO {
  id: string;
  kind: RecordRowKind;
  sortOrder: number;
  col1: string;
  col2: string;
  col3: string;
  updatedBy: string;
  updatedAt: string;
}

export interface RecordBundleDTO {
  postId: string;
  categoryId: string;
  teamName: string;
  members: RecordMemberDTO[];
  final: RecordFinalDTO | null;
  rows: RecordRowDTO[];
}

// 활동기록 전체(팀원 + 최종 결과물 + 반복행)를 한 번에 읽는다.
export const getRecord = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ postId: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<RecordBundleDTO | null> => {
    const { getRecordDb, ensureNickname, normalizeName, requireTeamMember, isAdminPassword, RECORD_ROW_KINDS } = await import("./record.server");
    void ensureNickname; void normalizeName; void requireTeamMember; void isAdminPassword; void RECORD_ROW_KINDS;
    const db = await getRecordDb();
    const { data: post } = await db
      .from("posts")
      .select("id, category_id, title, type")
      .eq("id", data.postId)
      .maybeSingle();
    if (!post || post.type !== "record") return null;

    const [{ data: members }, { data: final }, { data: rows }] = await Promise.all([
      db.from("record_members").select("id, username, username_key").eq("post_id", post.id).order("created_at", { ascending: true }),
      db.from("record_final").select("*").eq("post_id", post.id).maybeSingle(),
      db.from("record_rows").select("*").eq("post_id", post.id).order("kind", { ascending: true }).order("sort_order", { ascending: true }),
    ]);

    return {
      postId: post.id,
      categoryId: post.category_id,
      teamName: post.title,
      members: (members ?? []).map((m: any) => ({
        id: m.id,
        username: m.username,
        usernameKey: m.username_key,
      })),
      final: final
        ? {
            postId: final.post_id,
            serviceName: final.service_name ?? "",
            oneLiner: final.one_liner ?? "",
            targetUser: final.target_user ?? "",
            problem: final.problem ?? "",
            solution: final.solution ?? "",
            heroImageUrl: final.hero_image_url ?? "",
            deployUrl: final.deploy_url ?? "",
            githubUrl: final.github_url ?? "",
            techStack: final.tech_stack ?? "",
            envNames: final.env_names ?? "",
            updatedBy: final.updated_by ?? "",
            updatedAt: final.updated_at ?? "",
          }
        : null,
      rows: (rows ?? []).map((r: any) => ({
        id: r.id,
        kind: r.kind as RecordRowKind,
        sortOrder: r.sort_order ?? 0,
        col1: r.col1 ?? "",
        col2: r.col2 ?? "",
        col3: r.col3 ?? "",
        updatedBy: r.updated_by ?? "",
        updatedAt: r.updated_at ?? "",
      })),
    };
  });

// 팀 활동기록 글을 새로 만든다. 같은 게시판에서 이미 다른 팀에 속해 있으면
// 새로 만들지 않고 기존 기록으로 안내한다(팀당 활동기록 1개 원칙).
export const createRecord = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        categoryId: z.string().uuid(),
        teamName: z.string().trim().min(1).max(200),
        author: z.string().trim().min(1).max(100),
        nicknamePassword: z.string().trim().max(100).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ postNo: number; existing: boolean }> => {
    const { getRecordDb, ensureNickname, normalizeName, requireTeamMember, isAdminPassword, RECORD_ROW_KINDS } = await import("./record.server");
    void ensureNickname; void normalizeName; void requireTeamMember; void isAdminPassword; void RECORD_ROW_KINDS;
    const db = await getRecordDb();
    const author = await ensureNickname(db, data.author, data.nicknamePassword);
    const key = normalizeName(author);

    const { data: mine } = await db
      .from("record_members")
      .select("post_id")
      .eq("category_id", data.categoryId)
      .eq("username_key", key)
      .maybeSingle();
    if (mine) {
      const { data: existing } = await db
        .from("posts")
        .select("post_no")
        .eq("id", mine.post_id)
        .maybeSingle();
      if (existing) return { postNo: existing.post_no ?? 0, existing: true };
    }

    for (let attempt = 0; attempt < 8; attempt++) {
      const { data: maxRow } = await db
        .from("posts")
        .select("post_no")
        .eq("category_id", data.categoryId)
        .order("post_no", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextNo = (maxRow?.post_no ?? 0) + 1;
      const { data: inserted, error } = await db
        .from("posts")
        .insert({
          category_id: data.categoryId,
          post_no: nextNo,
          type: "record",
          title: data.teamName,
          author,
          content: "",
        })
        .select("id")
        .maybeSingle();
      if (!error && inserted) {
        await db.from("record_members").insert({
          post_id: inserted.id,
          category_id: data.categoryId,
          username: author,
          username_key: key,
        });
        await db.from("record_final").insert({ post_id: inserted.id, updated_by: author });
        return { postNo: nextNo, existing: false };
      }
      if (!String(error?.message ?? "").toLowerCase().includes("duplicate")) {
        throw new Error(error?.message ?? "활동기록을 만들지 못했어요.");
      }
      await new Promise((r) => setTimeout(r, 20 * 2 ** attempt));
    }
    throw new Error("게시글 번호를 부여하지 못했어요. 다시 시도해주세요.");
  });

// 팀원 추가 — 한 게시판에서 한 사람은 한 팀에만 속할 수 있다.
export const addRecordMember = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        postId: z.string().uuid(),
        member: z.string().trim().min(1).max(100),
        author: z.string().trim().max(100).default(""),
        nicknamePassword: z.string().trim().max(100).default(""),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { getRecordDb, ensureNickname, normalizeName, requireTeamMember, isAdminPassword, RECORD_ROW_KINDS } = await import("./record.server");
    void ensureNickname; void normalizeName; void requireTeamMember; void isAdminPassword; void RECORD_ROW_KINDS;
    const db = await getRecordDb();
    await requireTeamMember(db, data.postId, data.author, data.nicknamePassword, data.adminPassword);
    const { data: post } = await db
      .from("posts")
      .select("category_id")
      .eq("id", data.postId)
      .maybeSingle();
    if (!post) throw new Error("활동기록을 찾을 수 없어요.");
    const key = normalizeName(data.member);
    const { data: dup } = await db
      .from("record_members")
      .select("post_id")
      .eq("category_id", post.category_id)
      .eq("username_key", key)
      .maybeSingle();
    if (dup) {
      throw new Error(
        dup.post_id === data.postId
          ? "이미 이 팀의 팀원이에요."
          : "이 게시판에서 이미 다른 팀에 속해 있어요.",
      );
    }
    const { error } = await db.from("record_members").insert({
      post_id: data.postId,
      category_id: post.category_id,
      username: data.member.trim(),
      username_key: key,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeRecordMember = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ postId: z.string().uuid(), memberId: z.string().uuid(), ...authFields }).parse(input),
  )
  .handler(async ({ data }) => {
    const { getRecordDb, ensureNickname, normalizeName, requireTeamMember, isAdminPassword, RECORD_ROW_KINDS } = await import("./record.server");
    void ensureNickname; void normalizeName; void requireTeamMember; void isAdminPassword; void RECORD_ROW_KINDS;
    const db = await getRecordDb();
    await requireTeamMember(db, data.postId, data.author, data.nicknamePassword, data.adminPassword);
    const { data: rest } = await db
      .from("record_members")
      .select("id")
      .eq("post_id", data.postId);
    if ((rest ?? []).length <= 1) throw new Error("팀원은 최소 한 명 있어야 해요.");
    const { error } = await db
      .from("record_members")
      .delete()
      .eq("id", data.memberId)
      .eq("post_id", data.postId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// 최종 결과물 저장 — 변경된 필드만 patch로 받고, 서버 값이 더 최신이면 거부한다.
export const saveRecordFinal = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        postId: z.string().uuid(),
        knownUpdatedAt: z.string().max(40).default(""),
        patch: z
          .object({
            serviceName: z.string().max(200).optional(),
            oneLiner: z.string().max(300).optional(),
            targetUser: z.string().max(500).optional(),
            problem: z.string().max(2000).optional(),
            solution: z.string().max(2000).optional(),
            heroImageUrl: z.string().max(2000).optional(),
            deployUrl: z.string().max(500).optional(),
            githubUrl: z.string().max(500).optional(),
            techStack: z.string().max(1000).optional(),
            envNames: z.string().max(1000).optional(),
          })
          .default({}),
        author: z.string().trim().max(100).default(""),
        nicknamePassword: z.string().trim().max(100).default(""),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true; updatedAt: string; updatedBy: string }> => {
    const { getRecordDb, ensureNickname, normalizeName, requireTeamMember, isAdminPassword, RECORD_ROW_KINDS } = await import("./record.server");
    void ensureNickname; void normalizeName; void requireTeamMember; void isAdminPassword; void RECORD_ROW_KINDS;
    const db = await getRecordDb();
    const who = await requireTeamMember(
      db,
      data.postId,
      data.author,
      data.nicknamePassword,
      data.adminPassword,
    );
    const { data: current } = await db
      .from("record_final")
      .select("updated_at")
      .eq("post_id", data.postId)
      .maybeSingle();
    if (
      current &&
      data.knownUpdatedAt &&
      new Date(current.updated_at).getTime() > new Date(data.knownUpdatedAt).getTime()
    ) {
      throw new Error("다른 팀원이 먼저 수정했어요. 최신 내용을 불러온 뒤 다시 저장해 주세요.");
    }
    const map: Record<string, string> = {
      serviceName: "service_name",
      oneLiner: "one_liner",
      targetUser: "target_user",
      problem: "problem",
      solution: "solution",
      heroImageUrl: "hero_image_url",
      deployUrl: "deploy_url",
      githubUrl: "github_url",
      techStack: "tech_stack",
      envNames: "env_names",
    };
    const patch: Record<string, unknown> = { updated_by: who, updated_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(data.patch)) {
      if (v !== undefined && map[k]) patch[map[k]] = v;
    }
    const { data: saved, error } = await db
      .from("record_final")
      .upsert({ post_id: data.postId, ...patch }, { onConflict: "post_id" })
      .select("updated_at")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true, updatedAt: saved?.updated_at ?? new Date().toISOString(), updatedBy: who };
  });

// 반복행 저장(행 단위 upsert). id가 없으면 새 행을 만든다.
export const saveRecordRow = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        postId: z.string().uuid(),
        id: z.string().uuid().nullable().default(null),
        kind: z.enum(["feature", "flow", "limit", "plan", "maker"]),
        sortOrder: z.number().int().min(0).max(999).default(0),
        col1: z.string().max(1000).default(""),
        col2: z.string().max(1000).default(""),
        col3: z.string().max(1000).default(""),
        knownUpdatedAt: z.string().max(40).default(""),
        author: z.string().trim().max(100).default(""),
        nicknamePassword: z.string().trim().max(100).default(""),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ id: string; updatedAt: string; updatedBy: string }> => {
    const { getRecordDb, ensureNickname, normalizeName, requireTeamMember, isAdminPassword, RECORD_ROW_KINDS } = await import("./record.server");
    void ensureNickname; void normalizeName; void requireTeamMember; void isAdminPassword; void RECORD_ROW_KINDS;
    const db = await getRecordDb();
    const who = await requireTeamMember(
      db,
      data.postId,
      data.author,
      data.nicknamePassword,
      data.adminPassword,
    );
    if (!RECORD_ROW_KINDS.includes(data.kind)) throw new Error("잘못된 항목이에요.");
    const payload = {
      post_id: data.postId,
      kind: data.kind,
      sort_order: data.sortOrder,
      col1: data.col1,
      col2: data.col2,
      col3: data.col3,
      updated_by: who,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { data: current } = await db
        .from("record_rows")
        .select("updated_at")
        .eq("id", data.id)
        .maybeSingle();
      if (
        current &&
        data.knownUpdatedAt &&
        new Date(current.updated_at).getTime() > new Date(data.knownUpdatedAt).getTime()
      ) {
        throw new Error("다른 팀원이 먼저 수정했어요. 최신 내용을 불러온 뒤 다시 저장해 주세요.");
      }
      const { data: saved, error } = await db
        .from("record_rows")
        .update(payload)
        .eq("id", data.id)
        .eq("post_id", data.postId)
        .select("id, updated_at")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!saved) throw new Error("행을 찾을 수 없어요.");
      return { id: saved.id, updatedAt: saved.updated_at, updatedBy: who };
    }
    const { data: saved, error } = await db
      .from("record_rows")
      .insert(payload)
      .select("id, updated_at")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { id: saved.id, updatedAt: saved.updated_at, updatedBy: who };
  });

export const deleteRecordRow = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ postId: z.string().uuid(), id: z.string().uuid(), ...authFields }).parse(input),
  )
  .handler(async ({ data }) => {
    const { getRecordDb, ensureNickname, normalizeName, requireTeamMember, isAdminPassword, RECORD_ROW_KINDS } = await import("./record.server");
    void ensureNickname; void normalizeName; void requireTeamMember; void isAdminPassword; void RECORD_ROW_KINDS;
    const db = await getRecordDb();
    await requireTeamMember(db, data.postId, data.author, data.nicknamePassword, data.adminPassword);
    const { error } = await db
      .from("record_rows")
      .delete()
      .eq("id", data.id)
      .eq("post_id", data.postId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// 관리자 전용: 활동기록 글 삭제는 기존 게시글 삭제 경로를 쓰지 않고 별도로 막아둔다.
export const isRecordAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ adminPassword: z.string().max(200).default("") }).parse(input))
  .handler(async ({ data }) => {
    const { isAdminPassword } = await import("./record.server");
    return { ok: isAdminPassword(data.adminPassword) };
  });
