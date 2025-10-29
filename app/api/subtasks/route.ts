import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import SubTaskContent, { type SubTaskContent as SubTaskDoc } from "@/models/SubTaskContent";
import { type FilterQuery } from "mongoose";

// GET /api/subtasks?taskId=...&status=...
export async function GET(req: Request) {
  await dbConnect();
  const { searchParams } = new URL(req.url);

  const filter: FilterQuery<SubTaskDoc> = {};
  const taskId = searchParams.get("taskId");
  const status = searchParams.get("status");

  if (taskId) filter.taskId = taskId;
  if (status) filter.status = status;

  const subtasks = await SubTaskContent.find(filter).sort({ createdAt: -1 }).lean();
  return NextResponse.json(subtasks);
}

// POST /api/subtasks
type SubTaskCreateInput = Partial<
  Omit<SubTaskDoc, "_id" | "createdAt"> & { dueDate?: string | Date }
>;

export async function POST(req: Request) {
  await dbConnect();
  const body = (await req.json()) as SubTaskCreateInput;

  const s = await SubTaskContent.create({
    taskId: body.taskId,
    creator: body.creator ?? "unknown",
    name: body.name ?? "",
    title: body.title ?? "",
    description: body.description ?? "",
    active: body.active ?? true,
    status: body.status ?? "TODO",
    assigned: body.assigned ?? "",
    dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    attachedFiles: Array.isArray(body.attachedFiles) ? body.attachedFiles : [],
    allowedUsers: Array.isArray(body.allowedUsers) ? body.allowedUsers : [],
    priority: body.priority ?? "Normal",
  });

  return NextResponse.json(s, { status: 201 });
}
