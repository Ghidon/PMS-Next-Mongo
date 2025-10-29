import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import TaskContent, { type TaskContent as TaskDoc } from "@/models/TaskContent";
import ProjectContent, { type ProjectContent as ProjectDoc } from "@/models/ProjectContent";
import { getSessionUserId } from "@/lib/session";
import { canEditProject } from "@/lib/permissions";
import { type FilterQuery } from "mongoose";

// GET /api/tasks?projectId=...&status=...
export async function GET(req: Request) {
  const userId = await getSessionUserId();
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");

  const filter: FilterQuery<TaskDoc> = {
    $or: [
      { allowedUsers: userId },
      { assigned: userId },
      { creator: userId },
    ],
  };
  if (projectId) filter.projectId = projectId;
  if (status) filter.status = status;

  const tasks = await TaskContent.find(filter)
    .sort({ createdAt: -1 })
    .lean<TaskDoc[]>();

  return NextResponse.json(tasks);
}

// Create a task (must be editor on the project)
export async function POST(req: Request) {
  const userId = await getSessionUserId();
  await dbConnect();

  const body = (await req.json()) as Partial<TaskDoc>;
  if (!body.projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const project = await ProjectContent.findById(body.projectId).lean<ProjectDoc | null>();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!canEditProject(project, userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const t = await TaskContent.create({
    projectId: body.projectId,
    creator: userId,
    name: body.name ?? "",
    title: body.title ?? "",
    description: body.description ?? "",
    active: body.active ?? true,
    status: body.status ?? "open",
    assigned: body.assigned ?? "",
    dueDate: body.dueDate ? new Date(body.dueDate as unknown as string) : undefined,
    attachedFiles: Array.isArray(body.attachedFiles) ? body.attachedFiles : [],
    allowedUsers: Array.isArray(body.allowedUsers) ? body.allowedUsers : [],
    priority: body.priority ?? "Normal",
  });

  return NextResponse.json(t, { status: 201 });
}
