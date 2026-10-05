export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center">
      <h3 className="font-semibold text-slate-800">{title}</h3>
      {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
    </div>
  );
}
