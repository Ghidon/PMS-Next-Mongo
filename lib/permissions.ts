import type { ProjectContent as ProjectDoc } from "@/models/ProjectContent";
import type { TaskContent as TaskDoc } from "@/models/TaskContent";

export function canViewProject(p: ProjectDoc, userId: string): boolean {
  return (
    p.creator === userId ||
    p.admins.includes(userId) ||
    p.managers.includes(userId) ||
    p.users.includes(userId)
  );
}

export function canEditProject(p: ProjectDoc, userId: string): boolean {
  return p.creator === userId || p.admins.includes(userId) || p.managers.includes(userId);
}

export function canViewTask(t: TaskDoc, userId: string): boolean {
  return (
    t.creator === userId ||
    t.assigned === userId ||
    t.allowedUsers.includes(userId)
  );
}

export function canEditTask(t: TaskDoc, userId: string): boolean {
  // edit if you can edit project OR you are creator/assignee of the task
  return (
    t.creator === userId ||
    t.assigned === userId ||
    t.allowedUsers.includes(userId)
  );
}
