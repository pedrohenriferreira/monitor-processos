export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse">
      <div className="h-6 w-40 rounded bg-zinc-200" />
      <div className="mt-2 h-3.5 w-96 rounded bg-zinc-100" />
      <div className="mt-6 h-4 w-32 rounded bg-zinc-200" />
      <div className="mt-3 max-w-[680px] overflow-hidden rounded-xl border border-zinc-200">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-0">
            <div className="h-2 w-2 rounded-full bg-zinc-200" />
            <div className="h-4 flex-1 rounded bg-zinc-100" />
            <div className="h-3 w-14 rounded bg-zinc-100" />
          </div>
        ))}
      </div>
      <div className="mt-8 h-4 w-40 rounded bg-zinc-200" />
      <div className="mt-3 h-40 max-w-[600px] rounded-xl border border-zinc-200 bg-zinc-50" />
    </div>
  );
}
