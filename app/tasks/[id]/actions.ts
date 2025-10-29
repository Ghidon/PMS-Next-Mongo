// app/tasks/[id]/actions.ts
"use server";

import dbConnect from "@/lib/mongoose";
import SubTaskContent, {
  type SubTaskContent as SubTaskDoc,
} from "@/models/SubTaskContent";
import TaskContent, { type TaskContent as TaskDoc } from "@/models/TaskContent";
import ProjectContent, {
  type ProjectContent as ProjectDoc,
} from "@/models/ProjectContent";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

/* ----------------------------- Shared types ----------------------------- */

export type CanonicalStatus = "todo" | "in_progress" | "blocked" | "done";
export type PriorityLevel = "Low" | "Medium" | "High";

export interface SafeSubTask {
  _id: string;
  taskId: string;
  name?: string;
  title?: string;
  description?: string;
  active?: boolean;
  status?: string | null;
  assigned?: string;
  dueDate?: string | null; // ISO
  attachedFiles?: string[];
  allowedUsers?: string[];
  priority?: PriorityLevel | string | undefined;
  createdAt?: string | null; // ISO
  updatedAt?: string | null; // ISO
}

/* ----------------------------- Utilities ----------------------------- */

function toISO(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Safely read a timestamp-like field off a doc even if not in its TS type. */
function getDocDate(
  doc: unknown,
  key: "createdAt" | "updatedAt"
): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyDoc: any = doc;
  return toISO(anyDoc?.[key]);
}

/* ----------------------------- Normalizers ----------------------------- */

function normalizeStatusInput(raw: unknown): CanonicalStatus | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (v === "done") return "done";
  if (v === "blocked" || v === "stuck" || v === "block" || v === "blockedtask")
    return "blocked";
  if (v === "inprogress" || v === "progress" || v === "doing" || v === "wip")
    return "in_progress";
  if (v === "todo" || v === "open" || v === "toassign" || v === "backlog")
    return "todo";
  return "todo";
}

function normalizePriorityInput(raw: unknown): PriorityLevel | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim().toLowerCase();
  if (v === "low") return "Low";
  if (v === "medium" || v === "normal" || v === "default") return "Medium";
  if (v === "high") return "High";
  return undefined;
}

function parseDueDate(input?: string | ""): Date | undefined {
  if (!input) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input))
    return new Date(`${input}T00:00:00.000Z`);
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/* ------------------------------ Validators ------------------------------ */

const UpdateStatusDueSchema = z.object({
  status: z.string().optional(),
  dueDate: z
    .string()
    .datetime({ offset: false })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional()
    .or(z.literal("")),
});

const AssignSchema = z.object({
  assigned: z.string().trim().optional().or(z.literal("")),
  allowedUsers: z.array(z.string().trim()).optional(),
});

const UpdateDetailsSchema = z.object({
  status: z.string().optional(),
  dueDate: z.string().optional().or(z.literal("")),
  assigned: z.string().optional().or(z.literal("")),
  priority: z.string().optional(),
});

const CreateSubTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional().default(""),
});

/* -------------------------- Status & Due (legacy reload) ------------------------- */

export async function updateTaskStatusDueAction(
  taskId: string,
  formData: FormData
) {
  await dbConnect();

  const task = await TaskContent.findById(taskId).lean<TaskDoc | null>();
  if (!task) throw new Error("Task not found");

  const project = await ProjectContent.findById(
    task.projectId
  ).lean<ProjectDoc | null>();
  if (!project) throw new Error("Parent project missing");

  const parsed = UpdateStatusDueSchema.safeParse({
    status: (formData.get("status") as string | null) ?? undefined,
    dueDate: (formData.get("dueDate") as string | null) ?? undefined,
  });
  if (!parsed.success) throw new Error("Invalid input");

  const update: Partial<TaskDoc> = {};

  const normalized = normalizeStatusInput(parsed.data.status);
  if (normalized) update.status = normalized;

  if (parsed.data.dueDate === "") {
    update.dueDate = undefined;
  } else {
    const due = parseDueDate(parsed.data.dueDate as string | undefined);
    if (due) update.dueDate = due;
  }

  await TaskContent.findByIdAndUpdate(taskId, update, {
    new: true,
  }).lean<TaskDoc | null>();

  // Keep legacy behavior for callers that expect a reload
  revalidatePath(`/tasks/${taskId}`);
  redirect(`/tasks/${taskId}`);
}

