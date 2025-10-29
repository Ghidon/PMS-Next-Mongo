"use client";

import React, { useRef, useState } from "react";
import TaskCreateForm from "./TaskCreateForm";

export default function NewTaskModalButton({
  onCreate,
}: {
  onCreate: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErr(null);
          setOpen(true);
        }}
        className="w-full rounded-xl bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black"
      >
        New Task
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-xl rounded-2xl border bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Create a new task</h3>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 hover:bg-gray-100"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
            </div>

            {err ? (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {err}
              </div>
            ) : null}

            <TaskCreateForm
              onCreate={async (fd) => {
                try {
                  setErr(null);
                  await onCreate(fd);
                  setOpen(false);
                } catch (e) {
                  // Friendly message, don’t crash the app
                  setErr(
                    e instanceof Error ? e.message : "Could not create the task."
                  );
                }
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
