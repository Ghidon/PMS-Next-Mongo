"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Save, X, Trash2 } from "lucide-react";
import CreateSubtaskModal from "@/app/components/tasks/CreateSubtaskModal";
import { updateTaskDetailsAction, deleteSubTaskAction } from "./actions";
import type { SafeProject, SafeSubTask, SafeTask, SafeUser } from "./page";

/* ----------------------------- Utility types ----------------------------- */

type DisplayStatus = "todo" | "in_progress" | "blocked" | "done";
type PriorityLevel = "Low" | "Medium" | "High";

interface TaskDetailClientProps {
  task: SafeTask;
  project: SafeProject;
  members: SafeUser[];
  subtasks: SafeSubTask[];
}

/* ---------------------------- Helper functions --------------------------- */

function normalizeStatusForDisplay(raw?: string | null): DisplayStatus {
  const s = (raw ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (s === "done") return "done";
  if (["blocked", "block", "stuck"].includes(s)) return "blocked";
  if (["inprogress", "progress", "doing", "wip"].includes(s))
    return "in_progress";
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

function priorityBadgeClass(value: string): string {
  return (
    {
      Low: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
      Medium: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
      High: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    }[value] ?? "bg-gray-50 text-gray-700 ring-1 ring-gray-200"
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

function formatDateISOInput(d?: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function normalizePriorityForDisplay(raw?: string | null): PriorityLevel {
  const v = (raw ?? "").toString().trim().toLowerCase();
  if (v === "high") return "High";
  if (v === "low") return "Low";
  return "Medium";
}

/* ---------------------------- Main component ----------------------------- */

export default function TaskDetailClient({
  task,
  project,
  members,
  subtasks,
}: TaskDetailClientProps) {
  // Local display state (initialized from safe server data)
  const [status, setStatus] = useState<DisplayStatus>(
    normalizeStatusForDisplay(task.status)
  );
  const [dueDate, setDueDate] = useState<string>(
    task.dueDate ? formatDateISOInput(task.dueDate) : ""
  );
  const [assigned, setAssigned] = useState<string>(task.assigned || "");
  const [priority, setPriority] = useState<PriorityLevel>(
    normalizePriorityForDisplay(task.priority)
  );

  // Subtasks state (so we can append newly created items instantly)
  const [subtaskList, setSubtaskList] = useState<SafeSubTask[]>(subtasks);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [subtasksMsg, setSubtasksMsg] = useState<string | null>(null);

  const memberOptions = useMemo(
    () =>
      members
        .map((u) => ({
          value: (u.email ?? "").toLowerCase(),
          label: u.name ? `${u.name} (${u.email})` : u.email ?? "",
        }))
        .filter((o) => o.value.length > 0),
    [members]
  );

  const statusText = statusLabel(status);

  // Save handlers
  const onCancel = () => {
    setIsEditing(false);
    setErrorMsg(null);
  };

  const onSave = (form: HTMLFormElement) => {
    const fd = new FormData(form);

    // Optimistic local update
    const newStatus = normalizeStatusForDisplay(
      String(fd.get("status") ?? status)
    );
    const newDue = String(fd.get("dueDate") ?? dueDate);
    const newAssigned = String(fd.get("assigned") ?? assigned);
    const newPriority = normalizePriorityForDisplay(
      String(fd.get("priority") ?? priority)
    );

    setStatus(newStatus);
    setDueDate(newDue);
    setAssigned(newAssigned);
    setPriority(newPriority);
    setErrorMsg(null);

    startTransition(async () => {
      const res = await updateTaskDetailsAction(String(task._id), fd);

      if (!res.ok) {
        // Revert on failure
        setStatus(normalizeStatusForDisplay(task.status));
        setDueDate(task.dueDate ? formatDateISOInput(task.dueDate) : "");
        setAssigned(task.assigned || "");
        setPriority(normalizePriorityForDisplay(task.priority));
        setErrorMsg(res.error);
        return;
      }

      // Reconcile with server values
      setStatus(
        res.updated.status
          ? normalizeStatusForDisplay(res.updated.status)
          : newStatus
      );
      setDueDate(res.updated.dueDate ?? newDue);
      setAssigned(
        typeof res.updated.assigned === "string"
          ? res.updated.assigned
          : newAssigned
      );
      setPriority(
        res.updated.priority
          ? normalizePriorityForDisplay(res.updated.priority)
          : newPriority
      );

      setIsEditing(false);
    });
  };
  const onDeleteSubtask = (s: SafeSubTask) => {
    const sStatus = normalizeStatusForDisplay(s.status);
    if (sStatus !== "done") {
      setSubtasksMsg("Subtasks can be deleted only if their status is Done");
      return;
    }

    setSubtasksMsg(null);
    startTransition(async () => {
      const res = await deleteSubTaskAction(String(s._id));
      if (res.ok) {
        setSubtaskList((prev) => prev.filter((x) => x._id !== s._id));
      } else {
        setSubtasksMsg(res.error);
      }
    });
  };

  return (
    <main className="container mx-auto max-w-6xl px-6 lg:px-8 py-8 text-gray-900 space-y-8">
      {/* Breadcrumb */}
      <div className="mb-0 flex items-center gap-2 text-sm">
        <Link
          className="underline"
          href={`/projects/${task.projectId}?tab=tasks`}
        >
          Project
        </Link>
        <span className="opacity-50">/</span>
        <span className="font-medium">Task</span>
      </div>

      {/* HEADER */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        {/* Title & Description */}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {task.title || task.name || "Untitled Task"}
          </h1>
          {task.description && (
            <p className="mt-1 text-sm text-gray-600">{task.description}</p>
          )}
        </div>

        {/* Meta Row */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <Link
            href={`/projects/${project._id}`}
            className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-1 font-medium ring-1 ring-gray-200 underline"
            title="Open project"
          >
            Project: {project.title || project.name || "Untitled"}
          </Link>

          <span
            className={classNames(
              "inline-flex items-center rounded-full px-2.5 py-1 font-medium text-xs",
              statusBadgeClass(status)
            )}
          >
            Status: {statusText}
          </span>

          <span
            className={classNames(
              "inline-flex items-center rounded-full px-2.5 py-1 font-medium text-xs",
              priorityBadgeClass(priority)
            )}
          >
            Priority: {priority}
          </span>

          <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-1 font-medium ring-1 ring-gray-200">
            Due: {dueDate ? formatDateShort(dueDate) : "No due date"}
          </span>

          <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-1 font-medium ring-1 ring-gray-200">
            Created: {formatDateShort(task.createdAt)}
          </span>
          <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-1 font-medium ring-1 ring-gray-200">
            Updated: {formatDateShort(task.updatedAt)}
          </span>
        </div>

        {/* Edit icon (hidden when panel is open) */}
        {!isEditing && (
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
              aria-label="Open edit panel"
              title="Edit task"
            >
              <Pencil size={16} />
              Edit
            </button>
          </div>
        )}

        {/* Collapsible Edit Panel */}
        <AnimatePresence initial={false}>
          {isEditing && (
            <motion.div
              key="edit-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSave(e.currentTarget);
                }}
                className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto] rounded-xl border bg-gray-50/50 p-4"
              >
                {/* Status */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium">Status</label>
                  <select
                    name="status"
                    defaultValue={status}
                    className="h-9 w-48 rounded-md border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    aria-label="Status"
                  >
                    <option value="todo">To do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                {/* Due date */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium">Due date</label>
                  <input
                    type="date"
                    name="dueDate"
                    defaultValue={dueDate}
                    className="h-9 w-44 rounded-md border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    aria-label="Due date"
                  />
                </div>

                {/* Assigned */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium">Assigned to</label>
                  <select
                    name="assigned"
                    defaultValue={assigned}
                    className="h-9 w-64 rounded-md border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    aria-label="Assigned to"
                  >
                    <option value="">Unassigned</option>
                    {memberOptions.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium">Priority</label>
                  <select
                    name="priority"
                    defaultValue={priority}
                    className="h-9 w-36 rounded-md border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    aria-label="Priority"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                {/* Actions: Save & Cancel icons */}
                <div className="flex items-end justify-end gap-2">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium hover:bg-gray-100"
                    aria-label="Cancel"
                    title="Cancel"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
                    aria-label="Save"
                    title="Save"
                  >
                    <Save size={16} />
                    {isPending ? "Saving..." : "Save"}
                  </button>
                </div>

                {errorMsg && (
                  <div className="md:col-span-5 text-sm text-rose-700">
                    {errorMsg}
                  </div>
                )}
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* SUBTASKS */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Subtasks</h2>
          <CreateSubtaskModal
            taskId={task._id}
            onCreated={(created) => {
              // Prepend new subtask (or push, your choice)
              setSubtaskList((prev) => [created, ...prev]);
            }}
          />
        </div>
        {subtasksMsg && (
          <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <span>{subtasksMsg}</span>
            <button
              type="button"
              onClick={() => setSubtasksMsg(null)}
              className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-rose-100"
              aria-label="Dismiss"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <ul className="space-y-3">
          {subtaskList.map((s) => {
            const sStatus = normalizeStatusForDisplay(s.status);
            const sDue = formatDateShort(s.dueDate);
            const sAssigned =
              s.assigned && s.assigned.trim().length > 0
                ? s.assigned
                : "Unassigned";

            return (
              <li
                key={s._id}
                className="flex justify-between gap-3 rounded-xl border px-4 py-4 relative"
              >
                {/* LEFT: title + description + meta */}
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/subtasks/${s._id}`}
                    className="underline break-words text-base font-medium"
                  >
                    {s.title || s.name || "(no title)"}
                  </Link>

                  {s.description && s.description.trim().length > 0 && (
                    <p className="mt-1 text-sm text-gray-700 break-words">
                      {s.description}
                    </p>
                  )}

                  <div className="mt-1 text-sm text-gray-600">
                    {sAssigned} · {sDue}
                  </div>
                </div>

                {/* RIGHT: column with status (top) and trash (bottom) */}
                <div className="relative flex flex-col justify-between items-end h-full min-h-[80px]">
                  {/* Status top-right */}
                  <span
                    className={classNames(
                      "rounded-full px-2.5 py-1 text-xs font-medium ring-1",
                      statusBadgeClass(sStatus)
                    )}
                  >
                    {statusLabel(sStatus)}
                  </span>

                  {/* Trash bottom-right */}
                  <button
                    type="button"
                    onClick={() => onDeleteSubtask(s)}
                    className={classNames(
                      "absolute bottom-0 right-0 inline-flex items-center justify-center rounded-full border px-2 py-1 hover:bg-gray-50",
                      sStatus !== "done" && "opacity-50 cursor-not-allowed"
                    )}
                    title={
                      sStatus === "done"
                        ? "Delete subtask"
                        : "Subtasks can be deleted only if their status is Done"
                    }
                    aria-label="Delete subtask"
                    aria-disabled={sStatus !== "done"}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {subtaskList.length === 0 && (
          <p className="mt-2 text-sm text-gray-600">No subtasks yet.</p>
        )}
      </section>
    </main>
  );
}
