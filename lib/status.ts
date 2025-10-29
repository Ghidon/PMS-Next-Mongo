// lib/status.ts
export type CanonicalStatus = "todo" | "in_progress" | "blocked" | "done";

export const OPEN_STATUSES: ReadonlyArray<CanonicalStatus> = [
  "todo",
  "in_progress",
  "blocked",
] as const;

export function normalizeStatus(raw?: string | null): CanonicalStatus {
  const s = (raw ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (s === "done") return "done";
  if (s === "blocked" || s === "stuck" || s === "block") return "blocked";
  if (s === "inprogress" || s === "progress" || s === "doing" || s === "wip")
    return "in_progress";
  // everything else (open/toassign/todo/backlog/empty) → todo
  return "todo";
}

export function isOpenStatus(s: string | null | undefined): boolean {
  return OPEN_STATUSES.includes(normalizeStatus(s));
}

/** Convert a UI filter value → list of statuses for DB querying. */
export function resolveStatusFilter(
  value?: string | null
): CanonicalStatus[] | undefined {
  const v = (value ?? "").toLowerCase();
  if (!v || v === "open") return [...OPEN_STATUSES];
  if (v === "done") return ["done"];
  if (v === "todo") return ["todo"];
  if (v === "in_progress" || v === "in progress") return ["in_progress"];
  if (v === "blocked" || v === "stuck") return ["blocked"];
  return undefined; // unknown → no status filter
}

/** Label mapping for UI pills/buttons. */
export const STATUS_LABEL: Record<CanonicalStatus, string> = {
  todo: "To do",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
} as const;
