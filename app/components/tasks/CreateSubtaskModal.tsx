"use client";

import { useState, useTransition } from "react";
import { createSubTaskAction } from "@/app/tasks/[id]/actions";
import type { SafeSubTask } from "@/app/tasks/[id]/actions";

interface Props {
  taskId: string;
  onCreated?: (subtask: SafeSubTask) => void;
}

export default function CreateSubtaskModal({ taskId, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setTitle("");
    setDescription("");
    setErr(null);
  };

  const handleSubmit = () => {
    const fd = new FormData();
    fd.set("title", title);
    fd.set("description", description);

    setErr(null);

    startTransition(async () => {
      const res = await createSubTaskAction(taskId, fd);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      // Optimistic: notify parent to append, reset and close
      onCreated?.(res.subtask);
      reset();
      setOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
      >
        + New subtask
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          aria-modal="true"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-xl border bg-white p-4 shadow-lg">
            <div className="mb-3">
              <h3 className="text-base font-semibold">Create subtask</h3>
              <p className="text-xs text-gray-600">
                Give it a clear title and (optionally) a short description.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Title</label>
                <input
                  type="text"
                  className="h-9 w-full rounded-md border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Wire up API for comments"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Description</label>
                <textarea
                  className="min-h-[84px] w-full rounded-md border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details…"
                />
              </div>

              {err && <p className="text-sm text-rose-700">{err}</p>}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  reset();
                  setOpen(false);
                }}
                className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || title.trim().length === 0}
                onClick={handleSubmit}
                className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
              >
                {isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
