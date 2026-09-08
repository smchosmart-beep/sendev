// 나눔(온라인 갤러리 워크) — 성장형 활동기록 전용 서버 기능.
// 모든 조회/저장은 기존 닉네임 비밀번호(ensureNickname) 또는 관리자 비밀번호를 통과해야 하며,
// 기록 상세는 같은 게시판(성장형) 참가자에게만 내려보낸다.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { GROWTH_PROBLEM_AREAS } from "./record-growth-schema";

type Db = Awaited<ReturnType<typeof getDb>>;

async function getDb() {
  const R = await import("./record.server");
  return R.getRecordDb();
}

const authInput = {
  author: z.string().trim().max(100).default(""),
  nicknamePassword: z.string().trim().max(100).default(""),
  adminPassword: z.string().max(200).default(""),
};

interface Session {
  name: string;
  isAdmin: boolean;
  myPostId: string | null;
  voterKey: string;
}

/** 게시판이 성장형인지 확인하고, 요청자를 참가자(또는 관리자)로 인증한다. */
async function ensureParticipant(
  db: Db,
  categoryId: string,
  input: { author: string; nicknamePassword: string; adminPassword: string },
): Promise<{ session: Session; galleryOpen: boolean }> {
  const R = await import("./record.server");
  const { data: category } = await db
    .from("categories")
    .select("id, record_kind, enable_record, gallery_open")
    .eq("id", categoryId)
    .maybeSingle();
  if (!category || category.record_kind !== "growth") {
    throw new Error("성장형 활동기록 게시판에서만 나눔을 사용할 수 있어요.");
  }

  const isAdmin = R.isAdminPassword(input.adminPassword);
  const name = isAdmin
    ? (input.author ?? "").trim() || "관리자"
    : await R.ensureNickname(db, input.author, input.nicknamePassword);
  const key = R.normalizeName(name);

  const { data: posts } = await db
    .from("posts")
    .select("id, author")
    .eq("category_id", categoryId)
    .eq("type", "record");
  const mine = ((posts ?? []) as { id: string; author: string }[]).find(
    (p) => R.normalizeName(p.author) === key,
  );

  return {
    session: { name, isAdmin, myPostId: mine?.id ?? null, voterKey: key },
    galleryOpen: category.gallery_open === true,
  };
}

async function requireAdmin(adminPassword: string) {
  const R = await import("./record.server");
  if (!R.isAdminPassword(adminPassword)) throw new Error("권한이 없습니다.");
}

type PostRow = { id: string; post_no: number | null; author: string };
type GrowthRow = Record<string, unknown>;

const str = (v: unknown) => (typeof v === "string" ? v : "");
const arr = (v: unknown) => (Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : "")) : []);

async function loadParticipants(db: Db, categoryId: string) {
  const { data: posts } = await db
    .from("posts")
    .select("id, post_no, author")
    .eq("category_id", categoryId)
    .eq("type", "record")
    .order("post_no", { ascending: true });
  const list = (posts ?? []) as PostRow[];
  const ids = list.map((p) => p.id);
  const rowsRes = ids.length
    ? await db
        .from("record_growth")
        .select("post_id, project_name, one_line, result_url, problem_area")
        .in("post_id", ids)
    : { data: [] };
  const byId = new Map<string, GrowthRow>(
    ((rowsRes.data ?? []) as GrowthRow[]).map((r) => [String(r["post_id"]), r]),
  );
  return list.map((p) => {
    const g = byId.get(p.id) ?? {};
    return {
      postId: p.id,
      postNo: p.post_no ?? 0,
      author: p.author,
      projectName: str(g["project_name"]),
      oneLine: str(g["one_line"]),
      resultUrl: str(g["result_url"]),
      area: str(g["problem_area"]),
    };
  });
}

export interface GalleryMemberDTO {
  postId: string;
  postNo: number;
  author: string;
  projectName: string;
  oneLine: string;
  resultUrl: string;
  area: string;
}

export interface GalleryGroupDTO {
  id: string;
  number: number;
  area: string;
  members: GalleryMemberDTO[];
}

export interface GalleryOverviewDTO {
  categoryId: string;
  open: boolean;
  isAdmin: boolean;
  myPostId: string | null;
  myGroupNumber: number | null;
  totalCount: number;
  groupCount: number;
  groups: GalleryGroupDTO[];
  /** 내가 이미 제출한 평가 대상 postId 목록 */
  myDonePostIds: string[];
  stageAggregated: boolean;
}

