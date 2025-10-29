"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Trash2, X } from "lucide-react";
import { deleteTaskAction } from "@/app/tasks/[id]/actions";

export type TaskListItem = {
  _id: string;
  title: string | null;
  name: string | null;
  description: string | null;
  status: string | null;
  assigned: string | null;
  dueDate: Date | string | null;
};

type Props = {
  projectId: string;
  tasks: TaskListItem[];
  heading?: string;
  layout?: "grouped" | "list";
};

type DisplayStatus = "todo" | "in_progress" | "blocked" | "done";

function normalizeStatusForDisplay(raw?: string | null): DisplayStatus {
  const s = (raw ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (s === "done" || s === "closed") return "done";
  if (["blocked", "stuck"].includes(s)) return "blocked";
  if (["inprogress", "progress", "doing", "wip"].includes(s))
    return "in_progress";
  // treat "open", "toassign" etc. as todo
  return "todo";
}

function statusLabel(s: DisplayStatus): string {
  return (
    {
      todo: "To do",
      in_progress: "In Progress",
      blocked: "Blocked",
      done: "Done",
    }[s] ?? "To do"
  );
}

function statusBadgeClass(value: DisplayStatus): string {
  return (
    {
      todo: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
      in_progress: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
      blocked: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
      done: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    }[value] ?? ""
  );
}

function classNames(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(" ");
}

function formatDateShort(d?: Date | string | null): string {
  if (!d) return "No due date";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export default function TaskListDeletable({
  projectId,
  tasks,
  heading = "Tasks",
}: Props) {
  const [items, setItems] = useState<TaskListItem[]>(tasks);
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const groups = useMemo(() => {
    // keep simple list; if you need grouped later, extend here
    return [{ key: "all", title: heading, items }];
  }, [items, heading]);

  const onDelete = (t: TaskListItem) => {
    const s = normalizeStatusForDisplay(t.status);
    if (s !== "done") {
      setMsg("You cannot delete a Task if the status is not Done");
      return;
    }

    setMsg(null);
    startTransition(async () => {
      const res = await deleteTaskAction(t._id);
      if (res.ok) {
        setItems((prev) => prev.filter((x) => x._id !== t._id));
      } else {
        setMsg(res.error);
      }
    });
  };

  return (
    <div className="space-y-3">
      {msg && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <span>{msg}</span>
          <button
            type="button"
            onClick={() => setMsg(null)}
            className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-rose-100"
            aria-label="Dismiss"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {groups.map((g) => (
        <div key={g.key}>
          {g.title && (
            <h3 className="mb-2 text-base font-semibold">{g.title}</h3>
          )}
          <ul className="space-y-3">
            {g.items.map((t) => {
              const s = normalizeStatusForDisplay(t.status);
              const sAssigned =
                (t.assigned && t.assigned.trim().length > 0
                  ? t.assigned
                  : "Unassigned") ?? "Unassigned";
              const sDue = formatDateShort(t.dueDate);
              const title = t.title || t.name || "(no title)";

              return (
                <li
                  key={t._id}
                  className="flex items-stretch justify-between gap-3 rounded-xl border px-4 py-4"
                >
                  {/* LEFT: title, description, meta */}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/tasks/${t._id}`}
                      className="underline break-words text-base font-medium"
                    >
                      {title}
                    </Link>

                    {t.description && t.description.trim().length > 0 && (
                      <p className="mt-1 text-sm text-gray-700 break-words">
                        {t.description}
                      </p>
                    )}

                    <div className="mt-1 text-sm text-gray-600">
                      {sAssigned} · {sDue}
                    </div>
                  </div>

                  {/* RIGHT: full-height column → status on top, trash pinned bottom-right */}
                  <div className="flex self-stretch flex-col items-end justify-between">
                    {/* Status (top-right) */}
                    <span
                      className={classNames(
                        "rounded-full px-2.5 py-1 text-xs font-medium ring-1",
                        statusBadgeClass(s)
                      )}
                    >
                      {statusLabel(s)}
                    </span>

                    {/* Trash (bottom-right) */}
                    <button
                      type="button"
                      onClick={() => onDelete(t)}
                      className={classNames(
                        "inline-flex items-center justify-center rounded-full border px-2 py-1 hover:bg-gray-50",
                        s === "done"
                          ? "cursor-pointer"
                          : "opacity-50 cursor-not-allowed"
                      )}
                      title={
                        s === "done"
                          ? "Delete task"
                          : "You cannot delete a Task if the status is not Done"
                      }
                      aria-label="Delete task"
                      aria-disabled={s !== "done"}
                      disabled={isPending}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {g.items.length === 0 && (
            <p className="text-sm text-gray-600">No tasks found.</p>
          )}
        </div>
      ))}
    </div>
  );
}
