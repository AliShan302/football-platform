import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="page-shell"><header className="page-heading"><p className="eyebrow">Operations</p><h1>Admin dashboard</h1><p>Create tournament data and operate live matches through the same backend services used by simulation.</p></header>
      <div className="grid gap-5 md:grid-cols-2"><Link className="card p-6 hover:border-emerald-300 hover:shadow-md" href="/admin/events"><p className="eyebrow">Competitions</p><h2 className="mt-2 text-xl font-black">Manage events</h2><p className="mt-2 text-slate-600">Assignments, rounds, fixtures, and match controls.</p><span className="text-action mt-3">Open events →</span></Link><Link className="card p-6 hover:border-emerald-300 hover:shadow-md" href="/admin/teams"><p className="eyebrow">Participants</p><h2 className="mt-2 text-xl font-black">Manage teams</h2><p className="mt-2 text-slate-600">Create and maintain reusable football teams.</p><span className="text-action mt-3">Open teams →</span></Link></div>
      <section className="section-card mt-8"><p className="eyebrow">Recommended workflow</p><h2 className="mt-2 text-xl font-black">From setup to live scoring</h2><ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{["Create an event", "Create teams", "Assign teams", "Add rounds", "Schedule matches", "Control live match"].map((step, index) => <li className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold" key={step}><span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-800">{index + 1}</span>{step}</li>)}</ol></section>
    </div>
  );
}