export const getGalleryOverview = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ categoryId: z.string().uuid(), ...authInput }).parse(input),
  )
  .handler(async ({ data }): Promise<GalleryOverviewDTO> => {
    const db = await getDb();
    const { session, galleryOpen } = await ensureParticipant(db, data.categoryId, data);

    const participants = await loadParticipants(db, data.categoryId);
    const byPost = new Map(participants.map((p) => [p.postId, p]));

    const { data: groups } = await db
      .from("record_growth_group")
      .select("id, number, area")
      .eq("category_id", data.categoryId)
      .order("number", { ascending: true });
    const groupList = (groups ?? []) as { id: string; number: number; area: string }[];
    const groupIds = groupList.map((g) => g.id);
    const membersRes = groupIds.length
      ? await db
          .from("record_growth_group_member")
          .select("group_id, post_id")
          .in("group_id", groupIds)
      : { data: [] };
    const members = (membersRes.data ?? []) as { group_id: string; post_id: string }[];

    const groupsDto: GalleryGroupDTO[] = groupList.map((g) => ({
      id: g.id,
      number: g.number,
      area: g.area ?? "",
      members: members
        .filter((m) => m.group_id === g.id)
        .map((m) => byPost.get(m.post_id))
        .filter((m): m is GalleryMemberDTO => !!m),
    }));

    const myGroup = session.myPostId
      ? groupsDto.find((g) => g.members.some((m) => m.postId === session.myPostId))
      : undefined;

    let myDonePostIds: string[] = [];
    if (session.myPostId) {
      const { data: evals } = await db
        .from("record_growth_evaluation")
        .select("post_id, submitted")
        .eq("from_post_id", session.myPostId)
        .eq("submitted", true);
      myDonePostIds = ((evals ?? []) as { post_id: string }[]).map((e) => e.post_id);
    }

    const { data: stages } = await db
      .from("record_growth_stage")
      .select("id")
      .eq("category_id", data.categoryId)
      .limit(1);

    return {
      categoryId: data.categoryId,
      open: galleryOpen,
      isAdmin: session.isAdmin,
      myPostId: session.myPostId,
      myGroupNumber: myGroup?.number ?? null,
      totalCount: participants.length,
      groupCount: groupsDto.length,
      groups: groupsDto,
      myDonePostIds,
      stageAggregated: (stages ?? []).length > 0,
    };
  });

/* ------------------------------ 기록 상세 ------------------------------ */

export interface GalleryRecordDTO {
  postId: string;
  author: string;
  projectName: string;
  oneLine: string;
  problemText: string;
  evidence: string;
  features: string[];
  flow: string[];
  resultUrl: string;
  fixes: { label: string; what: string; how: string; skipped: string }[];
  learned: string;
  nextPlan: string;
  myEvaluation: {
    problem: number;
    effect: number;
    accuracy: number;
    notVisited: boolean;
    takeaway: string;
    submitted: boolean;
  } | null;
}

export const getGalleryRecord = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ categoryId: z.string().uuid(), postId: z.string().uuid(), ...authInput })
      .parse(input),
  )
  .handler(async ({ data }): Promise<GalleryRecordDTO | null> => {
    const db = await getDb();
    const { session } = await ensureParticipant(db, data.categoryId, data);
    if (!session.isAdmin && !session.myPostId) {
      throw new Error("이 게시판에 성장형 기록을 쓴 참가자만 볼 수 있어요.");
    }

    const { data: post } = await db
      .from("posts")
      .select("id, author, category_id, type")
      .eq("id", data.postId)
      .maybeSingle();
    if (!post || post.category_id !== data.categoryId || post.type !== "record") return null;

    const { data: row } = await db
      .from("record_growth")
      .select("*")
      .eq("post_id", data.postId)
      .maybeSingle();
    const g = (row ?? {}) as GrowthRow;

    const review = (g["review"] ?? {}) as Record<string, any>;
    const fixOf = (label: string, key: string) => {
      const f = (review?.[key]?.fix ?? {}) as Record<string, unknown>;
      return {
        label,
        what: str(f["what"]),
        how: str(f["how"]),
        skipped: str(f["skipped"]),
      };
    };

    let myEvaluation: GalleryRecordDTO["myEvaluation"] = null;
    if (session.myPostId) {
      const { data: ev } = await db
        .from("record_growth_evaluation")
        .select("problem, effect, accuracy, not_visited, takeaway, submitted")
        .eq("post_id", data.postId)
        .eq("from_post_id", session.myPostId)
        .maybeSingle();
      if (ev) {
        myEvaluation = {
          problem: Number(ev.problem ?? 0),
          effect: Number(ev.effect ?? 0),
          accuracy: Number(ev.accuracy ?? 0),
          notVisited: ev.not_visited === true,
          takeaway: str(ev.takeaway),
          submitted: ev.submitted === true,
        };
      }
    }

    return {
      postId: post.id,
      author: post.author,
      projectName: str(g["project_name"]),
      oneLine: str(g["one_line"]),
      problemText: str(g["problem_text"]),
      evidence: str(g["evidence"]),
      features: arr(g["features"]),
      flow: arr(g["flow"]),
      resultUrl: str(g["result_url"]),
      fixes: [fixOf("자기 점검", "self"), fixOf("AI 점검", "ai"), fixOf("동료 점검", "peer")],
      learned: str(g["learned"]),
      nextPlan: str(g["next_plan"]),
      myEvaluation,
    };
  });

