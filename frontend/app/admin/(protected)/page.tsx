import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="page-shell"><header className="page-heading"><p className="eyebrow">Operations</p><h1>Admin dashboard</h1><p>Create tournament data and operate live matches through the same backend services used by simulation.</p></header>
      <div className="grid gap-5 md:grid-cols-2"><Link className="card p-6 hover:border-emerald-300" href="/admin/events"><h2 className="text-xl font-black">Manage events</h2><p className="mt-2 text-slate-600">Assignments, rounds, fixtures, and match controls.</p></Link><Link className="card p-6 hover:border-emerald-300" href="/admin/teams"><h2 className="text-xl font-black">Manage teams</h2><p className="mt-2 text-slate-600">Create and maintain reusable football teams.</p></Link></div>
    </div>
  );
}
