import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  GROWTH_ALL_FIELDS,
  GROWTH_REPEATER_ITEM_MAX,
  GROWTH_REPEATER_MAX,
  type GrowthFieldKey,
  type GrowthRecordData,
} from "./record-growth-schema";

/** 카멜케이스 필드 → DB 컬럼 이름 */
const COLUMN_MAP: Record<string, string> = {
  projectName: "project_name",
  oneLine: "one_line",
  primaryUser: "primary_user",
  problemArea: "problem_area",
  resultType: "result_type",
  problemText: "problem_text",
  evidence: "evidence",
  solution: "solution",
  expectedChange: "expected_change",
  resultUrl: "result_url",
  status: "status",
  tools: "tools",
  difficulty: "difficulty",
  resolution: "resolution",
  aiWork: "ai_work",
  humanCheck: "human_check",
  privacy: "privacy",
  educationCheck: "education_check",
  promise: "promise",
  learned: "learned",
  nextPlan: "next_plan",
  heroImageUrl: "hero_image_url",
};

type GrowthRow = Record<string, unknown>;

type GrowthPostRef = { id: string; post_no: number | null; title: string; author: string };

function toDTO(row: GrowthRow | null, postId: string): GrowthRecordData {
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const arr = (v: unknown) =>
    Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : "")) : [];
  const base = Object.fromEntries(
    GROWTH_ALL_FIELDS.map((f) => [f.key, s(row?.[COLUMN_MAP[f.key]!])]),
  ) as Record<GrowthFieldKey, string>;
  return {
    ...base,
    features: arr(row?.["features"]),
    flow: arr(row?.["flow"]),
    ethics: arr(row?.["ethics"]),
    heroImageUrl: s(row?.["hero_image_url"]),
    updatedBy: s(row?.["updated_by"]),
    updatedAt: s(row?.["updated_at"]),
    // postId는 DTO에 포함하지 않지만 호출부 디버깅 편의를 위해 남기지 않는다.
    ...(postId ? {} : {}),
  };
}

export interface GrowthBundleDTO {
  postId: string;
  categoryId: string;
  title: string;
  author: string;
  data: GrowthRecordData;
}

export const getGrowthRecord = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ postId: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<GrowthBundleDTO | null> => {
    const R = await import("./record.server");
    const db = await R.getRecordDb();
    const { data: post } = await db
      .from("posts")
      .select("id, category_id, title, author, type")
      .eq("id", data.postId)
      .maybeSingle();
    if (!post || post.type !== "record") return null;
    const { data: row } = await db
      .from("record_growth")
      .select("*")
      .eq("post_id", post.id)
      .maybeSingle();
    return {
      postId: post.id,
      categoryId: post.category_id,
      title: post.title,
      author: post.author,
      data: toDTO((row as GrowthRow | null) ?? null, post.id),
    };
  });

const textPatchShape = Object.fromEntries(
  GROWTH_ALL_FIELDS.map((f) => [f.key, z.string().max(f.max).optional()]),
) as Record<GrowthFieldKey, z.ZodOptional<z.ZodString>>;

export const saveGrowthRecord = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        postId: z.string().uuid(),
        knownUpdatedAt: z.string().max(40).default(""),
        patch: z
          .object({
            ...textPatchShape,
            heroImageUrl: z.string().max(1000).optional(),
            features: z
              .array(z.string().max(GROWTH_REPEATER_ITEM_MAX))
              .max(GROWTH_REPEATER_MAX)
              .optional(),
            flow: z
              .array(z.string().max(GROWTH_REPEATER_ITEM_MAX))
              .max(GROWTH_REPEATER_MAX)
              .optional(),
            ethics: z.array(z.string().max(100)).max(20).optional(),
          })
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
    // 성장형은 개인 기록: 작성자 본인 또는 관리자만 수정 가능
    let who: string;
    if (R.isAdminPassword(data.adminPassword)) {
      who = (data.author ?? "").trim() || "관리자";
    } else {
      const name = await R.ensureNickname(db, data.author, data.nicknamePassword);
      const { data: post } = await db
        .from("posts")
        .select("author")
        .eq("id", data.postId)
        .maybeSingle();
      const owner = (post as { author: string } | null)?.author ?? "";
      if (R.normalizeName(owner) !== R.normalizeName(name)) {
        throw new Error("이 활동기록은 작성자 본인만 수정할 수 있어요.");
      }
      who = name;
    }


    const { data: current } = await db
      .from("record_growth")
      .select("updated_at")
      .eq("post_id", data.postId)
      .maybeSingle();
    if (
      current &&
      data.knownUpdatedAt &&
      new Date((current as { updated_at: string }).updated_at).getTime() >
        new Date(data.knownUpdatedAt).getTime()
    ) {
      throw new Error("다른 곳에서 먼저 수정했어요. 최신 내용을 불러온 뒤 다시 저장해 주세요.");
    }

    const patch: Record<string, unknown> = {
      updated_by: who,
      updated_at: new Date().toISOString(),
    };
    for (const [k, v] of Object.entries(data.patch)) {
      if (v === undefined) continue;
      if (k === "features" || k === "flow" || k === "ethics") {
        patch[k] = (v as string[]).map((x) => x.trim()).filter((x) => x.length > 0);
        continue;
      }
      const col = COLUMN_MAP[k];
      if (col) patch[col] = v;
    }

    const { data: saved, error } = await db
      .from("record_growth")
      .upsert({ post_id: data.postId, ...patch }, { onConflict: "post_id" })
      .select("updated_at")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      ok: true,
      updatedAt: (saved as { updated_at: string } | null)?.updated_at ?? new Date().toISOString(),
      updatedBy: who,
    };
  });

export interface GrowthOverviewItem {
  postId: string;
  postNo: number;
  title: string;
  author: string;
  updatedBy: string;
  updatedAt: string;
  data: GrowthRecordData;
}

export const getGrowthOverview = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ categoryId: z.string().uuid(), adminPassword: z.string().max(200).default("") })
      .parse(input),
  )
  .handler(async ({ data }): Promise<GrowthOverviewItem[]> => {
    const R = await import("./record.server");
    if (!R.isAdminPassword(data.adminPassword)) throw new Error("권한이 없습니다.");
    const db = await R.getRecordDb();
    const { data: posts } = await db
      .from("posts")
      .select("id, post_no, title, author")
      .eq("category_id", data.categoryId)
      .eq("type", "record")
      .order("post_no", { ascending: true });
    const ids = ((posts ?? []) as GrowthPostRef[]).map((p) => p.id);
    if (ids.length === 0) return [];
    const { data: rows } = await db.from("record_growth").select("*").in("post_id", ids);
    const byId = new Map<string, GrowthRow>(
      ((rows ?? []) as GrowthRow[]).map((r) => [String(r["post_id"]), r]),
    );
    return ((posts ?? []) as GrowthPostRef[]).map((p) => {
      const dto = toDTO(byId.get(p.id) ?? null, p.id);
      return {
        postId: p.id,
        postNo: p.post_no ?? 0,
        title: p.title,
        author: p.author,
        updatedBy: dto.updatedBy,
        updatedAt: dto.updatedAt,
        data: dto,
      };
    });
  });