/* ------------------------------ 평가 제출 ------------------------------ */

export const submitGalleryEvaluation = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        categoryId: z.string().uuid(),
        postId: z.string().uuid(),
        problem: z.number().int().min(1).max(4),
        effect: z.number().int().min(1).max(4),
        accuracy: z.number().int().min(0).max(4),
        notVisited: z.boolean().default(false),
        takeaway: z.string().max(40).default(""),
        ...authInput,
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const db = await getDb();
    const { session, galleryOpen } = await ensureParticipant(db, data.categoryId, data);
    if (!galleryOpen && !session.isAdmin) throw new Error("아직 나눔이 열리지 않았어요.");
    if (!session.myPostId) throw new Error("성장형 기록을 쓴 참가자만 평가할 수 있어요.");
    if (session.myPostId === data.postId) throw new Error("나의 기록은 평가할 수 없어요.");
    if (!data.notVisited && data.accuracy < 1) {
      throw new Error("동작의 정확성 점수를 골라 주세요.");
    }

    // 같은 모둠인지 확인
    const { data: rows } = await db
      .from("record_growth_group_member")
      .select("group_id, post_id")
      .in("post_id", [session.myPostId, data.postId]);
    const list = (rows ?? []) as { group_id: string; post_id: string }[];
    const mineGroup = list.find((r) => r.post_id === session.myPostId)?.group_id;
    const targetGroup = list.find((r) => r.post_id === data.postId)?.group_id;
    if (!mineGroup || mineGroup !== targetGroup) {
      throw new Error("같은 모둠의 기록만 평가할 수 있어요.");
    }

    const { error } = await db.from("record_growth_evaluation").upsert(
      {
        post_id: data.postId,
        from_post_id: session.myPostId,
        problem: data.problem,
        effect: data.effect,
        accuracy: data.notVisited ? 0 : data.accuracy,
        not_visited: data.notVisited,
        takeaway: data.takeaway.trim(),
        submitted: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "post_id,from_post_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------------------- 우리 모둠 결과 ---------------------------- */

export interface GalleryScoreDTO {
  postId: string;
  author: string;
  projectName: string;
  problem: number;
  effect: number;
  accuracy: number;
  total: number;
  count: number;
}

export interface GroupResultDTO {
  groupNumber: number | null;
  scores: GalleryScoreDTO[];
  myQuotes: { evaluationId: string; takeaway: string }[];
  pickedIds: string[];
  submittedCount: number;
  memberCount: number;
}

function averageScores(
  evals: {
    post_id: string;
    problem: number;
    effect: number;
    accuracy: number;
    not_visited: boolean;
  }[],
  postId: string,
) {
  const mine = evals.filter((e) => e.post_id === postId);
  if (mine.length === 0) {
    return { problem: 0, effect: 0, accuracy: 0, total: 0, count: 0 };
  }
  const avg = (nums: number[]) =>
    nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  const problem = avg(mine.map((e) => Number(e.problem ?? 0)));
  const effect = avg(mine.map((e) => Number(e.effect ?? 0)));
  const accuracy = avg(
    mine.filter((e) => !e.not_visited).map((e) => Number(e.accuracy ?? 0)),
  );
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    problem: round(problem),
    effect: round(effect),
    accuracy: round(accuracy),
    total: round(problem + effect + accuracy),
    count: mine.length,
  };
}

export const getGroupResult = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ categoryId: z.string().uuid(), ...authInput }).parse(input),
  )
  .handler(async ({ data }): Promise<GroupResultDTO> => {
    const db = await getDb();
    const { session } = await ensureParticipant(db, data.categoryId, data);
    if (!session.myPostId) {
      return {
        groupNumber: null,
        scores: [],
        myQuotes: [],
        pickedIds: [],
        submittedCount: 0,
        memberCount: 0,
      };
    }

    const { data: mineRow } = await db
      .from("record_growth_group_member")
      .select("group_id")
      .eq("post_id", session.myPostId)
      .maybeSingle();
    if (!mineRow) {
      return {
        groupNumber: null,
        scores: [],
        myQuotes: [],
        pickedIds: [],
        submittedCount: 0,
        memberCount: 0,
      };
    }
    const groupId = (mineRow as { group_id: string }).group_id;

    const { data: group } = await db
      .from("record_growth_group")
      .select("number")
      .eq("id", groupId)
      .maybeSingle();
    const { data: memberRows } = await db
      .from("record_growth_group_member")
      .select("post_id")
      .eq("group_id", groupId);
    const memberIds = ((memberRows ?? []) as { post_id: string }[]).map((m) => m.post_id);

    const participants = await loadParticipants(db, data.categoryId);
    const byPost = new Map(participants.map((p) => [p.postId, p]));

    const { data: evalRows } = await db
      .from("record_growth_evaluation")
      .select("id, post_id, from_post_id, problem, effect, accuracy, not_visited, takeaway")
      .in("post_id", memberIds)
      .eq("submitted", true);
    const evals = (evalRows ?? []) as {
      id: string;
      post_id: string;
      from_post_id: string;
      problem: number;
      effect: number;
      accuracy: number;
      not_visited: boolean;
      takeaway: string;
    }[];
    // 재편성으로 모둠이 바뀐 평가는 집계에서 제외
    const inGroup = evals.filter((e) => memberIds.includes(e.from_post_id));

    const scores: GalleryScoreDTO[] = memberIds
      .map((id) => {
        const p = byPost.get(id);
        const s = averageScores(inGroup, id);
        return {
          postId: id,
          author: p?.author ?? "",
          projectName: p?.projectName ?? "",
          ...s,
        };
      })
      .sort((a, b) => b.total - a.total);

    const { data: picks } = await db
      .from("record_growth_quote_pick")
      .select("evaluation_id")
      .eq("post_id", session.myPostId);

    return {
      groupNumber: (group as { number: number } | null)?.number ?? null,
      scores,
      myQuotes: inGroup
        .filter((e) => e.post_id === session.myPostId && (e.takeaway ?? "").trim())
        .map((e) => ({ evaluationId: e.id, takeaway: e.takeaway })),
      pickedIds: ((picks ?? []) as { evaluation_id: string }[]).map((p) => p.evaluation_id),
      submittedCount: new Set(inGroup.map((e) => e.from_post_id)).size,
      memberCount: memberIds.length,
    };
  });

