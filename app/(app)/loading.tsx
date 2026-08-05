export default function Loading() {
  return (
    <div className="animate-fade-slide-in space-y-4">
      <div className="h-6 w-40 animate-pulse rounded-md bg-slate-200/70" />
      <div className="h-40 animate-pulse rounded-2xl border border-[var(--line)] bg-white shadow-sm" />
    </div>
  );
}
