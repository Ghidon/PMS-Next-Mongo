// app/projects/[id]/page.tsx
import Link from "next/link";
import dbConnect from "@/lib/mongoose";
import ProjectContent, {
  type ProjectContent as ProjectDoc,
} from "@/models/ProjectContent";
import TaskContent, { type TaskContent as TaskDoc } from "@/models/TaskContent";
import { notFound } from "next/navigation";
import {
  createTaskAction,
  updateProjectCoverAction,
  inviteUserToProjectAction,
} from "./actions";
import { DEFAULT_PROJECT_COVER } from "@/lib/constants";

import PageContainer from "@/app/components/PageContainer";
import { ProjectCover, ProjectHeader } from "@/app/components/project";
import TaskListDeletable, {
  type TaskListItem as DeletableTaskListItem,
} from "@/app/components/tasks/TaskListDeletable";
import {
  Stat,
  ProgressBar,
  Milestone,
} from "@/app/components/project/ProjectOverview";
import NewTaskModalButton from "@/app/components/tasks/NewTaskModalButton";
import InviteMemberButton from "@/app/components/project/InviteMemberButton";
import TaskFilters from "@/app/components/tasks/TaskFilters";
import type { FilterQuery } from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Suspense } from "react";

/* -------------------- Tabs (strict-typed) -------------------- */
const TABS = ["overview", "tasks", "team", "activity"] as const;
type TabKey = (typeof TABS)[number];
function isTabKey(val: unknown): val is TabKey {
  return typeof val === "string" && (TABS as readonly string[]).includes(val);
}

/* -------------------- Helpers / types -------------------- */
type WithTimestamps<T> = T & {
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  active?: boolean;
};

type PageParams = { id: string };
type SearchParams = Record<string, string | string[] | undefined>;

/** Map DB tasks -> UI list items (no any) */
function toTaskListItems(tasks: TaskDoc[]): DeletableTaskListItem[] {
  return tasks.map((t) => ({
    _id: String(t._id),
    title:
      (t as Partial<TaskDoc>).title ?? (t as Partial<TaskDoc>).name ?? null,
    name: (t as Partial<TaskDoc>).name ?? null,
    description: (t as Partial<TaskDoc>).description ?? null,
    status: (t as Partial<TaskDoc>).status ?? null,
    assigned: (t as Partial<TaskDoc>).assigned ?? null,
    dueDate: (t as Partial<TaskDoc>).dueDate ?? null,
  }));
}

/* -------------------- Tasks tab: parse filters from URL -------------------- */
function parseTabFilters(sp?: Record<string, string | string[] | undefined>): {
  status?: string;
  assignee?: string;
  due?: "overdue" | "week" | "none" | "all";
  q?: string;
  layout: "grouped" | "list";
} {
  const getStr = (key: string): string | undefined => {
    const v = sp?.[key];
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v[0];
    return undefined;
  };

  const status = getStr("status");
  const assignee = getStr("assignee");
  const dueParam = getStr("due");
  const due: "overdue" | "week" | "none" | "all" =
    dueParam === "overdue" ||
    dueParam === "week" ||
    dueParam === "none" ||
    dueParam === "all"
      ? dueParam
      : "all";
  const q = getStr("q");
  const layoutParam = getStr("layout");
  const layout: "grouped" | "list" =
    layoutParam === "list" ? "list" : "grouped";

  return { status, assignee, due, q, layout };
}

export const dynamic = "force-dynamic";

