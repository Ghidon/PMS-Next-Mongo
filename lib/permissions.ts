// lib/permissions.ts
import { type ProjectContent as ProjectDoc } from "@/models/ProjectContent";
import { type TaskContent as TaskDoc } from "@/models/TaskContent";

function toArr(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

export function canEditProject(
  p: Partial<ProjectDoc>,
  userId: string | null | undefined
): boolean {
  if (!userId) return false;

  const admins = toArr(p.admins);
  const managers = toArr(p.managers);
  const users = toArr(p.users);

  return (
    p.creator === userId ||
    admins.includes(userId) ||
    managers.includes(userId) ||
    users.includes(userId)
  );
}

export function canEditTask(
  t: Partial<TaskDoc>,
  userId: string | null | undefined
): boolean {
  if (!userId) return false;

  const allowedUsers = toArr(t.allowedUsers);

  return (
    t.creator === userId ||
    t.assigned === userId ||
    allowedUsers.includes(userId)
  );
}

export function canViewProject(
  p: Partial<ProjectDoc>,
  userId: string | null | undefined
): boolean {
  if (!userId) return false;

  const admins = toArr(p.admins);
  const managers = toArr(p.managers);
  const users = toArr(p.users);

  return (
    p.creator === userId ||
    admins.includes(userId) ||
    managers.includes(userId) ||
    users.includes(userId)
  );
}

export function canViewTask(
  t: Partial<TaskDoc>,
  userId: string | null | undefined
): boolean {
  if (!userId) return false;

  const allowedUsers = toArr(t.allowedUsers);
  return (
    t.creator === userId ||
    t.assigned === userId ||
    allowedUsers.includes(userId)
  );
}
