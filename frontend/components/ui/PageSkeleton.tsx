export function PageSkeleton() {
  return <div className="page-shell animate-pulse" aria-label="Loading page"><div className="h-3 w-28 rounded bg-emerald-200" /><div className="mt-4 h-10 max-w-xl rounded bg-slate-200" /><div className="mt-10 grid gap-5 md:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-48 rounded-2xl border border-slate-200 bg-white" />)}</div></div>;
}
