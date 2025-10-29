import React from "react";
import Link from "next/link";
import { formatDate } from "@/lib/format";

export type TaskListItem = {
  _id: string;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  status?: string | null; // Expected: "To Do" | "In Progress" | "Done" | "Blocked" | "Open"
  assigned?: string | null;
  dueDate?: string | Date | null;
};

type LayoutKey = "grouped" | "list";

export default function TaskList({
  tasks,
  heading = "Tasks",
  emptyText = "No tasks yet.",
  layout = "grouped",
}: {
  tasks: TaskListItem[];
  heading?: string;
  emptyText?: string;
  layout?: LayoutKey;
}) {
  if (tasks.length === 0) {
    return (
      <section className="space-y-3">
        <h3 className="text-base font-semibold">{heading}</h3>
        <p className="text-sm text-gray-500">{emptyText}</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold">{heading}</h3>
      {layout === "grouped" ? (
        <GroupedList tasks={tasks} />
      ) : (
        <List tasks={tasks} />
      )}
    </section>
  );
}

/* ------------------- internals ------------------- */

const STATUS_ORDER: string[] = ["To Do", "In Progress", "Blocked", "Done"];

function GroupedList({ tasks }: { tasks: TaskListItem[] }) {
  const groups = new Map<string, TaskListItem[]>();
  for (const t of tasks) {
    const key = normalizeStatus(t.status);
    const arr = groups.get(key) ?? [];
    arr.push(t);
    groups.set(key, arr);
  }
  const ordered = [...groups.entries()].sort(
    (a, b) => STATUS_ORDER.indexOf(a[0]) - STATUS_ORDER.indexOf(b[0])
  );

  return (
    <div className="space-y-4">
      {ordered.map(([status, items]) => (
        <div key={status}>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">
              {status} <span className="ml-1 text-xs text-gray-500">({items.length})</span>
            </div>
          </div>
          <ul className="space-y-2">
            {items.map((t) => (
              <TaskRow key={t._id} task={t} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function List({ tasks }: { tasks: TaskListItem[] }) {
  return (
    <ul className="space-y-2">
      {tasks.map((t) => (
        <TaskRow key={t._id} task={t} />
      ))}
    </ul>
  );
}

function TaskRow({ task }: { task: TaskListItem }) {
  const title = task.title ?? task.name ?? "(no title)";
  const s = normalizeStatus(task.status);
  const dueInfo = dueLabel(task.dueDate);
  const statusClass = statusPillClass(s);
  const dueClass = dueInfo.kind === "overdue" ? "text-red-600" : dueInfo.kind === "soon" ? "text-amber-700" : "text-gray-500";

  return (
    <li className="rounded-xl border p-3 hover:bg-gray-50">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/tasks/${task._id}`} className="underline underline-offset-2">
          {title}
        </Link>
        <span className={["rounded-full px-2 py-0.5 text-xs font-medium", statusClass].join(" ")}>
          {s}
        </span>
      </div>

      {task.description && <p className="mt-1 text-sm text-gray-700">{task.description}</p>}

      <div className="mt-1 flex flex-wrap items-center gap-4 text-xs">
        <span className="text-gray-600">{task.assigned ? `Assigned: ${task.assigned}` : "Unassigned"}</span>
        <span className={dueClass}>{dueInfo.label}</span>
      </div>
    </li>
  );
}

/* ------------------- helpers ------------------- */

function normalizeStatus(s?: string | null): "To Do" | "In Progress" | "Done" | "Blocked" {
  const raw = (s ?? "").trim().toLowerCase();

  if (raw === "done") return "Done";

  if (raw === "in progress" || raw === "in-progress" || raw === "doing" || raw === "wip") {
    return "In Progress";
  }

  // Map "Stuck" to "Blocked"
  if (raw === "blocked" || raw === "blocker" || raw === "stuck") {
    return "Blocked";
  }

  // Treat these as "To Do"
  if (
    raw === "to do" ||
    raw === "to-do" ||
    raw === "todo" ||
    raw === "open" ||
    raw === "to assign" ||
    raw === "to-assign"
  ) {
    return "To Do";
  }

  // Default bucket
  return "To Do";
}



function statusPillClass(s: string): string {
  switch (s) {
    case "Done":
      return "bg-green-100 text-green-800";
    case "In Progress":
      return "bg-blue-100 text-blue-800";
    case "Blocked":
      return "bg-red-100 text-red-800";
    case "To Do":
    default:
      return "bg-gray-100 text-gray-800";
  }
}


function dueLabel(d?: string | Date | null): { label: string; kind: "none" | "soon" | "overdue" } {
  if (!d) return { label: "No due date", kind: "none" };
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return { label: "Invalid due date", kind: "none" };

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  if (diffMs < 0) {
    return { label: `Overdue (${formatDate(date)})`, kind: "overdue" };
  }
  if (days <= 3) {
    return { label: `Due soon (${formatDate(date)})`, kind: "soon" };
  }
  return { label: `Due ${formatDate(date)}`, kind: "none" };
}
