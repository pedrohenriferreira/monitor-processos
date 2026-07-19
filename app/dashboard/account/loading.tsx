export default function Loading() {
  return (
    <div className="mx-auto max-w-lg animate-pulse">
      <div className="h-6 w-36 rounded bg-zinc-200" />
      <div className="mt-5 rounded-xl border border-zinc-200 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-zinc-200" />
          <div>
            <div className="h-4 w-32 rounded bg-zinc-200" />
            <div className="mt-2 h-3 w-40 rounded bg-zinc-100" />
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-zinc-100 pt-3.5">
          <div className="h-4 w-full rounded bg-zinc-100" />
          <div className="h-4 w-full rounded bg-zinc-100" />
        </div>
        <div className="mt-5 h-9 w-full rounded-lg bg-zinc-100" />
      </div>
    </div>
  );
}
