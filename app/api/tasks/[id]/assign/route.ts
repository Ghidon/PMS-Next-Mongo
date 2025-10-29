// app/api/tasks/[id]/assign/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import TaskContent, { type TaskContent as TaskDoc } from "@/models/TaskContent";
import ProjectContent, {
  type ProjectContent as ProjectDoc,
} from "@/models/ProjectContent";
import { getSessionUserId } from "@/lib/session";
import { canEditProject } from "@/lib/permissions";

export const runtime = "nodejs";

interface Body {
  assigned?: string; // set assignee
  allowedUsers?: string[]; // replace allowed users
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

  if (!canEditProject(project, userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { assigned, allowedUsers } = (await req.json()) as Body;

  const update: Partial<TaskDoc> = {};
  if (typeof assigned === "string") update.assigned = assigned;
  if (Array.isArray(allowedUsers)) update.allowedUsers = allowedUsers;

  const updated = await TaskContent.findByIdAndUpdate(id, update, {
    new: true,
  }).lean<TaskDoc | null>();
  return NextResponse.json(updated);
}