export const pickGalleryQuotes = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        categoryId: z.string().uuid(),
        evaluationIds: z.array(z.string().uuid()).max(2),
        ...authInput,
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const db = await getDb();
    const { session } = await ensureParticipant(db, data.categoryId, data);
    if (!session.myPostId) throw new Error("나의 기록이 있어야 인용을 고를 수 있어요.");

    // 내가 받은 평가만 고를 수 있음
    if (data.evaluationIds.length > 0) {
      const { data: rows } = await db
        .from("record_growth_evaluation")
        .select("id, post_id")
        .in("id", data.evaluationIds);
      const ok = ((rows ?? []) as { id: string; post_id: string }[]).every(
        (r) => r.post_id === session.myPostId,
      );
      if (!ok || (rows ?? []).length !== data.evaluationIds.length) {
        throw new Error("내가 받은 한 줄만 고를 수 있어요.");
      }
    }

    await db.from("record_growth_quote_pick").delete().eq("post_id", session.myPostId);
    if (data.evaluationIds.length > 0) {
      const { error } = await db.from("record_growth_quote_pick").insert(
        data.evaluationIds.map((id) => ({ post_id: session.myPostId, evaluation_id: id })),
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/* ---------------------------- 전체 발표 4인 ---------------------------- */

export interface StageEntryDTO {
  stageId: string;
  postId: string;
  orderNo: number;
  area: string;
  author: string;
  projectName: string;
  oneLine: string;
  resultUrl: string;
  hearts: number;
  hearted: boolean;
  comments: { id: string; author: string; content: string; createdAt: string }[];
}

export const getGalleryStage = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ categoryId: z.string().uuid(), ...authInput }).parse(input),
  )
  .handler(async ({ data }): Promise<StageEntryDTO[]> => {
    const db = await getDb();
    const { session } = await ensureParticipant(db, data.categoryId, data);

    const { data: stages } = await db
      .from("record_growth_stage")
      .select("id, post_id, order_no, area")
      .eq("category_id", data.categoryId)
      .order("order_no", { ascending: true });
    const list = (stages ?? []) as {
      id: string;
      post_id: string;
      order_no: number;
      area: string;
    }[];
    if (list.length === 0) return [];

    const stageIds = list.map((s) => s.id);
    const participants = await loadParticipants(db, data.categoryId);
    const byPost = new Map(participants.map((p) => [p.postId, p]));

    const [{ data: hearts }, { data: comments }] = await Promise.all([
      db.from("record_growth_heart").select("stage_id, voter_key").in("stage_id", stageIds),
      db
        .from("record_growth_stage_comment")
        .select("id, stage_id, author, content, created_at")
        .in("stage_id", stageIds)
        .order("created_at", { ascending: true }),
    ]);
    const heartRows = (hearts ?? []) as { stage_id: string; voter_key: string }[];
    const commentRows = (comments ?? []) as {
      id: string;
      stage_id: string;
      author: string;
      content: string;
      created_at: string;
    }[];

    return list.map((s) => {
      const p = byPost.get(s.post_id);
      return {
        stageId: s.id,
        postId: s.post_id,
        orderNo: s.order_no,
        area: s.area ?? "",
        author: p?.author ?? "",
        projectName: p?.projectName ?? "",
        oneLine: p?.oneLine ?? "",
        resultUrl: p?.resultUrl ?? "",
        hearts: heartRows.filter((h) => h.stage_id === s.id).length,
        hearted: heartRows.some(
          (h) => h.stage_id === s.id && h.voter_key === session.voterKey,
        ),
        comments: commentRows
          .filter((c) => c.stage_id === s.id)
          .map((c) => ({
            id: c.id,
            author: c.author,
            content: c.content,
            createdAt: c.created_at,
          })),
      };
    });
  });

