export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="h-6 w-52 rounded bg-zinc-200" />
          <div className="mt-2 h-3.5 w-40 rounded bg-zinc-100" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-56 rounded-lg bg-zinc-100" />
          <div className="h-9 w-24 rounded-lg bg-zinc-100" />
          <div className="h-9 w-24 rounded-lg bg-zinc-100" />
          <div className="h-9 w-24 rounded-lg bg-zinc-100" />
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-200">
        <div className="h-10 border-b border-zinc-200 bg-zinc-50" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 border-b border-zinc-100 px-4 py-3.5 last:border-0">
            <div className="h-4 w-32 rounded bg-zinc-100" />
            <div className="h-4 w-16 rounded bg-zinc-100" />
            <div className="h-4 flex-1 rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
