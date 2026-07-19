export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse">
      <div className="h-6 w-48 rounded bg-zinc-200" />
      <div className="mt-2 h-3.5 w-80 rounded bg-zinc-100" />
      <div className="mt-5 h-52 max-w-[560px] rounded-xl border-2 border-dashed border-zinc-200" />
      <div className="mt-4 h-16 max-w-[560px] rounded-xl bg-zinc-100" />
    </div>
  );
}
