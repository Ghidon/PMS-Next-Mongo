import React from "react";
import { formatDate } from "@/lib/format";

type Props = {
  id: string;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  status?: string | null;
};

export default function ProjectHeader({
  id,
  title,
  name,
  description,
  createdAt,
  updatedAt,
  status = "Active",
}: Props) {
  const displayTitle = title || name || "Untitled Project";
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">{displayTitle}</h1>
      {description ? (
        <p className="max-w-3xl text-sm text-gray-700">{description}</p>
      ) : (
        <p className="text-sm italic text-gray-400">No description</p>
      )}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
        <span className="rounded-full border px-2 py-0.5 text-xs">{status}</span>
        <span>Updated {formatDate(updatedAt ?? createdAt)}</span>
        <span className="h-3 w-px bg-gray-300" />
        <span>Created {formatDate(createdAt)}</span>
        <span className="h-3 w-px bg-gray-300" />
        <span>ID: {id}</span>
      </div>
    </section>
  );
}
