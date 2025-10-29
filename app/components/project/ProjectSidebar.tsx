import React from "react";
import { formatDate } from "@/lib/format";

export function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white">
      <div className="border-b px-4 py-3 font-medium">{title}</div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

export function Metadata({
  id,
  status = "Active",
  createdAt,
  updatedAt,
  visibility = "Private",
}: {
  id: string;
  status?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  visibility?: string;
}) {
  return (
    <SidebarCard title="Metadata">
      <div className="space-y-2 text-sm">
        <MetaRow label="Project ID" value={id} />
        <MetaRow label="Status" value={status ?? "—"} />
        {/* You can hide Created/Updated here to avoid duplication */}
        {createdAt ? <MetaRow label="Created" value={formatDate(createdAt)} /> : null}
        {updatedAt ? <MetaRow label="Updated" value={formatDate(updatedAt)} /> : null}
        <MetaRow label="Visibility" value={visibility} />
      </div>
    </SidebarCard>
  );
}

export function Notes() {
  return (
    <SidebarCard title="Notes">
      <textarea
        placeholder="Scratchpad…"
        className="min-h-[120px] w-full rounded-lg border px-3 py-2"
      />
      <div className="mt-2 flex justify-end">
        <button className="rounded-xl bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-black">
          Save
        </button>
      </div>
    </SidebarCard>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="truncate text-sm font-medium">{value}</div>
    </div>
  );
}