/* -------------------- Streamed server component for Tasks tab -------------------- */
async function TasksTabServer({
  projectId,
  sp,
}: {
  projectId: string;
  sp?: Record<string, string | string[] | undefined>;
}) {
  await dbConnect();

  // Parse filters
  const { status, assignee, due, q, layout } = parseTabFilters(sp);

  // Default status to "Open" if absent (without redirect)
  const statusFilter = status ?? "Open";
  const assigneeFilter = assignee;
  const dueFilter = due;
  const qFilter = q;

  const session = await getServerSession(authOptions);
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const escapeRegex = (s: string): string =>
    s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const buildCiRegex = (v: string): RegExp =>
    new RegExp(`^\\s*${escapeRegex(v)}\\s*$`, "i");

  const andClauses: FilterQuery<TaskDoc>[] = [{ projectId }];

  // Status map (same logic, but local)
  if (statusFilter.toLowerCase() !== "all") {
    const aliases: Record<string, string[]> = {
      "To do": ["To do", "Todo", "To-do", "To Assign", "To assign", "Open"],
      "In progress": ["In progress", "In Progress", "Progress", "Doing", "WIP"],
      Blocked: ["Blocked", "Stuck"],
      Done: ["Done", "Closed"],
      Open: ["To do", "In progress", "Blocked", "Stuck"],
    };
    const values = aliases[statusFilter] ?? [statusFilter];
    const statusOr = values.map((v) => ({
      status: { $regex: `^${escapeRegex(v)}$`, $options: "i" as const },
    }));
    andClauses.push({ $or: statusOr });
  }

  // Assignee
  if (assigneeFilter) {
    if (assigneeFilter === "unassigned") {
      andClauses.push({
        $or: [
          { assigned: { $regex: /^unassigned$/i } },
          { assigned: { $exists: false } },
          { assigned: null },
          { assigned: "" },
          { assigned: { $regex: /^\s*$/ } },
        ],
      });
    } else if (assigneeFilter === "me") {
      const meRaw = [
        (session?.user?.id ?? "").trim(),
        (session?.user?.email ?? "").trim(),
        (session?.user?.name ?? "").trim(),
      ].filter((s) => s.length > 0);
      if (meRaw.length > 0) {
        const meRegexes = meRaw.map(buildCiRegex);
        andClauses.push({ assigned: { $in: [...meRaw, ...meRegexes] } });
      } else {
        andClauses.push({ assigned: "__no_user__" });
      }
    } else if (assigneeFilter !== "all") {
      const v = assigneeFilter.trim();
      const rx = buildCiRegex(v);
      andClauses.push({ assigned: { $in: [v, rx] } });
    }
  }

  // Due
  if (dueFilter === "overdue") {
    andClauses.push({ dueDate: { $lt: now } });
  } else if (dueFilter === "week") {
    andClauses.push({ dueDate: { $gte: now, $lte: weekAhead } });
  } else if (dueFilter === "none") {
    andClauses.push({
      $or: [{ dueDate: { $exists: false } }, { dueDate: null }],
    });
  }

  // Text search
  if (qFilter && qFilter.length > 0) {
    const regex = new RegExp(escapeRegex(qFilter), "i");
    andClauses.push({ $or: [{ title: regex }, { description: regex }] });
  }

  const filter: FilterQuery<TaskDoc> =
    andClauses.length === 1 ? andClauses[0] : { $and: andClauses };

  const sort: Record<string, 1 | -1> = {
    dueDate: 1,
    updatedAt: -1,
    createdAt: -1,
  };

  // ⚡ Only fetch what TaskList actually needs
  const tasks = await TaskContent.find(filter, {
    title: 1,
    name: 1,
    description: 1,
    status: 1,
    assigned: 1,
    dueDate: 1,
  })
    .sort(sort)
    .lean<TaskDoc[]>();

  return (
    <div className="rounded-2xl border bg-white p-0">
      <TaskFilters />
      <div className="p-4">
        <TaskListDeletable
          projectId={projectId}
          tasks={toTaskListItems(tasks)}
          heading="Tasks"
          layout={layout}
        />
      </div>
    </div>
  );
}

