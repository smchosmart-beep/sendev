import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  RECORD_FINAL_FIELDS,
  RECORD_FINAL_COLUMN_MAP,
  RECORD_ROW_KINDS,
  type RecordFinalKey,
} from "./record-schema";


import type {
  RecordRowKind,
  RecordOverviewMember,
  RecordOverviewFinal,
  RecordOverviewRow,
  RecordOverviewReflection,
  RecordOverviewTeam,
  RecordOverviewResult,
} from "./record.server";

export type {
  RecordOverviewMember,
  RecordOverviewFinal,
  RecordOverviewRow,
  RecordOverviewReflection,
  RecordOverviewTeam,
  RecordOverviewResult,
} from "./record.server";

export interface RecordMemberDTO {
  id: string;
  username: string;
  usernameKey: string;
  affiliation: string;
  role: string;
}

export type RecordFinalDTO = Record<RecordFinalKey, string> & {
  postId: string;
  updatedBy: string;
  updatedAt: string;
};

export interface RecordRowDTO {
  id: string;
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

export interface RecordReflectionDTO {
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


export interface RecordBundleDTO {
  postId: string;
  categoryId: string;
  teamName: string;
  members: RecordMemberDTO[];
  final: RecordFinalDTO | null;
  rows: RecordRowDTO[];
  reflections: RecordReflectionDTO[];
}

// 활동기록 전체(팀원 + 최종 결과물 + 반복행)를 한 번에 읽는다.
export const getRecord = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ postId: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<RecordBundleDTO | null> => {
    const R = await import("./record.server");
    const db = await R.getRecordDb();
    const { data: post } = await db
      .from("posts")
      .select("id, category_id, title, type")
      .eq("id", data.postId)
      .maybeSingle();
    if (!post || post.type !== "record") return null;

    const [{ data: members }, { data: final }, { data: rows }, { data: reflections }] = await Promise.all([
      db.from("record_members").select("*").eq("post_id", post.id).order("created_at", { ascending: true }),
      db.from("record_final").select("*").eq("post_id", post.id).maybeSingle(),
      db.from("record_rows").select("*").eq("post_id", post.id).order("kind", { ascending: true }).order("sort_order", { ascending: true }),
      db.from("record_reflections").select("*").eq("post_id", post.id).order("created_at", { ascending: true }),
    ]);

    return {
      postId: post.id,
      categoryId: post.category_id,
      teamName: post.title,
      members: (members ?? []).map((m: any) => ({
        id: m.id,
        username: m.username,
        usernameKey: m.username_key,
        affiliation: m.affiliation ?? "",
        role: m.role ?? "",
      })),
      final: final
        ? ({
            ...(Object.fromEntries(
              RECORD_FINAL_FIELDS.map((f) => [f.key, (final as any)[f.column] ?? ""]),
            ) as Record<RecordFinalKey, string>),
            postId: final.post_id,
            updatedBy: final.updated_by ?? "",
            updatedAt: final.updated_at ?? "",
          } as RecordFinalDTO)
        : null,
      rows: (rows ?? []).map((r: any) => ({
        id: r.id,
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
      reflections: (reflections ?? []).map((r: any) => ({
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
    };

  });

// 관리자용: 한 카테고리의 모든 활동기록 팀별 현황을 한 번에 조회한다.
export const getRecordOverview = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        categoryId: z.string().uuid(),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<RecordOverviewResult> => {
    const R = await import("./record.server");
    if (!R.isAdminPassword(data.adminPassword)) throw new Error("권한이 없습니다.");
    const db = await R.getRecordDb();
    return R.fetchRecordOverview(db, data.categoryId);
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
    const R = await import("./record.server");
    const db = await R.getRecordDb();
    const author = await R.ensureNickname(db, data.author, data.nicknamePassword);
    const key = R.normalizeName(author);

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
    const R = await import("./record.server");
    const db = await R.getRecordDb();
    await R.requireTeamMember(db, data.postId, data.author, data.nicknamePassword, data.adminPassword);
    const { data: post } = await db
      .from("posts")
      .select("category_id")
      .eq("id", data.postId)
      .maybeSingle();
    if (!post) throw new Error("활동기록을 찾을 수 없어요.");
    const key = R.normalizeName(data.member);
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
    z.object({ postId: z.string().uuid(), memberId: z.string().uuid(), author: z.string().trim().max(100).default(""), nicknamePassword: z.string().trim().max(100).default(""), adminPassword: z.string().max(200).default("") }).parse(input),
  )
  .handler(async ({ data }) => {
    const R = await import("./record.server");
    const db = await R.getRecordDb();
    await R.requireTeamMember(db, data.postId, data.author, data.nicknamePassword, data.adminPassword);
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
          .object(
            Object.fromEntries(
              RECORD_FINAL_FIELDS.map((f) => [f.key, z.string().max(f.max).optional()]),
            ) as Record<RecordFinalKey, z.ZodOptional<z.ZodString>>,
          )
          .default({}),

        author: z.string().trim().max(100).default(""),
        nicknamePassword: z.string().trim().max(100).default(""),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true; updatedAt: string; updatedBy: string }> => {
    const R = await import("./record.server");
    const db = await R.getRecordDb();
    const who = await R.requireTeamMember(
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
    const map = RECORD_FINAL_COLUMN_MAP;

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
// kind='check'는 8개 고정 문항이라 (post_id, sort_order) 부분 유니크 인덱스가 있고,
// 동시 클릭 시 23505가 나면 다시 조회해 update로 폴백한다.
export const saveRecordRow = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        postId: z.string().uuid(),
        id: z.string().uuid().nullable().default(null),
        kind: z.enum([
          "feature",
          "flow",
          "limit",
          "plan",
          "maker",
          "process",
          "devlog",
          "check",
        ]),
        sortOrder: z.number().int().min(0).max(999).default(0),
        col1: z.string().max(2000).default(""),
        col2: z.string().max(2000).default(""),
        col3: z.string().max(2000).default(""),
        knownUpdatedAt: z.string().max(40).default(""),
        author: z.string().trim().max(100).default(""),
        nicknamePassword: z.string().trim().max(100).default(""),
        adminPassword: z.string().max(200).default(""),
      })
      .superRefine((v, ctx) => {
        // 1차 섹션은 기존과 동일하게 1000자, 2차(과정기록/개발기록)만 2000자 허용
        const limit = v.kind === "process" || v.kind === "devlog" ? 2000 : 1000;
        for (const key of ["col1", "col2", "col3"] as const) {
          if ((v[key] ?? "").length > limit) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [key],
              message: `${limit}자까지 입력할 수 있어요.`,
            });
          }
        }
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ id: string; updatedAt: string; updatedBy: string }> => {
    const R = await import("./record.server");
    const db = await R.getRecordDb();
    const who = await R.requireTeamMember(
      db,
      data.postId,
      data.author,
      data.nicknamePassword,
      data.adminPassword,
    );
    if (!R.RECORD_ROW_KINDS.includes(data.kind)) throw new Error("잘못된 항목이에요.");
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

    const updateById = async (id: string) => {
      const { data: saved, error } = await db
        .from("record_rows")
        .update(payload)
        .eq("id", id)
        .eq("post_id", data.postId)
        .select("id, updated_at")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!saved) throw new Error("행을 찾을 수 없어요.");
      return { id: saved.id as string, updatedAt: saved.updated_at as string, updatedBy: who };
    };

    let targetId = data.id;

    // 고정 문항은 (post_id, sort_order)로 기존 행을 먼저 찾는다.
    if (!targetId && data.kind === "check") {
      const { data: existing } = await db
        .from("record_rows")
        .select("id")
        .eq("post_id", data.postId)
        .eq("kind", "check")
        .eq("sort_order", data.sortOrder)
        .maybeSingle();
      if (existing) targetId = existing.id;
    }

    if (targetId) {
      const { data: current } = await db
        .from("record_rows")
        .select("updated_at")
        .eq("id", targetId)
        .maybeSingle();
      if (
        current &&
        data.knownUpdatedAt &&
        new Date(current.updated_at).getTime() > new Date(data.knownUpdatedAt).getTime()
      ) {
        throw new Error("다른 팀원이 먼저 수정했어요. 최신 내용을 불러온 뒤 다시 저장해 주세요.");
      }
      return updateById(targetId);
    }

    const { data: saved, error } = await db
      .from("record_rows")
      .insert(payload)
      .select("id, updated_at")
      .maybeSingle();
    if (error) {
      const dup =
        (error as any)?.code === "23505" ||
        String(error.message ?? "").toLowerCase().includes("duplicate");
      if (data.kind === "check" && dup) {
        const { data: again } = await db
          .from("record_rows")
          .select("id")
          .eq("post_id", data.postId)
          .eq("kind", "check")
          .eq("sort_order", data.sortOrder)
          .maybeSingle();
        if (again) return updateById(again.id);
      }
      throw new Error(error.message);
    }
    return { id: saved.id, updatedAt: saved.updated_at, updatedBy: who };
  });

// 개인 후기와 약속 — 본인 닉네임 행만 쓰기, 관리자는 삭제만.
export const saveRecordReflection = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        postId: z.string().uuid(),
        content: z.string().max(2000).default(""),
        promise: z.string().max(1000).default(""),
        knownUpdatedAt: z.string().max(40).default(""),
        author: z.string().trim().min(1).max(100),
        nicknamePassword: z.string().trim().max(100).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ id: string; updatedAt: string }> => {
    const R = await import("./record.server");
    const db = await R.getRecordDb();
    const name = await R.ensureNickname(db, data.author, data.nicknamePassword);
    const key = R.normalizeName(name);
    const { data: member } = await db
      .from("record_members")
      .select("id")
      .eq("post_id", data.postId)
      .eq("username_key", key)
      .maybeSingle();
    if (!member) throw new Error("이 활동기록의 팀원만 후기를 쓸 수 있어요.");

    const { data: current } = await db
      .from("record_reflections")
      .select("id, updated_at")
      .eq("post_id", data.postId)
      .eq("username_key", key)
      .maybeSingle();
    if (
      current &&
      data.knownUpdatedAt &&
      new Date(current.updated_at).getTime() > new Date(data.knownUpdatedAt).getTime()
    ) {
      throw new Error("다른 기기에서 먼저 저장했어요. 최신 내용을 불러온 뒤 다시 저장해 주세요.");
    }

    const payload = {
      post_id: data.postId,
      username: name,
      username_key: key,
      content: data.content,
      promise: data.promise,
      updated_by: name,
      updated_at: new Date().toISOString(),
    };
    const { data: saved, error } = await db
      .from("record_reflections")
      .upsert(payload, { onConflict: "post_id,username_key" })
      .select("id, updated_at")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { id: saved.id, updatedAt: saved.updated_at };
  });

export const deleteRecordReflection = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        postId: z.string().uuid(),
        id: z.string().uuid(),
        author: z.string().trim().max(100).default(""),
        nicknamePassword: z.string().trim().max(100).default(""),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const R = await import("./record.server");
    const db = await R.getRecordDb();
    let filterKey: string | null = null;
    if (!R.isAdminPassword(data.adminPassword)) {
      const name = await R.ensureNickname(db, data.author, data.nicknamePassword);
      filterKey = R.normalizeName(name);
    }
    let q = db.from("record_reflections").delete().eq("id", data.id).eq("post_id", data.postId);
    if (filterKey) q = q.eq("username_key", filterKey);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRecordRow = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ postId: z.string().uuid(), id: z.string().uuid(), author: z.string().trim().max(100).default(""), nicknamePassword: z.string().trim().max(100).default(""), adminPassword: z.string().max(200).default("") }).parse(input),
  )
  .handler(async ({ data }) => {
    const R = await import("./record.server");
    const db = await R.getRecordDb();
    await R.requireTeamMember(db, data.postId, data.author, data.nicknamePassword, data.adminPassword);
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
