export type BlockStatus = "empty" | "partial" | "done";

export const BLOCK_STATUS_LABEL: Record<BlockStatus, string> = {
  empty: "미작성",
  partial: "작성중",
  done: "작성완료",
};

export type ProgressBlock = {
  id: string;
  no: string;
  title: string;
  status: BlockStatus;
  meta?: string;
};

/** 필드 묶음(입력 칸 기준) 진행도 */
export function fieldBlockStatus(values: (string | undefined | null)[]): {
  status: BlockStatus;
  meta: string;
} {
  const total = values.length;
  const filled = values.filter((v) => (v ?? "").trim().length > 0).length;
  const status: BlockStatus = filled === 0 ? "empty" : filled === total ? "done" : "partial";
  return { status, meta: `${filled}/${total}` };
}

/** 반복 행 섹션 진행도 */
export function rowBlockStatus(count: number): { status: BlockStatus; meta: string } {
  return { status: count > 0 ? "done" : "empty", meta: count > 0 ? `${count}건` : "" };
}

/** 선택형 문항 묶음(예: 태도 점검) 진행도 */
export function answeredBlockStatus(
  answered: number,
  total: number,
): { status: BlockStatus; meta: string } {
  const status: BlockStatus = answered === 0 ? "empty" : answered >= total ? "done" : "partial";
  return { status, meta: `${answered}/${total}` };
}

export function summarize(blocks: ProgressBlock[]) {
  const done = blocks.filter((b) => b.status === "done").length;
  return { done, total: blocks.length };
}
