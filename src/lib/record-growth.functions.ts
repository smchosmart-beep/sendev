import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  GROWTH_ALL_FIELDS,
  GROWTH_EMPTY,
  GROWTH_EMPTY_REVIEW,
  GROWTH_FIX_MAX,
  GROWTH_PRIVACY_CHOICES,
  GROWTH_REPEATER_ITEM_MAX,
  GROWTH_REPEATER_MAX,
  type GrowthAngleKey,
  type GrowthFieldKey,
  type GrowthFix,
  type GrowthGivenFeedback,
  type GrowthPeerAssignment,
  type GrowthRecordData,
  type GrowthReceivedFeedback,
  type GrowthReviewData,
  type GrowthSelfCheckKey,
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
  githubUrl: "github_url",
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

const CHECK_KEYS: GrowthSelfCheckKey[] = [
  "oneLiner",
  "firstScreen",
  "feature1",
  "feature2",
  "feature3",
  "flow",
];
const ANGLE_KEYS: GrowthAngleKey[] = ["normal", "invalid", "boundary", "storage", "privacy", "failure"];

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function parseFix(raw: unknown): GrowthFix {
  const f = asObj(raw);
  const s = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
  const t = f["type"];
  return {
    what: s(f["what"], GROWTH_FIX_MAX.what),
    how: s(f["how"], GROWTH_FIX_MAX.how),
    skipped: s(f["skipped"], GROWTH_FIX_MAX.skipped),
    type: t === "today" || t === "later" || t === "no" ? t : "",
  };
}

/** 이전 구조(selfChecks 등)는 관대하게 무시하고 빈 값으로 시작한다. */
function parseReview(raw: unknown): GrowthReviewData {
  const r = asObj(raw);
  const self = asObj(r["self"]);
  const ai = asObj(r["ai"]);
  const peer = asObj(r["peer"]);

  const checks = { ...GROWTH_EMPTY_REVIEW.self.checks };
  const rawChecks = asObj(self["checks"]);
  for (const k of CHECK_KEYS) {
    const v = rawChecks[k];
    if (v === "done" || v === "screenOnly" || v === "no") checks[k] = v;
  }
  const angles = { ...GROWTH_EMPTY_REVIEW.self.angles };
  const rawAngles = asObj(self["angles"]);
  for (const k of ANGLE_KEYS) {
    const v = rawAngles[k];
    if (v === "checked" || v === "issue" || v === "na") angles[k] = v;
  }

  const rawQuestions = Array.isArray(ai["questions"]) ? ai["questions"] : [];
  const questions = rawQuestions
    .map((x) => asObj(x))
    .map((x) => ({
      q: typeof x["q"] === "string" ? x["q"] : "",
      a: typeof x["a"] === "string" ? x["a"].slice(0, 200) : "",
      unanswered: x["unanswered"] === true,
    }))
    .filter((x) => x.q);

  const rawAssigned = Array.isArray(peer["assigned"]) ? peer["assigned"] : [];
  const assigned: GrowthPeerAssignment[] = rawAssigned
    .map((x) => asObj(x))
    .filter((x) => typeof x["postId"] === "string" && x["postId"])
    .map((x) => ({
      postId: String(x["postId"]),
      postNo: typeof x["postNo"] === "number" ? x["postNo"] : 0,
      author: typeof x["author"] === "string" ? x["author"] : "",
    }));

  const rawGiven = Array.isArray(peer["given"]) ? peer["given"] : [];
  const given: GrowthGivenFeedback[] = rawGiven
    .map((x) => asObj(x))
    .map((x) => ({
      toPostId: typeof x["toPostId"] === "string" ? x["toPostId"] : "",
      to: typeof x["to"] === "string" ? x["to"] : "",
      expected: typeof x["expected"] === "string" ? x["expected"] : "",
      actual: typeof x["actual"] === "string" ? x["actual"] : "",
      sent: x["sent"] === true,
    }))
    .filter((x) => x.toPostId);

  return {
    self: { checks, angles, fix: parseFix(self["fix"]) },
    ai: {
      revealed: typeof ai["revealed"] === "number" ? Math.max(0, Math.min(5, ai["revealed"])) : 0,
      questions,
      fix: parseFix(ai["fix"]),
    },
    peer: { assigned, given, fix: parseFix(peer["fix"]) },
  };
}

