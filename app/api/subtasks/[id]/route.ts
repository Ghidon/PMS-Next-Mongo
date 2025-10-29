import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import SubTaskContent, { type SubTaskContent as SubTaskDoc } from "@/models/SubTaskContent";
import { Types, type UpdateQuery } from "mongoose";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const s = await SubTaskContent.findById(params.id).lean<SubTaskDoc | null>();
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(s);
}

type SubTaskPatchInput = UpdateQuery<SubTaskDoc>;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const body = (await req.json()) as SubTaskPatchInput;

  const updated = await SubTaskContent.findByIdAndUpdate(params.id, body, {
    new: true,
    runValidators: false,
  }).lean<SubTaskDoc | null>();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const deleted = await SubTaskContent.findByIdAndDelete(params.id).lean<SubTaskDoc | null>();
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
