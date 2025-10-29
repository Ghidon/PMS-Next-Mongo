"use client";

import React, { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type DueKey = "all" | "overdue" | "week" | "none";
type LayoutKey = "grouped" | "list";

// Display labels
type Status = "Open" | "To do" | "In progress" | "Blocked" | "Done";
// URL param can also be "all"
type StatusParam = Status | "all";

const STATUS_OPTIONS = [
  "Open",
  "To do",
  "In progress",
  "Blocked",
  "Done",
] as const satisfies Readonly<Status[]>;

const DUE_OPTIONS: { key: DueKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "week", label: "Due this week" },
  { key: "none", label: "No due date" },
];

const LAYOUT_OPTIONS: { key: LayoutKey; label: string }[] = [
  { key: "grouped", label: "Grouped" },
  { key: "list", label: "List" },
];

export default function TaskFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const values = useMemo(() => {
    const get = (k: string) => search.get(k) ?? undefined;
    // 🔹 Default to "Open" when no status param present
    const status = ((get("status") as StatusParam | undefined) ??
      "Open") as StatusParam;
    const assignee = get("assignee") ?? "all";
    const due = (get("due") as DueKey) ?? "all";
    const q = get("q") ?? "";
    const layout = (get("layout") as LayoutKey) ?? "grouped";
    return { status, assignee, due, q, layout };
  }, [search]);

  function pushParams(sp: URLSearchParams) {
    sp.set("tab", "tasks");
    startTransition(() => router.replace(`${pathname}?${sp.toString()}`));
  }

  function setParam(key: string, value: string | null) {
    const sp = new URLSearchParams(search.toString());
    if (value && value.length > 0) sp.set(key, value);
    else sp.delete(key);
    pushParams(sp);
  }

  function clearAll() {
    // 🔹 Reset to defaults: Tasks tab with status=Open
    const sp = new URLSearchParams();
    sp.set("tab", "tasks");
    sp.set("status", "Open");
    startTransition(() => router.replace(`${pathname}?${sp.toString()}`));
  }

  const [draft, setDraft] = useState(values.q);
  React.useEffect(() => setDraft(values.q), [values.q]);

  // Debounced text search
  React.useEffect(() => {
    const id = window.setTimeout(() => {
      const v = draft.trim();
      const sp = new URLSearchParams(search.toString());
      if (v.length > 0) sp.set("q", v);
      else sp.delete("q");
      pushParams(sp);
    }, 350);
    return () => window.clearTimeout(id);
  }, [draft, pathname, router, search]);

  return (
    <div className="relative border-b px-4 py-3">
      {/* CLEAR ALL — top-right */}
      <div className="absolute right-4 top-3">
        <button
          type="button"
          onClick={clearAll}
          className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
          title="Clear all filters"
          aria-label="Clear all filters"
        >
          Clear all
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Status */}
        <div className="flex flex-wrap items-center gap-1">
          <Label>Status</Label>

          {/* All chip (no status restriction) */}
          <Chip
            active={values.status === "all"}
            onClick={() => setParam("status", "all")}
          >
            All
          </Chip>

          {/* Ordered status options */}
          {STATUS_OPTIONS.map((s) => (
            <Chip
              key={s}
              active={values.status === s}
              onClick={() => setParam("status", s)}
            >
              {s}
            </Chip>
          ))}
        </div>

        {/* Assignee */}
        <div className="ml-2 flex flex-wrap items-center gap-1">
          <Label>Assignee</Label>
          <Chip
            active={values.assignee === "all"}
            onClick={() => setParam("assignee", null)}
          >
            Anyone
          </Chip>
          <Chip
            active={values.assignee === "me"}
            onClick={() => setParam("assignee", "me")}
          >
            Me
          </Chip>
          <Chip
            active={values.assignee === "unassigned"}
            onClick={() => setParam("assignee", "unassigned")}
          >
            Unassigned
          </Chip>
        </div>

        {/* Due */}
        <div className="ml-2 flex flex-wrap items-center gap-1">
          <Label>Due</Label>
          {DUE_OPTIONS.map((opt) => (
            <Chip
              key={opt.key}
              active={values.due === opt.key}
              onClick={() =>
                setParam("due", opt.key === "all" ? null : opt.key)
              }
            >
              {opt.label}
            </Chip>
          ))}
        </div>

        {/* Right-side controls (search + layout) */}
        <div className="ml-auto flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <input
              type="search"
              placeholder="Search tasks…"
              value={draft}
              onChange={(e) => setDraft(e.currentTarget.value)}
              className="h-9 w-[200px] rounded-lg border px-3 text-sm"
              aria-label="Search tasks"
            />
            {isPending && (
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                <Spinner />
              </div>
            )}
          </div>

          {/* Layout */}
          <div className="flex items-center gap-1">
            <Label>Layout</Label>
            {LAYOUT_OPTIONS.map((opt) => (
              <Chip
                key={opt.key}
                active={values.layout === opt.key}
                onClick={() =>
                  setParam("layout", opt.key === "grouped" ? "" : opt.key)
                }
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "cursor-pointer rounded-full px-2 py-1 text-xs transition-colors",
        active ? "bg-gray-900 text-white" : "border hover:bg-gray-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-gray-600">{children}</span>;
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-blue-800"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
      />
    </svg>
  );
}
