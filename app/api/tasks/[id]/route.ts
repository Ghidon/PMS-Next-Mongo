import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import TaskContent, { type TaskContent as TaskDoc } from "@/models/TaskContent";
import { Types, type FilterQuery, type UpdateQuery } from "mongoose";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const task = await TaskContent.findById(params.id).lean<TaskDoc | null>();
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

type TaskPatchInput = UpdateQuery<TaskDoc>;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const body = (await req.json()) as TaskPatchInput;

  const updated = await TaskContent.findByIdAndUpdate(params.id, body, {
    new: true,
    runValidators: false,
  }).lean<TaskDoc | null>();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const deleted = await TaskContent.findByIdAndDelete(params.id).lean<TaskDoc | null>();
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
