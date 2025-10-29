import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import ProjectContent, { type ProjectContent as ProjectDoc } from "@/models/ProjectContent";
import { getSessionUserId } from "@/lib/session";
import { canEditProject } from "@/lib/permissions";

type Role = "ADMIN" | "MANAGER" | "USER";

interface Body {
  userId: string;
  role: Role;        // role to ensure membership in
  action?: "add" | "remove";
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const currentUser = await getSessionUserId();
  await dbConnect();

  const project = await ProjectContent.findById(params.id).lean<ProjectDoc | null>();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditProject(project, currentUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, role, action = "add" } = (await req.json()) as Body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  // compute updates
  const pullAll = { $pull: { admins: userId, managers: userId, users: userId } };
  const pushRole =
    role === "ADMIN" ? { $push: { admins: userId } } :
    role === "MANAGER" ? { $push: { managers: userId } } :
    { $push: { users: userId } };

  if (action === "remove") {
    await ProjectContent.updateOne({ _id: params.id }, pullAll);
  } else {
    await ProjectContent.updateOne({ _id: params.id }, { ...pullAll, ...pushRole });
  }

  const updated = await ProjectContent.findById(params.id).lean<ProjectDoc | null>();
  return NextResponse.json(updated);
}
