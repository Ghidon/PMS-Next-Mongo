// app/projects/NewProjectModal.tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

export type CreateProjectAction = (
  formData: FormData
) => Promise<{ ok?: boolean; id?: string } | void>;

export default function NewProjectModal({ action }: { action: CreateProjectAction }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Dropzone state
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function close() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus()); // return focus
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") close();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      try {
        const res = await action(fd);
        if (res && "ok" in res && res.ok === false) {
          setError("Could not create project.");
          return;
        }
        form.reset();
        setFileName("");
        close();
        router.refresh();
      } catch {
        setError("Could not create project.");
      }
    });
  }

  // Focus first field on open
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => firstInputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  // Drop handlers
  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && fileInputRef.current) {
      fileInputRef.current.files = files;
      setFileName(files[0].name);
    }
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function onDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  return (
    <>
      <button
        ref={triggerRef}
        className="btn btn-primary cursor-pointer"
        onClick={() => setOpen(true)}
      >
        New Project
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50"
            role="dialog"
            aria-modal="true"
            onKeyDown={onKeyDown}
          >
            {/* Backdrop (click to close) */}
            <button
              aria-label="Close"
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={close}
            />

            {/* Dialog */}
            <div className="relative z-10 grid min-h-full place-items-center p-4">
              <div
                className="card w-[92vw] max-w-xl p-6 md:p-8"
                style={{ animation: "modalIn 160ms ease-out" }}
              >
                <style>{`
                  @keyframes modalIn {
                    from { opacity: .0; transform: scale(.96); }
                    to   { opacity: 1;  transform: scale(1); }
                  }
                `}</style>

                <h2 className="text-lg font-semibold mb-4">Create project</h2>

                <form onSubmit={onSubmit} className="grid gap-5">
                  {/* Title */}
                  <div className="grid gap-1">
                    <label className="text-sm opacity-80">Title *</label>
                    <input
                      ref={firstInputRef}
                      name="title"
                      required
                      placeholder="e.g. Website Redesign"
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                    />
                  </div>

                  {/* Description */}
                  <div className="grid gap-1">
                    <label className="text-sm opacity-80">Description</label>
                    <textarea
                      name="description"
                      placeholder="What is this project about?"
                      className="w-full rounded-xl border px-3 py-2 text-sm min-h-24"
                    />
                  </div>

                  {/* Cover dropzone */}
                  <div className="grid gap-2">
                    <label className="text-sm opacity-80">Cover image (optional)</label>

                    <div
                      onDrop={onDrop}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      aria-describedby="cover-help"
                      className={[
                        "rounded-xl border px-4 py-6 text-sm text-center select-none cursor-pointer",
                        "transition-shadow",
                        isDragging ? "shadow-card ring-2" : "",
                      ].join(" ")}
                      style={{
                        borderColor: isDragging ? "rgb(var(--primary))" : "rgb(var(--border))",
                        outline: "1px dashed",
                        outlineColor: isDragging ? "rgb(var(--primary))" : "rgb(var(--border))",
                        outlineOffset: "4px",
                      }}
                    >
                      <div className="opacity-80">
                        <div className="font-medium">
                          {fileName ? `Selected: ${fileName}` : "Click to upload or drag & drop"}
                        </div>
                        <div id="cover-help" className="text-xs mt-1 opacity-70">
                          Accepts JPG or PNG. You can skip this now and add a cover later.
                        </div>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        name="cover"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.currentTarget.files?.[0];
                          setFileName(f ? f.name : "");
                        }}
                      />
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  {/* Actions: one Cancel only */}
                  <div className="flex items-center gap-3 pt-1">
                    <button type="submit" className="btn btn-primary cursor-pointer" disabled={pending}>
                      {pending ? "Creating…" : "Create project"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline cursor-pointer"
                      onClick={close}
                      disabled={pending}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
