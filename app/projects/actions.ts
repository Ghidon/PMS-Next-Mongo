"use server";

import dbConnect from "@/lib/mongoose";
import ProjectContent, { type ProjectContent as ProjectDoc } from "@/models/ProjectContent";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { saveUpload } from "@/lib/saveUpload";
import { DEFAULT_PROJECT_COVER } from "@/lib/constants";

const CreateProjectSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional().default(""),
});

export async function createProjectAction(formData: FormData) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id || !user.email) throw new Error("Unauthorized");

  const parsed = CreateProjectSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) throw new Error("Invalid form input");

  let selectedFile = DEFAULT_PROJECT_COVER;
  const cover = formData.get("cover");
  if (cover instanceof File && cover.size > 0) {
    selectedFile = await saveUpload(cover, "covers");
  }

  const { title, description } = parsed.data;

  const doc = await ProjectContent.create({
    creator: user.id,            // user id (as string)
    name: user.name ?? "",       // creator's name
    title,
    description,
    active: true,
    selectedFile,                // either uploaded URL or default
    admins: [user.email],        // creator is admin by email
    managers: [],
    users: [],
    createdAt: new Date(),
  } as Partial<ProjectDoc>);

  revalidatePath("/projects");
  redirect(`/projects/${String(doc._id)}`);
}
