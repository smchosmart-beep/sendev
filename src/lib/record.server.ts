// Server-only helpers for the 도전형 활동기록 feature.
// Mirrors the security model used by platform.functions.ts: every read/write
// goes through the service-role client inside a server handler, and writers are
// authenticated with their nickname password (or the admin password).
import bcrypt from "bcryptjs";

export type RecordRowKind =
  | "feature"
  | "flow"
  | "limit"
  | "plan"
  | "maker"
  | "process"
  | "devlog"
  | "check";

export const RECORD_ROW_KINDS: RecordRowKind[] = [
  "feature",
  "flow",
  "limit",
  "plan",
  "maker",
  "process",
  "devlog",
  "check",
];

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