/* --------------------------- Assignment & Access (legacy reload) -------------------------- */

export async function updateTaskAssignmentAction(
  taskId: string,
  formData: FormData
) {
  await dbConnect();

  const task = await TaskContent.findById(taskId).lean<TaskDoc | null>();
  if (!task) throw new Error("Task not found");

  const project = await ProjectContent.findById(
    task.projectId
  ).lean<ProjectDoc | null>();
  if (!project) throw new Error("Parent project missing");

  const assigned = (formData.get("assigned") as string | null) ?? "";
  const allowedUsersValues = formData.getAll("allowedUsers") as string[];

  const parsed = AssignSchema.safeParse({
    assigned,
    allowedUsers: allowedUsersValues.length > 0 ? allowedUsersValues : [],
  });
  if (!parsed.success) throw new Error("Invalid input");

  const update: Partial<TaskDoc> = {
    assigned: parsed.data.assigned ?? "",
    allowedUsers: parsed.data.allowedUsers ?? [],
  };

  await TaskContent.findByIdAndUpdate(taskId, update, {
    new: true,
  }).lean<TaskDoc | null>();

  // Keep legacy behavior for callers that expect a reload
  revalidatePath(`/tasks/${taskId}`);
  redirect(`/tasks/${taskId}`);
}

/* -------------------- Combined: status + due + assigned + priority (no reload) -------- */

export async function updateTaskDetailsAction(
  taskId: string,
  formData: FormData
): Promise<
  | {
      ok: true;
      updated: {
        status?: CanonicalStatus;
        dueDate?: string; // yyyy-mm-dd
        assigned?: string;
        priority?: PriorityLevel;
      };
    }
  | { ok: false; error: string }
> {
  try {
    await dbConnect();

    const task = await TaskContent.findById(taskId).lean<TaskDoc | null>();
    if (!task) return { ok: false, error: "Task not found" };

    const project = await ProjectContent.findById(
      task.projectId
    ).lean<ProjectDoc | null>();
    if (!project) return { ok: false, error: "Parent project missing" };

    const parsed = UpdateDetailsSchema.safeParse({
      status: (formData.get("status") as string | null) ?? undefined,
      dueDate: (formData.get("dueDate") as string | null) ?? undefined,
      assigned: (formData.get("assigned") as string | null) ?? undefined,
      priority: (formData.get("priority") as string | null) ?? undefined,
    });
    if (!parsed.success) return { ok: false, error: "Invalid input" };

    const update: Partial<TaskDoc> = {};

    // status
    const normalizedStatus = normalizeStatusInput(parsed.data.status);
    if (normalizedStatus) update.status = normalizedStatus;

    // due date
    if (parsed.data.dueDate === "") {
      update.dueDate = undefined;
    } else if (typeof parsed.data.dueDate === "string") {
      const d = new Date(`${parsed.data.dueDate}T00:00:00.000Z`);
      if (!Number.isNaN(d.getTime())) update.dueDate = d;
    }

    // assigned
    if (typeof parsed.data.assigned === "string") {
      update.assigned = parsed.data.assigned.trim();
    }

    // priority
    const normalizedPriority = normalizePriorityInput(parsed.data.priority);
    if (normalizedPriority) {
      update.priority = normalizedPriority;
    }

    const updated = await TaskContent.findByIdAndUpdate(taskId, update, {
      new: true,
    }).lean<TaskDoc | null>();

    if (!updated) return { ok: false, error: "Failed to update task" };

    return {
      ok: true,
      updated: {
        status: updated.status as CanonicalStatus | undefined,
        dueDate: updated.dueDate
          ? new Date(updated.dueDate).toISOString().slice(0, 10)
          : undefined,
        assigned: updated.assigned ?? "",
        priority: updated.priority as PriorityLevel | undefined,
      },
    };
  } catch {
    return { ok: false, error: "Unexpected error" };
  }
}

