import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getSessionUserId() {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) throw new Error("Unauthorized");
  return id;
}

export async function getSessionOrNull() {
  return getServerSession(authOptions);
}
