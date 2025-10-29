import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export async function saveUpload(file: File, folder: "covers" | "attachments") {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const filename = `${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await fs.mkdir(dir, { recursive: true });
  const full = path.join(dir, filename);
  await fs.writeFile(full, buffer);
  return `/uploads/${folder}/${filename}`; // public URL
}