/* -------------------------------- Subtasks (no reload) -------------------------------- */

export async function createSubTaskAction(
  taskId: string,
  formData: FormData
): Promise<{ ok: true; subtask: SafeSubTask } | { ok: false; error: string }> {
  try {
    await dbConnect();

    const task = await TaskContent.findById(taskId).lean<TaskDoc | null>();
    if (!task) return { ok: false, error: "Task not found" };

    const project = await ProjectContent.findById(
      task.projectId
    ).lean<ProjectDoc | null>();
    if (!project) return { ok: false, error: "Parent project missing" };

    const parsed = CreateSubTaskSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description"),
    });
    if (!parsed.success) return { ok: false, error: "Invalid input" };

    const { title, description } = parsed.data;

    const created = await SubTaskContent.create({
      taskId,
      creator: task.creator ?? "",
      name: "",
      title,
      description,
      active: true,
      status: "todo" as CanonicalStatus,
      assigned: "",
      dueDate: undefined,
      attachedFiles: [],
      allowedUsers: [],
      priority: "Medium" as PriorityLevel,
    } as Partial<SubTaskDoc>);

    // Build a plain, serializable result without accessing typed-missing fields directly
    const subtask: SafeSubTask = {
      _id: String(created._id),
      taskId: String(created.taskId),
      name: created.name ?? undefined,
      title: created.title ?? undefined,
      description: created.description ?? undefined,
      active: created.active ?? undefined,
      status: (created.status as string | null) ?? null,
      assigned: created.assigned ?? "",
      dueDate: created.dueDate ? toISO(created.dueDate) : null,
      attachedFiles: (created.attachedFiles as string[] | undefined) ?? [],
      allowedUsers: (created.allowedUsers as string[] | undefined) ?? [],
      priority:
        (created.priority as PriorityLevel | string | undefined) ?? "Medium",
      // timestamps read via helper (avoids TS error even if types omit them)
      createdAt: getDocDate(created, "createdAt"),
      updatedAt: getDocDate(created, "updatedAt"),
    };

    return { ok: true, subtask };
  } catch {
    return { ok: false, error: "Unexpected error" };
  }
}

export async function deleteSubTaskAction(
  subTaskId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await dbConnect();

    const sub = await SubTaskContent.findById(
      subTaskId
    ).lean<SubTaskDoc | null>();
    if (!sub) return { ok: false, error: "Subtask not found" };

    // Only allow deletion if status is "done"
    const raw = (sub.status ?? "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");
    const isDone = raw === "done";
    if (!isDone) {
      return {
        ok: false,
        error: "Subtasks can be deleted only if their status is Done",
      };
    }

    await SubTaskContent.findByIdAndDelete(subTaskId);

    // Revalidate the parent task page so it reflects the deletion on SSR routes
    if (sub.taskId) {
      revalidatePath(`/tasks/${String(sub.taskId)}`);
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Unexpected error" };
  }
}

export async function deleteTaskAction(
  taskId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await dbConnect();

    const task = await TaskContent.findById(taskId).lean<TaskDoc | null>();
    if (!task) return { ok: false, error: "Task not found" };

    // Normalize to check "done"
    const raw = (task.status ?? "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");
    if (raw !== "done") {
      return {
        ok: false,
        error: "You cannot delete a Task if the status is not Done",
      };
    }

    // OPTIONAL: also delete subtasks (uncomment if desired)
    // await SubTaskContent.deleteMany({ taskId });

    await TaskContent.findByIdAndDelete(taskId);

    // Revalidate the project page so the Tasks tab updates
    if (task.projectId) {
      revalidatePath(`/projects/${String(task.projectId)}`);
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Unexpected error" };
  }
}
