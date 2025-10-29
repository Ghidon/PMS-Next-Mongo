// app/api/subtasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import SubTaskContent, {
  type SubTaskContent as SubTaskDoc,
} from "@/models/SubTaskContent";
import { type FilterQuery } from "mongoose";

export const runtime = "nodejs";

// GET /api/subtasks?taskId=...&status=...
export async function GET(req: NextRequest) {
  await dbConnect();

  const searchParams = req.nextUrl.searchParams;
  const taskId = searchParams.get("taskId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  const filter: FilterQuery<SubTaskDoc> = {};
  if (taskId) filter.taskId = taskId;
  if (status) filter.status = status as SubTaskDoc["status"];

  const subtasks = await SubTaskContent.find(filter)
    .sort({ createdAt: -1 })
    .lean<SubTaskDoc[]>();

  return NextResponse.json(subtasks);
}

// POST /api/subtasks
type SubTaskCreateInput = Partial<
  Omit<SubTaskDoc, "_id" | "createdAt" | "updatedAt" | "dueDate"> & {
    dueDate?: string | Date;
  }
>;

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = (await req.json()) as SubTaskCreateInput;

  const dueDate =
    body.dueDate && typeof body.dueDate === "string"
      ? new Date(body.dueDate)
      : (body.dueDate as Date | undefined);

  const s = await SubTaskContent.create({
    taskId: body.taskId,
    creator: body.creator ?? "unknown",
    name: body.name ?? "",
    title: body.title ?? "",
    description: body.description ?? "",
    active: body.active ?? true,
    status: (body.status as SubTaskDoc["status"]) ?? "TODO",
    assigned: body.assigned ?? "",
    dueDate,
    attachedFiles: Array.isArray(body.attachedFiles) ? body.attachedFiles : [],
    allowedUsers: Array.isArray(body.allowedUsers) ? body.allowedUsers : [],
    priority: (body.priority as SubTaskDoc["priority"]) ?? "Normal",
  });

  return NextResponse.json(s, { status: 201 });
}
