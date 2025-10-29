// app/api/tasks/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import TaskContent, { type TaskContent as TaskDoc } from "@/models/TaskContent";
import ProjectContent, {
  type ProjectContent as ProjectDoc,
} from "@/models/ProjectContent";
import { getSessionUserId } from "@/lib/session";
import { canEditProject, canEditTask } from "@/lib/permissions";

export const runtime = "nodejs";

type Status = "open" | "to_assign" | "todo" | "done" | "stuck";

interface Body {
  status?: Status;
  dueDate?: string; // ISO
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const userId = await getSessionUserId();
  await dbConnect();

  const task = await TaskContent.findById(id).lean<TaskDoc | null>();
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = await ProjectContent.findById(
    task.projectId
  ).lean<ProjectDoc | null>();
  if (!project)
    return NextResponse.json({ error: "Project missing" }, { status: 404 });

  if (!(canEditProject(project, userId) || canEditTask(task, userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { status, dueDate } = (await req.json()) as Body;

  const update: Partial<TaskDoc> = {};
  if (status) update.status = status;
  if (dueDate) update.dueDate = new Date(dueDate);

  const updated = await TaskContent.findByIdAndUpdate(id, update, {
    new: true,
  }).lean<TaskDoc | null>();
  return NextResponse.json(updated);
}