export const sendGalleryHeart = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ categoryId: z.string().uuid(), stageId: z.string().uuid(), ...authInput })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const db = await getDb();
    const { session } = await ensureParticipant(db, data.categoryId, data);
    const { error } = await db
      .from("record_growth_heart")
      .upsert(
        { stage_id: data.stageId, voter_key: session.voterKey },
        { onConflict: "stage_id,voter_key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addGalleryStageComment = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        categoryId: z.string().uuid(),
        stageId: z.string().uuid(),
        content: z.string().trim().min(1).max(80),
        ...authInput,
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const db = await getDb();
    const { session } = await ensureParticipant(db, data.categoryId, data);
    const { error } = await db.from("record_growth_stage_comment").insert({
      stage_id: data.stageId,
      author: session.name,
      content: data.content.slice(0, 80),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------- 관리자 ------------------------------- */

export const setGalleryOpen = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        categoryId: z.string().uuid(),
        open: z.boolean(),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await requireAdmin(data.adminPassword);
    const db = await getDb();
    const { error } = await db
      .from("categories")
      .update({ gallery_open: data.open })
      .eq("id", data.categoryId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** 문제 영역 기준으로 6명 내외 모둠 자동 편성. 기존 평가는 지우지 않는다. */
export const assignGalleryGroups = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        categoryId: z.string().uuid(),
        size: z.number().int().min(2).max(10).default(6),
        adminPassword: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true; groupCount: number }> => {
    await requireAdmin(data.adminPassword);
    const db = await getDb();
    const { data: category } = await db
      .from("categories")
      .select("id, record_kind")
      .eq("id", data.categoryId)
      .maybeSingle();
    if (!category || category.record_kind !== "growth") {
      throw new Error("성장형 게시판만 편성할 수 있어요.");
    }

    const participants = await loadParticipants(db, data.categoryId);
    if (participants.length === 0) throw new Error("편성할 기록이 없어요.");

    // 문제 영역을 번갈아 배치해 모둠마다 영역이 고르게 섞이도록 한다.
    const buckets = GROWTH_PROBLEM_AREAS.map((a) =>
      participants.filter((p) => p.area === a),
    );
    buckets.push(participants.filter((p) => !GROWTH_PROBLEM_AREAS.includes(p.area)));
    const ordered: typeof participants = [];
    let added = true;
    while (added) {
      added = false;
      for (const b of buckets) {
        const next = b.shift();
        if (next) {
          ordered.push(next);
          added = true;
        }
      }
    }

    const groupCount = Math.max(1, Math.ceil(ordered.length / data.size));
    const chunks: (typeof ordered)[] = Array.from({ length: groupCount }, () => []);
    ordered.forEach((p, i) => chunks[i % groupCount]!.push(p));

    // 기존 모둠만 갈아끼운다(평가·인용은 보존).
    const { data: oldGroups } = await db
      .from("record_growth_group")
      .select("id")
      .eq("category_id", data.categoryId);
    const oldIds = ((oldGroups ?? []) as { id: string }[]).map((g) => g.id);
    if (oldIds.length > 0) {
      await db.from("record_growth_group_member").delete().in("group_id", oldIds);
      await db.from("record_growth_group").delete().in("id", oldIds);
    }

    for (let i = 0; i < chunks.length; i++) {
      const members = chunks[i]!;
      const { data: created, error } = await db
        .from("record_growth_group")
        .insert({ category_id: data.categoryId, number: i + 1, area: "" })
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      const groupId = (created as { id: string }).id;
      if (members.length > 0) {
        const { error: mErr } = await db
          .from("record_growth_group_member")
          .insert(members.map((m) => ({ group_id: groupId, post_id: m.postId })));
        if (mErr) throw new Error(mErr.message);
      }
    }

    return { ok: true, groupCount: chunks.length };
  });

export const getGalleryAdminStatus = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ categoryId: z.string().uuid(), adminPassword: z.string().max(200).default("") })
      .parse(input),
  )
  .handler(
    async ({
      data,
    }): Promise<{
      open: boolean;
      participantCount: number;
      groups: { number: number; memberCount: number; submittedCount: number }[];
      submittedTotal: number;
      stageCount: number;
    }> => {
      await requireAdmin(data.adminPassword);
      const db = await getDb();
      const { data: category } = await db
        .from("categories")
        .select("gallery_open")
        .eq("id", data.categoryId)
        .maybeSingle();

      const participants = await loadParticipants(db, data.categoryId);
      const { data: groups } = await db
        .from("record_growth_group")
        .select("id, number")
        .eq("category_id", data.categoryId)
        .order("number", { ascending: true });
      const groupList = (groups ?? []) as { id: string; number: number }[];
      const membersRes = groupList.length
        ? await db
            .from("record_growth_group_member")
            .select("group_id, post_id")
            .in("group_id", groupList.map((g) => g.id))
        : { data: [] };
      const members = (membersRes.data ?? []) as { group_id: string; post_id: string }[];

      const postIds = participants.map((p) => p.postId);
      const evalsRes = postIds.length
        ? await db
            .from("record_growth_evaluation")
            .select("post_id, from_post_id")
            .in("post_id", postIds)
            .eq("submitted", true)
        : { data: [] };
      const evals = (evalsRes.data ?? []) as { post_id: string; from_post_id: string }[];

      const { data: stages } = await db
        .from("record_growth_stage")
        .select("id")
        .eq("category_id", data.categoryId);

      return {
        open: category?.gallery_open === true,
        participantCount: participants.length,
        groups: groupList.map((g) => {
          const ids = members.filter((m) => m.group_id === g.id).map((m) => m.post_id);
          return {
            number: g.number,
            memberCount: ids.length,
            submittedCount: new Set(
              evals.filter((e) => ids.includes(e.from_post_id)).map((e) => e.from_post_id),
            ).size,
          };
        }),
        submittedTotal: evals.length,
        stageCount: (stages ?? []).length,
      };
    },
  );

