"use server";

import dbConnect from "@/lib/mongoose";
import SubTaskContent, {
  type SubTaskContent as SubTaskDoc,
} from "@/models/SubTaskContent";
import TaskContent, { type TaskContent as TaskDoc } from "@/models/TaskContent";
import ProjectContent, {
  type ProjectContent as ProjectDoc,
} from "@/models/ProjectContent";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canEditTask, canEditProject } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

/* ----------------------------- Local types ----------------------------- */

type CanonicalStatus = "todo" | "in_progress" | "blocked" | "done";
type PriorityLevel = "Low" | "Medium" | "High";

/* ----------------------------- Helpers ----------------------------- */

function canByIdOrEmail<T>(
  checker: (resource: T, token: string) => boolean,
  resource: T,
  id?: string | null,
  email?: string | null
) {
  if (id && checker(resource, id)) return true;
  if (email && checker(resource, email)) return true;
  return false;
}

function isUserAllowedForSubtask(
  project: ProjectDoc,
  task: TaskDoc,
  userId?: string | null,
  userEmail?: string | null
): boolean {
  // Project editor OR task editor (either by id OR by email)
  if (canByIdOrEmail(canEditProject, project, userId, userEmail)) return true;
  if (canByIdOrEmail(canEditTask, task, userId, userEmail)) return true;
  return false;
}

function isProjectEditor(
  project: ProjectDoc,
  userId?: string | null,
  userEmail?: string | null
): boolean {
  return canByIdOrEmail(canEditProject, project, userId, userEmail);
}

function normalizeStatusInput(raw: unknown): CanonicalStatus | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (v === "done" || v === "closed") return "done";
  if (v === "blocked" || v === "stuck" || v === "block") return "blocked";
  if (v === "inprogress" || v === "progress" || v === "doing" || v === "wip")
    return "in_progress";
  if (v === "todo" || v === "open" || v === "toassign" || v === "backlog")
    return "todo";
  return undefined;
}

function normalizePriorityInput(raw: unknown): PriorityLevel | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim().toLowerCase();
  if (v === "low") return "Low";
  if (v === "high") return "High";
  if (v === "medium" || v === "normal" || v === "default") return "Medium";
  return undefined;
}

function parseDueDate(input?: string | ""): Date | undefined {
  if (!input) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input))
    return new Date(`${input}T00:00:00.000Z`);
  const d = new Date(input);
  return isNaN(d.getTime()) ? undefined : d;
}

/* ------------------------------ Schemas ------------------------------ */

const StatusEnum = z.enum(["open", "to_assign", "todo", "done", "stuck"]);
const UpdateSchema = z.object({
  status: StatusEnum.optional(),
  dueDate: z
    .string()
    .datetime({ offset: false })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional()
    .or(z.literal("")),
  title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
});

const AssignSchema = z.object({
  assigned: z.string().trim().optional().or(z.literal("")),
});

const UpdateDetailsSchema = z.object({
  title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  status: z.string().optional(),
  dueDate: z.string().optional().or(z.literal("")),
  assigned: z.string().optional().or(z.literal("")),
  priority: z.string().optional(),
});

/* --------------------- No-reload details update --------------------- */

export async function updateSubTaskDetailsAction(
  subTaskId: string,
  formData: FormData
): Promise<
  | {
      ok: true;
      updated: {
        title?: string;
        description?: string;
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

    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user || (!user.id && !user.email))
      return { ok: false, error: "Unauthorized" };

    const sub = await SubTaskContent.findById(
      subTaskId
    ).lean<SubTaskDoc | null>();
    if (!sub) return { ok: false, error: "Subtask not found" };

    const task = await TaskContent.findById(sub.taskId).lean<TaskDoc | null>();
    if (!task) return { ok: false, error: "Parent task missing" };

    const project = await ProjectContent.findById(
      task.projectId
    ).lean<ProjectDoc | null>();
    if (!project) return { ok: false, error: "Parent project missing" };

    if (
      !isUserAllowedForSubtask(
        project,
        task,
        user.id ?? null,
        user.email ?? null
      )
    ) {
      return { ok: false, error: "Forbidden" };
    }

    const parsed = UpdateDetailsSchema.safeParse({
      title: (formData.get("title") as string | null) ?? undefined,
      description: (formData.get("description") as string | null) ?? undefined,
      status: (formData.get("status") as string | null) ?? undefined,
      dueDate: (formData.get("dueDate") as string | null) ?? undefined,
      assigned: (formData.get("assigned") as string | null) ?? undefined,
      priority: (formData.get("priority") as string | null) ?? undefined,
    });
    if (!parsed.success) return { ok: false, error: "Invalid input" };

    const update: Partial<SubTaskDoc> = {};

    if (parsed.data.title !== undefined) update.title = parsed.data.title;
    if (parsed.data.description !== undefined)
      update.description = parsed.data.description;

    const normalizedStatus = normalizeStatusInput(parsed.data.status);
    if (normalizedStatus) update.status = normalizedStatus;

    if (parsed.data.dueDate === "") {
      update.dueDate = undefined;
    } else if (typeof parsed.data.dueDate === "string") {
      const d = parseDueDate(parsed.data.dueDate);
      if (d) update.dueDate = d;
    }

    if (typeof parsed.data.assigned === "string") {
      update.assigned = parsed.data.assigned.trim();
    }

    const normalizedPriority = normalizePriorityInput(parsed.data.priority);
    if (normalizedPriority) update.priority = normalizedPriority;

    const updated = await SubTaskContent.findByIdAndUpdate(subTaskId, update, {
      new: true,
    }).lean<SubTaskDoc | null>();

    if (!updated) return { ok: false, error: "Failed to update subtask" };

    return {
      ok: true,
      updated: {
        title: updated.title ?? "",
        description: updated.description ?? "",
        status: (updated.status as CanonicalStatus | undefined) ?? undefined,
        dueDate: updated.dueDate
          ? new Date(updated.dueDate).toISOString().slice(0, 10)
          : undefined,
        assigned: updated.assigned ?? "",
        priority: (updated.priority as PriorityLevel | undefined) ?? undefined,
      },
    };
  } catch {
    return { ok: false, error: "Unexpected error" };
  }
}