function toDTO(row: GrowthRow | null, postId: string): GrowthRecordData {
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const arr = (v: unknown) =>
    Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : "")) : [];
  const base = Object.fromEntries(
    GROWTH_ALL_FIELDS.map((f) => [f.key, s(row?.[COLUMN_MAP[f.key]!])]),
  ) as Record<GrowthFieldKey, string>;
  return {
    ...base,
    privacy: s(row?.["privacy"]),
    features: arr(row?.["features"]),
    flow: arr(row?.["flow"]),
    ethics: arr(row?.["ethics"]),
    heroImageUrl: s(row?.["hero_image_url"]),
    updatedBy: s(row?.["updated_by"]),
    updatedAt: s(row?.["updated_at"]),
    review: parseReview(row?.["review"]),
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

const fixSchema = z.object({
  what: z.string().max(GROWTH_FIX_MAX.what).default(""),
  how: z.string().max(GROWTH_FIX_MAX.how).default(""),
  skipped: z.string().max(GROWTH_FIX_MAX.skipped).default(""),
  type: z.enum(["today", "later", "no", ""]).default(""),
});

const reviewPatchSchema = z
  .object({
    self: z
      .object({
        checks: z
          .object({
            oneLiner: z.enum(["", "done", "screenOnly", "no"]).default(""),
            firstScreen: z.enum(["", "done", "screenOnly", "no"]).default(""),
            feature1: z.enum(["", "done", "screenOnly", "no"]).default(""),
            feature2: z.enum(["", "done", "screenOnly", "no"]).default(""),
            feature3: z.enum(["", "done", "screenOnly", "no"]).default(""),
            flow: z.enum(["", "done", "screenOnly", "no"]).default(""),
          })
          .optional(),
        angles: z
          .object({
            normal: z.enum(["", "checked", "issue", "na"]).default(""),
            invalid: z.enum(["", "checked", "issue", "na"]).default(""),
            boundary: z.enum(["", "checked", "issue", "na"]).default(""),
            storage: z.enum(["", "checked", "issue", "na"]).default(""),
            privacy: z.enum(["", "checked", "issue", "na"]).default(""),
            failure: z.enum(["", "checked", "issue", "na"]).default(""),
          })
          .optional(),
        fix: fixSchema.optional(),
      })
      .optional(),
    ai: z
      .object({
        revealed: z.number().int().min(0).max(5).optional(),
        questions: z
          .array(
            z.object({
              q: z.string().max(400),
              a: z.string().max(200).default(""),
              unanswered: z.boolean().default(false),
            }),
          )
          .max(10)
          .optional(),
        fix: fixSchema.optional(),
      })
      .optional(),
    peer: z
      .object({
        assigned: z
          .array(
            z.object({
              postId: z.string().max(60),
              postNo: z.number().int().default(0),
              author: z.string().max(100).default(""),
            }),
          )
          .max(4)
          .optional(),
        given: z
          .array(
            z.object({
              toPostId: z.string().max(60),
              to: z.string().max(100).default(""),
              expected: z.string().max(120).default(""),
              actual: z.string().max(120).default(""),
              sent: z.boolean().default(false),
            }),
          )
          .max(4)
          .optional(),
        fix: fixSchema.optional(),
      })
      .optional(),
  })
  .optional();

export const saveGrowthRecord = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        postId: z.string().uuid(),
        knownUpdatedAt: z.string().max(40).default(""),
        patch: z
          .object({
            ...textPatchShape,
            privacy: z.enum(["", ...GROWTH_PRIVACY_CHOICES] as [string, ...string[]]).optional(),
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
            review: reviewPatchSchema,
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
      if (k === "review") {
        // 새 구조를 현재 저장본과 병합해 전체를 다시 저장
        const { data: existing } = await db
          .from("record_growth")
          .select("review")
          .eq("post_id", data.postId)
          .maybeSingle();
        const merged = parseReview(existing?.review);
        const incoming = v as {
          self?: Partial<GrowthReviewData["self"]>;
          ai?: Partial<GrowthReviewData["ai"]>;
          peer?: Partial<GrowthReviewData["peer"]>;
        };
        if (incoming.self) {
          merged.self = {
            checks: { ...merged.self.checks, ...(incoming.self.checks ?? {}) },
            angles: { ...merged.self.angles, ...(incoming.self.angles ?? {}) },
            fix: incoming.self.fix ? { ...merged.self.fix, ...incoming.self.fix } : merged.self.fix,
          };
        }
        if (incoming.ai) {
          merged.ai = {
            revealed: incoming.ai.revealed ?? merged.ai.revealed,
            questions: incoming.ai.questions ?? merged.ai.questions,
            fix: incoming.ai.fix ? { ...merged.ai.fix, ...incoming.ai.fix } : merged.ai.fix,
          };
        }
        if (incoming.peer) {
          merged.peer = {
            assigned: incoming.peer.assigned ?? merged.peer.assigned,
            given: incoming.peer.given ?? merged.peer.given,
            fix: incoming.peer.fix ? { ...merged.peer.fix, ...incoming.peer.fix } : merged.peer.fix,
          };
        }
        patch[k] = merged;
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

/* ----------------------------- Peer feedback ----------------------------- */

export const getGrowthPeerAssignments = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        postId: z.string().uuid(),
        author: z.string().trim().max(100).default(""),
        nicknamePassword: z.string().trim().max(100).default(""),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ assignments: GrowthPeerAssignment[] }> => {
    const R = await import("./record.server");
    const db = await R.getRecordDb();

    if (!R.isAdminPassword(data.adminPassword)) {
      const name = await R.ensureNickname(db, data.author, data.nicknamePassword);
      const { data: post } = await db
        .from("posts")
        .select("author")
        .eq("id", data.postId)
        .maybeSingle();
      const owner = (post as { author: string } | null)?.author ?? "";
      if (R.normalizeName(owner) !== R.normalizeName(name)) {
        throw new Error("이 활동기록은 작성자 본인만 볼 수 있어요.");
      }
    }

    const { data: target } = await db
      .from("posts")
      .select("category_id, author")
      .eq("id", data.postId)
      .maybeSingle();
    if (!target) return { assignments: [] };

    const { data: existing } = await db
      .from("record_growth")
      .select("review")
      .eq("post_id", data.postId)
      .maybeSingle();
    const review = parseReview(existing?.review);
    if (review.peer.assigned.length >= 2) return { assignments: review.peer.assigned };

    // 같은 게시판(카테고리)의 성장형 기록 중 본인 제외 후보
    const { data: candidates } = await db
      .from("posts")
      .select("id, post_no, author")
      .eq("category_id", target.category_id)
      .eq("type", "record")
      .order("post_no", { ascending: true });

    const mine = R.normalizeName(target.author);
    const list = ((candidates ?? []) as GrowthPostRef[]).filter(
      (p) => p.id !== data.postId && R.normalizeName(p.author) !== mine,
    );
    if (list.length === 0) return { assignments: [] };

    // 무작위로 2명 선택
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    const assignments = shuffled.slice(0, 2).map((p) => ({
      postId: p.id,
      postNo: p.post_no ?? 0,
      author: p.author,
    }));

    await db
      .from("record_growth")
      .update({
        review: { ...review, peer: { ...review.peer, assigned: assignments } },
        updated_at: new Date().toISOString(),
      })
      .eq("post_id", data.postId);

    return { assignments };
  });

export const listGrowthPeerFeedbacks = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        postId: z.string().uuid(),
        author: z.string().trim().max(100).default(""),
        nicknamePassword: z.string().trim().max(100).default(""),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(
    async ({ data }): Promise<{ received: GrowthReceivedFeedback[]; sent: GrowthGivenFeedback[] }> => {
      const R = await import("./record.server");
      const db = await R.getRecordDb();

      if (!R.isAdminPassword(data.adminPassword)) {
        const name = await R.ensureNickname(db, data.author, data.nicknamePassword);
        const { data: post } = await db
          .from("posts")
          .select("author")
          .eq("id", data.postId)
          .maybeSingle();
        const owner = (post as { author: string } | null)?.author ?? "";
        if (R.normalizeName(owner) !== R.normalizeName(name)) {
          throw new Error("이 활동기록은 작성자 본인만 볼 수 있어요.");
        }
      }

      const { data: receivedRows } = await db
        .from("record_growth_peer_feedback")
        .select("*")
        .eq("post_id", data.postId)
        .order("created_at", { ascending: true });
      const { data: sentRows } = await db
        .from("record_growth_peer_feedback")
        .select("*")
        .eq("from_post_id", data.postId)
        .order("created_at", { ascending: true });

      type FbRow = {
        id: string;
        post_id: string;
        from_post_id: string;
        from_name: string;
        to_name: string | null;
        expected: string;
        actual: string;
        receiver_type: string;
        created_at: string;
      };
      const received: GrowthReceivedFeedback[] = ((receivedRows ?? []) as FbRow[]).map((r) => ({
        id: r.id,
        fromPostId: r.from_post_id,
        fromName: r.from_name,
        expected: r.expected,
        actual: r.actual,
        receiverType: r.receiver_type,
        createdAt: r.created_at,
      }));
      const sent: GrowthGivenFeedback[] = ((sentRows ?? []) as FbRow[]).map((r) => ({
        toPostId: r.post_id,
        to: r.to_name ?? "",
        expected: r.expected,
        actual: r.actual,
        sent: true,
      }));
      return { received, sent };
    },
  );

export const sendGrowthPeerFeedback = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        fromPostId: z.string().uuid(),
        toPostId: z.string().uuid(),
        toName: z.string().max(100).default(""),
        expected: z.string().max(120).default(""),
        actual: z.string().max(120).default(""),
        receiverType: z.enum(["", "today", "later", "no"]).default(""),
        author: z.string().trim().max(100).default(""),
        nicknamePassword: z.string().trim().max(100).default(""),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const R = await import("./record.server");
    const db = await R.getRecordDb();

    const { data: fromPost } = await db
      .from("posts")
      .select("id, category_id, author")
      .eq("id", data.fromPostId)
      .maybeSingle();
    if (!fromPost) throw new Error("보내는 활동기록을 찾을 수 없어요.");
    const { data: toPost } = await db
      .from("posts")
      .select("id, category_id, author")
      .eq("id", data.toPostId)
      .maybeSingle();
    if (!toPost) throw new Error("받는 활동기록을 찾을 수 없어요.");
    if (fromPost.category_id !== toPost.category_id) {
      throw new Error("같은 게시판의 활동기록에만 피드백을 보낼 수 있어요.");
    }

    let fromName: string;
    if (R.isAdminPassword(data.adminPassword)) {
      fromName = (data.author ?? "").trim() || "관리자";
    } else {
      fromName = await R.ensureNickname(db, data.author, data.nicknamePassword);
      if (R.normalizeName(fromPost.author) !== R.normalizeName(fromName)) {
        throw new Error("자신의 활동기록에서만 피드백을 보낼 수 있어요.");
      }
    }

    const { error } = await db.from("record_growth_peer_feedback").insert({
      post_id: data.toPostId,
      from_post_id: data.fromPostId,
      from_name: fromName,
      to_name: data.toName,
      expected: data.expected,
      actual: data.actual,
      receiver_type: data.receiverType,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** 받은 피드백의 분류(오늘 고침·다음에·고치지 않음) 저장 — 받는 사람 본인만. */
export const classifyGrowthPeerFeedback = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        feedbackId: z.string().uuid(),
        receiverType: z.enum(["", "today", "later", "no"]),
        author: z.string().trim().max(100).default(""),
        nicknamePassword: z.string().trim().max(100).default(""),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const R = await import("./record.server");
    const db = await R.getRecordDb();

    if (!R.isAdminPassword(data.adminPassword)) {
      const name = await R.ensureNickname(db, data.author, data.nicknamePassword);
      const { data: fb } = await db
        .from("record_growth_peer_feedback")
        .select("post_id")
        .eq("id", data.feedbackId)
        .maybeSingle();
      if (!fb) throw new Error("피드백을 찾을 수 없어요.");
      const { data: post } = await db
        .from("posts")
        .select("author")
        .eq("id", (fb as { post_id: string }).post_id)
        .maybeSingle();
      const owner = (post as { author: string } | null)?.author ?? "";
      if (R.normalizeName(owner) !== R.normalizeName(name)) {
        throw new Error("내가 받은 피드백만 분류할 수 있어요.");
      }
    }

    const { error } = await db
      .from("record_growth_peer_feedback")
      .update({ receiver_type: data.receiverType })
      .eq("id", data.feedbackId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** 짝 카드용: 배정된 기록의 01~03 요약 (작성자/관리자 인증). */
export const getGrowthPeerSummaries = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        postId: z.string().uuid(),
        postIds: z.array(z.string().uuid()).max(4),
        author: z.string().trim().max(100).default(""),
        nicknamePassword: z.string().trim().max(100).default(""),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(
    async ({
      data,
    }): Promise<
      {
        postId: string;
        postNo: number;
        author: string;
        projectName: string;
        oneLine: string;
        resultUrl: string;
        features: string[];
        flow: string[];
      }[]
    > => {
      const R = await import("./record.server");
      const db = await R.getRecordDb();

      if (!R.isAdminPassword(data.adminPassword)) {
        const name = await R.ensureNickname(db, data.author, data.nicknamePassword);
        const { data: post } = await db
          .from("posts")
          .select("author")
          .eq("id", data.postId)
          .maybeSingle();
        const owner = (post as { author: string } | null)?.author ?? "";
        if (R.normalizeName(owner) !== R.normalizeName(name)) {
          throw new Error("이 활동기록은 작성자 본인만 볼 수 있어요.");
        }
      }

      const { data: posts } = await db
        .from("posts")
        .select("id, post_no, author")
        .in("id", data.postIds);
      const { data: rows } = await db
        .from("record_growth")
        .select("post_id, project_name, one_line, result_url, features, flow")
        .in("post_id", data.postIds);
      const byId = new Map<string, GrowthRow>(
        ((rows ?? []) as GrowthRow[]).map((r) => [String(r["post_id"]), r]),
      );
      return ((posts ?? []) as GrowthPostRef[]).map((p) => {
        const row = byId.get(p.id) ?? {};
        const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);
        return {
          postId: p.id,
          postNo: p.post_no ?? 0,
          author: p.author,
          projectName: typeof row["project_name"] === "string" ? row["project_name"] : "",
          oneLine: typeof row["one_line"] === "string" ? row["one_line"] : "",
          resultUrl: typeof row["result_url"] === "string" ? row["result_url"] : "",
          features: arr(row["features"]),
          flow: arr(row["flow"]),
        };
      });
    },
  );

export { GROWTH_EMPTY };