/** 모둠 1위 → 문제 영역별 상대점수 1위 1명씩 총 4명 확정. */
export const aggregateGalleryStage = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ categoryId: z.string().uuid(), adminPassword: z.string().max(200).default("") })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true; count: number }> => {
    await requireAdmin(data.adminPassword);
    const db = await getDb();

    const participants = await loadParticipants(db, data.categoryId);
    const byPost = new Map(participants.map((p) => [p.postId, p]));

    const { data: groups } = await db
      .from("record_growth_group")
      .select("id, number")
      .eq("category_id", data.categoryId)
      .order("number", { ascending: true });
    const groupList = (groups ?? []) as { id: string; number: number }[];
    if (groupList.length === 0) throw new Error("먼저 모둠을 편성해 주세요.");

    const { data: memberRows } = await db
      .from("record_growth_group_member")
      .select("group_id, post_id")
      .in("group_id", groupList.map((g) => g.id));
    const members = (memberRows ?? []) as { group_id: string; post_id: string }[];

    const allIds = members.map((m) => m.post_id);
    const evalsRes = allIds.length
      ? await db
          .from("record_growth_evaluation")
          .select("post_id, from_post_id, problem, effect, accuracy, not_visited")
          .in("post_id", allIds)
          .eq("submitted", true)
      : { data: [] };
    const evals = (evalsRes.data ?? []) as {
      post_id: string;
      from_post_id: string;
      problem: number;
      effect: number;
      accuracy: number;
      not_visited: boolean;
    }[];

    type Winner = { postId: string; relative: number; area: string };
    const winners: Winner[] = [];
    for (const g of groupList) {
      const ids = members.filter((m) => m.group_id === g.id).map((m) => m.post_id);
      if (ids.length === 0) continue;
      const scoped = evals.filter((e) => ids.includes(e.from_post_id));
      const totals = ids.map((id) => ({ id, total: averageScores(scoped, id).total }));
      const groupAvg =
        totals.reduce((a, b) => a + b.total, 0) / (totals.length || 1) || 0;
      const top = totals.slice().sort((a, b) => b.total - a.total)[0];
      if (!top || top.total <= 0) continue;
      winners.push({
        postId: top.id,
        relative: groupAvg > 0 ? top.total / groupAvg : 0,
        area: byPost.get(top.id)?.area ?? "",
      });
    }

    const chosen: Winner[] = [];
    for (const area of GROWTH_PROBLEM_AREAS) {
      const best = winners
        .filter((w) => w.area === area)
        .sort((a, b) => b.relative - a.relative)[0];
      if (best) chosen.push(best);
    }
    if (chosen.length === 0) throw new Error("아직 집계할 평가가 없어요.");

    await db.from("record_growth_stage").delete().eq("category_id", data.categoryId);
    const { error } = await db.from("record_growth_stage").insert(
      chosen.map((c, i) => ({
        category_id: data.categoryId,
        post_id: c.postId,
        order_no: i + 1,
        area: c.area,
      })),
    );
    if (error) throw new Error(error.message);
    return { ok: true, count: chosen.length };
  });

export const resetGalleryStage = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ categoryId: z.string().uuid(), adminPassword: z.string().max(200).default("") })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await requireAdmin(data.adminPassword);
    const db = await getDb();
    await db.from("record_growth_stage").delete().eq("category_id", data.categoryId);
    return { ok: true };
  });

/** 07 성장 사례집에 익명 인용으로 실을, 내가 고른 "내가 가져갈 한 줄" 2개. */
export const getMyGalleryQuotes = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ categoryId: z.string().uuid(), ...authInput }).parse(input),
  )
  .handler(async ({ data }): Promise<string[]> => {
    const db = await getDb();
    const { session } = await ensureParticipant(db, data.categoryId, data);
    if (!session.myPostId) return [];
    const { data: picks } = await db
      .from("record_growth_quote_pick")
      .select("evaluation_id")
      .eq("post_id", session.myPostId);
    const ids = ((picks ?? []) as { evaluation_id: string }[]).map((p) => p.evaluation_id);
    if (ids.length === 0) return [];
    const { data: rows } = await db
      .from("record_growth_evaluation")
      .select("takeaway")
      .in("id", ids);
    return ((rows ?? []) as { takeaway: string }[])
      .map((r) => (r.takeaway ?? "").trim())
      .filter(Boolean);
  });