/* ----------------- Legacy: update & redirect (kept for parity) ----------------- */

export async function updateSubTaskAction(
  subTaskId: string,
  formData: FormData
) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user || (!user.id && !user.email)) throw new Error("Unauthorized");

  const sub = await SubTaskContent.findById(
    subTaskId
  ).lean<SubTaskDoc | null>();
  if (!sub) throw new Error("Subtask not found");

  const task = await TaskContent.findById(sub.taskId).lean<TaskDoc | null>();
  if (!task) throw new Error("Parent task missing");
  const project = await ProjectContent.findById(
    task.projectId
  ).lean<ProjectDoc | null>();
  if (!project) throw new Error("Parent project missing");

  if (
    !isUserAllowedForSubtask(project, task, user.id ?? null, user.email ?? null)
  ) {
    throw new Error("Forbidden");
  }

  const parsed = UpdateSchema.safeParse({
    status: formData.get("status") ?? undefined,
    dueDate: (formData.get("dueDate") as string | null) ?? undefined,
    title: (formData.get("title") as string | null) ?? undefined,
    description: (formData.get("description") as string | null) ?? undefined,
  });
  if (!parsed.success) throw new Error("Invalid input");

  const update: Partial<SubTaskDoc> = {};
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.description !== undefined)
    update.description = parsed.data.description;
  if (parsed.data.status) {
    update.status =
      normalizeStatusInput(parsed.data.status) ?? parsed.data.status;
  }
  const due = parseDueDate(parsed.data.dueDate as string | undefined);
  if (parsed.data.dueDate === "") update.dueDate = undefined;
  else if (due) update.dueDate = due;

  await SubTaskContent.findByIdAndUpdate(subTaskId, update, {
    new: true,
  }).lean<SubTaskDoc | null>();

  revalidatePath(`/subtasks/${subTaskId}`);
  revalidatePath(`/tasks/${String(task._id)}`);
  redirect(`/subtasks/${subTaskId}`);
}

/* ----------------------- Assignment (project editors) ----------------------- */

export async function updateSubTaskAssignmentAction(
  subTaskId: string,
  formData: FormData
) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user || (!user.id && !user.email)) throw new Error("Unauthorized");

  const sub = await SubTaskContent.findById(
    subTaskId
  ).lean<SubTaskDoc | null>();
  if (!sub) throw new Error("Subtask not found");

  const task = await TaskContent.findById(sub.taskId).lean<TaskDoc | null>();
  if (!task) throw new Error("Parent task missing");

  const project = await ProjectContent.findById(
    task.projectId
  ).lean<ProjectDoc | null>();
  if (!project) throw new Error("Parent project missing");

  // Only project editors can change assignment (id OR email)
  if (!isProjectEditor(project, user.id ?? null, user.email ?? null))
    throw new Error("Forbidden");

  const assigned = (formData.get("assigned") as string | null) ?? "";
  const parsed = AssignSchema.safeParse({ assigned });
  if (!parsed.success) throw new Error("Invalid input");

  await SubTaskContent.findByIdAndUpdate(
    subTaskId,
    { assigned: parsed.data.assigned ?? "" },
    { new: true }
  ).lean<SubTaskDoc | null>();

  revalidatePath(`/subtasks/${subTaskId}`);
  revalidatePath(`/tasks/${String(task._id)}`);
  redirect(`/subtasks/${subTaskId}`);
}
