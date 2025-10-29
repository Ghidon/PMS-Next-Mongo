"use client";
import React from "react";

type Props = { onCreate: (formData: FormData) => Promise<void> };
export default function TaskCreateForm({ onCreate }: Props) {
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold">Create a new task</h3>
      <form action={onCreate} className="max-w-xl space-y-3 rounded-xl border p-4">
        <div className="space-y-1">
          <label className="block text-sm">Title *</label>
          <input name="title" required placeholder="e.g. Design homepage" className="w-full rounded border px-3 py-2" />
        </div>
        <div className="space-y-1">
          <label className="block text-sm">Description</label>
          <textarea name="description" placeholder="Optional details" className="min-h-24 w-full rounded border px-3 py-2" />
        </div>
        <button className="rounded-xl border px-4 py-2 hover:bg-gray-50">Create task</button>
      </form>
    </section>
  );
}
