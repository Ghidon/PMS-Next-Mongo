export default function LoadingProject() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-6">
      <div className="mb-4 h-4 w-24 animate-pulse rounded bg-gray-200" />
      <div className="h-48 w-full animate-pulse rounded-2xl bg-gray-200" />
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="h-6 w-64 animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-gray-200" />
          <div className="h-64 w-full animate-pulse rounded-2xl bg-gray-200" />
        </div>
        <aside className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded-xl bg-gray-200" />
          <div className="h-40 w-full animate-pulse rounded-2xl bg-gray-200" />
        </aside>
      </div>
    </div>
  );
}
