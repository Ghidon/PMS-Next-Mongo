// app/subtasks/[id]/page.tsx
import dbConnect from "@/lib/mongoose";
import SubTaskContent, {
  type SubTaskContent as SubTaskDoc,
} from "@/models/SubTaskContent";
import TaskContent, { type TaskContent as TaskDoc } from "@/models/TaskContent";
import ProjectContent, {
  type ProjectContent as ProjectDoc,
} from "@/models/ProjectContent";
import UserModel, { type User as UserDoc } from "@/models/User";
import { Types } from "mongoose";
import { notFound } from "next/navigation";
import SubTaskDetailClient from "./SubTaskDetailClient";

export const dynamic = "force-dynamic";

/* --------------------------- Safe (serializable) types --------------------------- */
export type SafeId = string;

export interface SafeTask {
  _id: SafeId;
  projectId: SafeId;
  name?: string;
  title?: string;
}

export interface SafeProject {
  _id: SafeId;
  name?: string;
  title?: string;
}

export interface SafeUser {
  _id: SafeId;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface SafeSubTask {
  _id: SafeId;
  taskId: SafeId;
  name?: string;
  title?: string;
  description?: string;
  active?: boolean;
  status?: string | null;
  assigned?: string;
  dueDate?: string | null; // ISO
  attachedFiles?: string[];
  allowedUsers?: string[];
  priority?: "Low" | "Medium" | "High" | string | undefined;
  createdAt?: string | null; // ISO
  updatedAt?: string | null; // ISO
}

/* --------------------------------- Helpers --------------------------------- */
function toId(value: unknown): SafeId {
  if (!value) return "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v: any = value;
  if (v instanceof Types.ObjectId) return v.toString();
  return String(v);
}

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
  const anyDoc = doc as any;
  return toISO(anyDoc && anyDoc[key]);
}

function toSafeSubTask(doc: SubTaskDoc): SafeSubTask {
  return {
    _id: toId(doc._id),
    taskId: toId(doc.taskId),
    name: doc.name ?? undefined,
    title: doc.title ?? undefined,
    description: doc.description ?? undefined,
    active: doc.active ?? undefined,
    status: (doc.status as string | null) ?? null,
    assigned: doc.assigned ?? "",
    dueDate: doc.dueDate ? toISO(doc.dueDate) : null,
    attachedFiles: (doc.attachedFiles as string[] | undefined) ?? [],
    allowedUsers: (doc.allowedUsers as string[] | undefined) ?? [],
    priority: (doc.priority as SafeSubTask["priority"]) ?? "Medium",
    createdAt: getDocDate(doc, "createdAt"),
    updatedAt: getDocDate(doc, "updatedAt"),
  };
}

function toSafeTask(doc: TaskDoc): SafeTask {
  return {
    _id: toId(doc._id),
    projectId: toId(doc.projectId),
    name: doc.name ?? undefined,
    title: doc.title ?? undefined,
  };
}

function toSafeProject(doc: ProjectDoc): SafeProject {
  return {
    _id: toId(doc._id),
    name: doc.name ?? undefined,
    title: doc.title ?? undefined,
  };
}

function toSafeUser(doc: UserDoc): SafeUser {
  return {
    _id: toId(doc._id),
    name: doc.name ?? null,
    email: doc.email ?? null,
    image: doc.image ?? null,
  };
}

/* ---------------------------------- Page ---------------------------------- */
type PageParams = { id: string };

export default async function SubTaskDetailPage(props: {
  params: Promise<PageParams>;
}) {
  const { id } = await props.params;

  await dbConnect();

  const subDoc = await SubTaskContent.findById(id).lean<SubTaskDoc | null>();
  if (!subDoc) return notFound();

  const taskDoc = await TaskContent.findById(
    subDoc.taskId
  ).lean<TaskDoc | null>();
  if (!taskDoc) return notFound();

  const projectDoc = await ProjectContent.findById(
    taskDoc.projectId
  ).lean<ProjectDoc | null>();
  if (!projectDoc) return notFound();

  // Build members list (project-level editors + task-level)
  const tokens = new Set<string>();
  if (taskDoc.assigned) tokens.add(String(taskDoc.assigned));
  (Array.isArray(taskDoc.allowedUsers) ? taskDoc.allowedUsers : []).forEach(
    (t) => t && tokens.add(String(t))
  );
  if (projectDoc.creator) tokens.add(String(projectDoc.creator));
  (projectDoc.admins ?? []).forEach((t) => t && tokens.add(String(t)));
  (projectDoc.managers ?? []).forEach((t) => t && tokens.add(String(t)));
  (projectDoc.users ?? []).forEach((t) => t && tokens.add(String(t)));

  const tokenList = Array.from(tokens);
  const emails = tokenList
    .filter((t) => t.includes("@"))
    .map((e) => e.toLowerCase());
  const ids = tokenList
    .filter((t) => !t.includes("@") && Types.ObjectId.isValid(t))
    .map((x) => new Types.ObjectId(x));

  const memberDocs = await UserModel.find({
    $or: [{ _id: { $in: ids } }, { email: { $in: emails } }],
  })
    .select({ _id: 1, name: 1, email: 1, image: 1 })
    .lean<UserDoc[]>();

  return (
    <SubTaskDetailClient
      subtask={toSafeSubTask(subDoc)}
      task={toSafeTask(taskDoc)}
      project={toSafeProject(projectDoc)}
      members={memberDocs.map(toSafeUser)}
    />
  );
}
