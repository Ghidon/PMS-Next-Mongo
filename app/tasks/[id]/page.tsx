// app/tasks/[id]/page.tsx
import dbConnect from "@/lib/mongoose";
import TaskContent, { type TaskContent as TaskDoc } from "@/models/TaskContent";
import SubTaskContent, {
  type SubTaskContent as SubTaskDoc,
} from "@/models/SubTaskContent";
import ProjectContent, {
  type ProjectContent as ProjectDoc,
} from "@/models/ProjectContent";
import UserModel, { type User as UserDoc } from "@/models/User";
import { Types } from "mongoose";
import { notFound } from "next/navigation";
import TaskDetailClient from "./TaskDetailClient";

export const dynamic = "force-dynamic";

/* --------------------------- Safe (serializable) types --------------------------- */

export type SafeId = string;

export interface SafeTask {
  _id: SafeId;
  projectId: SafeId;
  creator?: string;
  name?: string;
  title?: string;
  description?: string;
  active?: boolean;
  status?: string | null;
  assigned?: string;
  dueDate?: string | null; // ISO or null
  attachedFiles?: string[];
  allowedUsers?: string[];
  priority?: "Low" | "Medium" | "High" | string | undefined;
  createdAt?: string | null; // ISO or null
  updatedAt?: string | null; // ISO or null
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
  dueDate?: string | null; // ISO or null
  attachedFiles?: string[];
  allowedUsers?: string[];
  priority?: "Low" | "Medium" | "High" | string | undefined;
  createdAt?: string | null; // ISO or null
  updatedAt?: string | null; // ISO or null
}

/* --------------------------------- Helpers --------------------------------- */

function toId(value: unknown): SafeId {
  if (!value) return "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v: any = value;
  if (v instanceof Types.ObjectId) return v.toString();
  return String(v);
}

/** Convert unknown value to ISO string or null (handles Date/string/undefined). */
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

function toSafeTask(doc: TaskDoc): SafeTask {
  return {
    _id: toId(doc._id),
    projectId: toId(doc.projectId),
    creator: doc.creator ?? undefined,
    name: doc.name ?? undefined,
    title: doc.title ?? undefined,
    description: doc.description ?? undefined,
    active: doc.active ?? undefined,
    status: (doc.status as string | null) ?? null,
    assigned: doc.assigned ?? "",
    dueDate: doc.dueDate ? toISO(doc.dueDate) : null,
    attachedFiles: (doc.attachedFiles as string[] | undefined) ?? [],
    allowedUsers: (doc.allowedUsers as string[] | undefined) ?? [],
    priority: (doc.priority as SafeTask["priority"]) ?? "Medium",
    createdAt: getDocDate(doc, "createdAt"),
    updatedAt: getDocDate(doc, "updatedAt"),
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

/* ---------------------------------- Page ---------------------------------- */

type PageParams = { id: string };
type SearchParams = Record<string, string | string[] | undefined>;

export default async function TaskDetailPage(props: {
  params: Promise<PageParams>;
  searchParams?: Promise<SearchParams>;
}) {
  const { id } = await props.params; // ✅ await the promise
  const sp = props.searchParams ? await props.searchParams : undefined; // (optional) also await

  await dbConnect();

  const taskDoc = await TaskContent.findById(id).lean<TaskDoc | null>();
  if (!taskDoc) return notFound();

  const projectDoc = await ProjectContent.findById(
    taskDoc.projectId
  ).lean<ProjectDoc | null>();
  if (!projectDoc) return notFound();

  // Build member list
  const rawTokens = [
    projectDoc.creator ?? "",
    ...(projectDoc.admins ?? []),
    ...(projectDoc.managers ?? []),
    ...(projectDoc.users ?? []),
  ].filter(Boolean) as string[];

  const emails = rawTokens
    .filter((t) => t.includes("@"))
    .map((e) => e.toLowerCase());
  const ids = rawTokens.filter(
    (t) => !t.includes("@") && Types.ObjectId.isValid(t)
  ) as string[];

  const memberDocs = await UserModel.find({
    $or: [
      { _id: { $in: ids.map((x) => new Types.ObjectId(x)) } },
      { email: { $in: emails } },
    ],
  })
    .select({ _id: 1, name: 1, email: 1, image: 1 })
    .lean<UserDoc[]>();

  const subtaskDocs = await SubTaskContent.find({ taskId: id })
    .sort({ createdAt: -1 })
    .lean<SubTaskDoc[]>();

  // Serialize to safe shapes
  const task = toSafeTask(taskDoc);
  const project = toSafeProject(projectDoc);
  const members = memberDocs.map(toSafeUser);
  const subtasks = subtaskDocs.map(toSafeSubTask);

  return (
    <TaskDetailClient
      task={task}
      project={project}
      members={members}
      subtasks={subtasks}
    />
  );
}
