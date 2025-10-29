import Link from "next/link";
import Image from "next/image";
import dbConnect from "@/lib/mongoose";
import ProjectContent from "@/models/ProjectContent";
import UserBar from "@/app/components/UserBar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { type FilterQuery, Types } from "mongoose";
import NewProjectModal, { type CreateProjectAction } from "./NewProjectModal";
import { createProjectAction } from "./actions";

export const dynamic = "force-dynamic";

/** Exact shape we select from Mongo for cards (no `any`) */
type DBProjectCard = {
  _id: Types.ObjectId;
  title?: string;
  name?: string;
  description?: string;
  selectedFile?: string;   // uploaded cover (base64 or URL)
  coverUrl?: string;       // uploaded cover URL
  cover?: string;          // legacy field
  createdAt?: Date;
  updatedAt?: Date;
};

/** UI shape used by the component */
type UIProject = {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  selectedFile?: string;
  coverUrl?: string;
  cover?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

/** Normalize DB → UI without using `any` */
function toUI(p: DBProjectCard): UIProject {
  return {
    id: String(p._id),
    title: p.title,
    name: p.name,
    description: p.description,
    selectedFile: p.selectedFile,
    coverUrl: p.coverUrl,
    cover: p.cover,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/** Card component with Next.js <Image /> cover */
export function ProjectCard({ p }: { p: UIProject }) {
  const title = p.title || p.name || "Untitled";
  const desc = p.description || "";

  const cover =
    p.selectedFile || p.coverUrl || p.cover || "/defaults/project-cover.jpg";

  // ✨ format both timestamps
  const created = p.createdAt ? new Date(p.createdAt) : null;
  const updated = p.updatedAt ? new Date(p.updatedAt) : null;

  return (
    <div className="card overflow-hidden transition hover:shadow-md">
      <div className="relative w-full h-40 bg-zinc-100">
        <Image
          src={cover}
          alt={`${title} cover`}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover object-top"
        />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/projects/${p.id}`}
              className="block font-medium truncate hover:opacity-90"
              title={title}
            >
              {title}
            </Link>
            {desc && <p className="mt-1 text-sm opacity-70 line-clamp-2">{desc}</p>}
          </div>

          <Link
            href={`/projects/${p.id}`}
            className="btn btn-outline shrink-0 cursor-pointer relative z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            aria-label={`Open project ${title}`}
            role="button"
          >
            Open
          </Link>
        </div>

        {/* ✨ show Updated, fallback to Created if missing */}
        <div className="mt-3 text-xs opacity-60">
          {updated ? (
            <span>Updated {updated.toLocaleDateString()}</span>
          ) : created ? (
            <span>Created {created.toLocaleDateString()}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}


export default async function ProjectsPage() {
  await dbConnect();

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id ?? null;
  const role = (session?.user as { role?: "ADMIN" | "MEMBER" })?.role ?? "MEMBER";

  // Fields we need for the cards (avoids “property X doesn’t exist”)
  const selectFields =
    "_id title name description selectedFile coverUrl cover createdAt updatedAt";

  let projects: UIProject[] = [];

  if (role === "ADMIN") {
    const list = await ProjectContent.find({})
      .select(selectFields)
      .sort({ createdAt: -1 })
      .lean<DBProjectCard[]>();
    projects = list.map(toUI);
  } else if (userId) {
    const filter: FilterQuery<DBProjectCard> = {
      $or: [
        { creator: userId },
        { admins: userId },
        { managers: userId },
        { users: userId },
      ],
    };
    const list = await ProjectContent.find(filter)
      .select(selectFields)
      .sort({ createdAt: -1 })
      .lean<DBProjectCard[]>();
    projects = list.map(toUI);
  }

  return (
    <main className="min-h-[100dvh]">
      <div className="container-max py-6 space-y-6">
        <UserBar />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Projects</h1>
          <NewProjectModal action={createProjectAction as CreateProjectAction} />
        </div>

        <section id="projects">
          {projects.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <ProjectCard key={p.id} p={p} />
              ))}
            </div>
          ) : (
            <div className="card p-6 md:p-10 text-center">
              <h2 className="text-lg font-medium">No projects yet</h2>
              <p className="mt-1 text-sm opacity-70">
                Create your first project to get started.
              </p>
              <div className="mt-4">
                <NewProjectModal action={createProjectAction as CreateProjectAction} />
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
