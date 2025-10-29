"use server";

import dbConnect from "@/lib/mongoose";
import TaskContent, { type TaskContent as TaskDoc } from "@/models/TaskContent";
import ProjectContent, { type ProjectContent as ProjectDoc } from "@/models/ProjectContent";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canEditProject } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { saveUpload } from "@/lib/saveUpload";

/* ------------------------ Validation ------------------------ */

const CreateTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional().default(""),
});

const InviteSchema = z.object({
  user: z.string().trim().min(3, "Provide an email or ID").max(200),
  role: z.enum(["admin", "manager", "user"]),
});

/* ------------------------ Helpers ------------------------ */

/** Checks edit permission using either user.id or user.email (without changing your permissions lib). */
function isUserAllowed(project: ProjectDoc, userId?: string | null, userEmail?: string | null): boolean {
  if (userId && canEditProject(project, userId)) return true;
  if (userEmail && canEditProject(project, userEmail)) return true;
  return false;
}

/* ------------------------ Actions ------------------------ */

export async function createTaskAction(projectId: string, formData: FormData) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) throw new Error("Unauthorized");

  const project = await ProjectContent.findById(projectId).lean<ProjectDoc | null>();
  if (!project) throw new Error("Project not found");

  if (!isUserAllowed(project, user.id, user.email ?? null)) {
    throw new Error("Forbidden");
  }

  const parsed = CreateTaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) throw new Error("Invalid form input");
  const { title, description } = parsed.data;

  const taskDoc: Omit<Partial<TaskDoc>, "_id"> = {
    projectId,
    creator: user.id,
    name: "", // legacy optional
    title,
    description,
    active: true,
    status: "Open", // NOTE: your progress counts only "Done" as completed
    assigned: "",
    dueDate: undefined,
    attachedFiles: [],
    allowedUsers: [],
    priority: "Normal",
    createdAt: new Date(),
  };

  await TaskContent.create(taskDoc);

  revalidatePath(`/projects/${projectId}`, "page");
}

/** Replace the project cover image. Accepts `cover` (old form) or `file` (icon uploader). */
export async function updateProjectCoverAction(projectId: string, formData: FormData) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) throw new Error("Unauthorized");

  const project = await ProjectContent.findById(projectId).lean<ProjectDoc | null>();
  if (!project) throw new Error("Project not found");

  const candidate = formData.get("cover") ?? formData.get("file");
  if (!(candidate instanceof File) || candidate.size === 0) {
    throw new Error("No file uploaded");
  }

  const publicUrl = await saveUpload(candidate, "covers");
  await ProjectContent.findByIdAndUpdate(projectId, { selectedFile: publicUrl });

  revalidatePath(`/projects/${projectId}`, "page");
}

/** Invite a user (by email or ID) to the project with a specific role. */
export async function inviteUserToProjectAction(projectId: string, formData: FormData) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) throw new Error("Unauthorized");

  const project = await ProjectContent.findById(projectId).lean<ProjectDoc | null>();
  if (!project) throw new Error("Project not found");

  if (!isUserAllowed(project, user.id, user.email ?? null)) {
    throw new Error("Forbidden");
  }

  const parsed = InviteSchema.safeParse({
    user: formData.get("user"),
    role: formData.get("role"),
  });
  if (!parsed.success) throw new Error("Invalid input");

  const { user: invitee, role } = parsed.data;

  // Ensure invitee ends up in exactly one role array
  const pulls: Record<string, 1> = { admins: 1, managers: 1, users: 1 };
  delete pulls[role === "admin" ? "admins" : role === "manager" ? "managers" : "users"];

  const addToField =
    role === "admin" ? "admins" : role === "manager" ? "managers" : "users";

  await ProjectContent.findByIdAndUpdate(
    projectId,
    {
      $pull: pulls, // remove from other roles if present
      $addToSet: { [addToField]: invitee },
    },
    { new: false }
  );

  revalidatePath(`/projects/${projectId}`, "page");
}
