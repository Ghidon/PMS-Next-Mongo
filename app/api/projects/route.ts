// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import ProjectContent, {
  type ProjectContent as ProjectDoc,
} from "@/models/ProjectContent";
import { getSessionUserId } from "@/lib/session";
import { type FilterQuery } from "mongoose";

export const runtime = "nodejs"; // ensure Node for DB access

export async function GET(_req: NextRequest) {
  const userId = await getSessionUserId();
  await dbConnect();

  const filter: FilterQuery<ProjectDoc> = {
    $or: [
      { creator: userId },
      { admins: userId },
      { managers: userId },
      { users: userId },
    ],
  };

  const projects = await ProjectContent.find(filter)
    .sort({ createdAt: -1 })
    .lean<ProjectDoc[]>();

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  await dbConnect();

  const body = (await req.json()) as Partial<ProjectDoc>;
  const p = await ProjectContent.create({
    creator: userId,
    name: body.name ?? "",
    title: body.title ?? "",
    description: body.description ?? "",
    active: body.active ?? true,
    selectedFile: body.selectedFile ?? "",
    admins: [userId],
    managers: [],
    users: [],
  });

  return NextResponse.json(p, { status: 201 });
}
