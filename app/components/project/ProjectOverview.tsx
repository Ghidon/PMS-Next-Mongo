import React from "react";

export function Stat({
  label,
  value,
  sub,
  children,
}: {
  label: string;
  value: string | number;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {children}
      {sub ? <div className="mt-1 text-xs text-gray-500">{sub}</div> : null}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div className="h-full rounded-full bg-gray-900" style={{ width: `${value}%` }} />
    </div>
  );
}

export function Milestone({
  title,
  date,
  progress,
}: {
  title: string;
  date: string;
  progress: number;
}) {
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">{title}</div>
        <div className="text-xs text-gray-500">{date}</div>
      </div>
      <ProgressBar value={progress} />
    </div>
  );
}