export default async function ProjectDetailPage(props: {
  params: Promise<PageParams>;
  searchParams?: Promise<SearchParams>;
}) {
  const { id } = await props.params;
  const spObj = props.searchParams ? await props.searchParams : undefined;

  const tabRaw = spObj?.tab;
  const tabCandidate = Array.isArray(tabRaw) ? tabRaw[0] : tabRaw;
  const tab: TabKey = isTabKey(tabCandidate) ? tabCandidate : "overview";

  await dbConnect();

  const project = await ProjectContent.findById(
    id
  ).lean<WithTimestamps<ProjectDoc> | null>();
  if (!project) return notFound();

  /* ----- PROGRESS (only fetch when on overview) ----- */
  let progress = 0;
  let openTasks = 0;
  let dueThisWeek = 0;

  if (tab === "overview") {
    const allTasks = await TaskContent.find(
      { projectId: id },
      { status: 1, dueDate: 1 }
    )
      .sort({ createdAt: -1 })
      .lean<TaskDoc[]>();

    const totalTasks = allTasks.length;
    const doneTasks = allTasks.filter(
      (t) => ((t as Partial<TaskDoc>).status ?? "").toLowerCase() === "done"
    ).length;

    progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    openTasks = totalTasks - doneTasks;
    dueThisWeek = 0; // compute if/when you need it
  }

  /* -------------------- Cover -------------------- */
  const coverSrc =
    project.selectedFile && project.selectedFile.length > 0
      ? project.selectedFile
      : DEFAULT_PROJECT_COVER;

  return (
    <PageContainer>
      <div className="mb-4">
        <Link href="/projects" className="text-sm underline underline-offset-2">
          ← Back
        </Link>
      </div>

      {/* Cover */}
      <div className="max-w-6xl" id="cover">
        <ProjectCover
          src={coverSrc}
          creatorName={project.name ?? undefined}
          onChangeCover={updateProjectCoverAction.bind(null, id)}
        />
      </div>

      {/* Grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* MAIN */}
        <div className="space-y-6">
          <ProjectHeader
            id={String(project._id)}
            title={project.title ?? undefined}
            name={project.name ?? undefined}
            description={project.description ?? undefined}
            createdAt={project.createdAt ?? null}
            updatedAt={project.updatedAt ?? project.createdAt ?? null}
            status={project.active === false ? "Archived" : "Active"}
          />

          {/* Tabs */}
          <div className="mb-3 flex flex-wrap gap-2 rounded-xl border bg-white p-1">
            <TabLink
              id={id}
              label="Overview"
              value="overview"
              active={tab === "overview"}
            />
            <TabLink
              id={id}
              label="Tasks"
              value="tasks"
              active={tab === "tasks"}
            />
            <TabLink
              id={id}
              label="Team"
              value="team"
              active={tab === "team"}
            />
            <TabLink
              id={id}
              label="Activity"
              value="activity"
              active={tab === "activity"}
            />
          </div>

          {/* Tab content */}
          {tab === "overview" && (
            <>
              <div className="rounded-2xl border bg-white p-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Stat label="Progress" value={`${progress}%`}>
                    <ProgressBar value={progress} />
                  </Stat>
                  <Stat
                    label="Open Tasks"
                    value={openTasks}
                    sub={`${dueThisWeek} due this week`}
                  />
                  <Stat label="Files" value={"—"} sub="(mockup)" />
                </div>
                {project.description && (
                  <p className="mt-4 text-sm leading-relaxed text-gray-700">
                    {project.description}
                  </p>
                )}
              </div>

              {/* Milestones mockup */}
              <div className="rounded-2xl border bg-white p-4">
                <h3 className="mb-3 text-base font-semibold">
                  Milestones{" "}
                  <span className="ml-2 text-xs text-gray-500">(mockup)</span>
                </h3>
                <div className="space-y-3">
                  <Milestone
                    title="Tasks MVP"
                    date="Oct 20, 2025"
                    progress={80}
                  />
                  <Milestone
                    title="Subtasks & Roles"
                    date="Oct 27, 2025"
                    progress={35}
                  />
                  <Milestone
                    title="Files & Covers"
                    date="Nov 05, 2025"
                    progress={10}
                  />
                </div>
              </div>
            </>
          )}

          {tab === "tasks" && (
            <Suspense
              key={JSON.stringify(spObj)}
              fallback={<TasksTabSkeleton />}
            >
              <TasksTabServer projectId={id} sp={spObj} />
            </Suspense>
          )}

          {tab === "team" && (
            <TeamTab
              projectId={id}
              admins={project.admins ?? []}
              managers={project.managers ?? []}
              users={project.users ?? []}
            />
          )}

          {tab === "activity" && (
            <div className="rounded-2xl border bg-white p-4">
              <h3 className="mb-3 text-base font-semibold">
                Recent Activity{" "}
                <span className="ml-1 text-xs text-gray-500">(mockup)</span>
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Cover replaced — 2h ago</li>
                <li>• Description updated — 1d ago</li>
                <li>• Task marked done — 3d ago</li>
              </ul>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-6">
          <div>
            <NewTaskModalButton onCreate={createTaskAction.bind(null, id)} />
          </div>
          <div className="rounded-2xl border bg-white">
            <div className="border-b px-4 py-3 font-medium">
              Comments{" "}
              <span className="ml-2 text-xs text-gray-500">(mockup)</span>
            </div>
            <div className="px-4 py-4">
              <p className="text-sm text-gray-600">
                Comment form & thread will appear here (per project).
              </p>
            </div>
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}

/* -------------------- Helpers -------------------- */
function TabLink({
  id,
  label,
  value,
  active,
}: {
  id: string;
  label: string;
  value: "overview" | "tasks" | "team" | "activity";
  active: boolean;
}) {
  // Default the Tasks tab URL to include a starting status=Open
  const href =
    value === "tasks"
      ? `/projects/${id}?tab=tasks&status=Open`
      : `/projects/${id}?tab=${value}`;

  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm ${
        active ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
      }`}
      prefetch
    >
      {label}
    </Link>
  );
}

function TeamTab({
  projectId,
  admins,
  managers,
  users,
}: {
  projectId: string;
  admins: string[];
  managers: string[];
  users: string[];
}) {
  const roles: {
    label: "Admins" | "Managers" | "Users";
    data: string[];
    color: string;
  }[] = [
    { label: "Admins", data: admins, color: "bg-red-100 text-red-800" },
    { label: "Managers", data: managers, color: "bg-blue-100 text-blue-800" },
    { label: "Users", data: users, color: "bg-gray-100 text-gray-800" },
  ];

  const allEmpty = admins.length + managers.length + users.length === 0;

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold">Team Members</h3>
        <InviteMemberButton
          projectId={projectId}
          onInvite={inviteUserToProjectAction.bind(null, projectId)}
        />
      </div>

      {allEmpty ? (
        <p className="text-sm text-gray-500">No members yet.</p>
      ) : (
        <div className="space-y-4">
          {roles.map(
            (r) =>
              r.data.length > 0 && (
                <div key={r.label}>
                  <div className="mb-1 text-sm font-medium text-gray-700">
                    {r.label}
                  </div>
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {r.data.map((idOrEmail) => (
                      <li
                        key={idOrEmail}
                        className="flex items-center justify-between rounded-lg border px-3 py-2"
                      >
                        <span className="truncate text-sm">{idOrEmail}</span>
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${r.color}`}
                        >
                          {r.label.slice(0, -1)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
          )}
        </div>
      )}
    </div>
  );
}

function TasksTabSkeleton() {
  return (
    <div className="rounded-2xl border bg-white p-4 space-y-3">
      <div className="h-9 w-full rounded bg-gray-100" />
      <div className="h-9 w-2/3 rounded bg-gray-100" />
      <div className="grid gap-3">
        <div className="h-20 rounded-xl border bg-gray-50" />
        <div className="h-20 rounded-xl border bg-gray-50" />
        <div className="h-20 rounded-xl border bg-gray-50" />
      </div>
    </div>
  );
}
