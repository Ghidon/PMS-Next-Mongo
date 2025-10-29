// app/api/projects/[id]/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import ProjectContent, {
  type ProjectContent as ProjectDoc,
} from "@/models/ProjectContent";
import { getSessionUserId } from "@/lib/session";
import { canEditProject } from "@/lib/permissions";

export const runtime = "nodejs"; // ensure Node (not Edge) for DB access

type Role = "ADMIN" | "MANAGER" | "USER";

interface Body {
  userId: string;
  role: Role; // role to ensure membership in
  action?: "add" | "remove";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const currentUser = await getSessionUserId();
  await dbConnect();

  const project = await ProjectContent.findById(id).lean<ProjectDoc | null>();
  if (!project)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canEditProject(project, currentUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, role, action = "add" } = (await req.json()) as Body;
  if (!userId)
    return NextResponse.json({ error: "userId required" }, { status: 400 });

  // Remove user from all role arrays first
  const pullAll = {
    $pull: { admins: userId, managers: userId, users: userId },
  };

  // Then add back to the selected role (or skip if removing)
  const pushRole =
    role === "ADMIN"
      ? { $push: { admins: userId } }
      : role === "MANAGER"
      ? { $push: { managers: userId } }
      : { $push: { users: userId } };

  if (action === "remove") {
    await ProjectContent.updateOne({ _id: id }, pullAll);
  } else {
    await ProjectContent.updateOne({ _id: id }, { ...pullAll, ...pushRole });
  }

  const updated = await ProjectContent.findById(id).lean<ProjectDoc | null>();
  return NextResponse.json(updated);
}
