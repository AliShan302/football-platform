"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TeamSummary } from "@/lib/api/types";
import { adminErrorMessage } from "@/lib/admin/client";
import { adminResources } from "@/lib/admin/resources";

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamSummary[]>([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const load = () => adminResources.teams().then(setTeams).catch((caught) => setError(adminErrorMessage(caught))).finally(() => setLoading(false));
  useEffect(() => { void load(); }, []);
  async function remove(team: TeamSummary) { if (!window.confirm(`Delete ${team.name}?`)) return; try { await adminResources.deleteTeam(team.id); await load(); } catch (caught) { setError(adminErrorMessage(caught)); } }
  return <div className="page-shell"><header className="section-heading"><div><p className="eyebrow">Administration</p><h1>Teams</h1></div><Link className="button-primary" href="/admin/teams/new">New team</Link></header>{error && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}{loading ? <p role="status">Loading teams…</p> : <div className="grid gap-4 md:grid-cols-2">{teams.map((team) => <article className="card flex items-center gap-4 p-5" key={team.id}><div className="grid size-11 place-items-center rounded-full bg-emerald-100 font-black">{team.code}</div><div className="flex-1"><h2 className="font-black">{team.name}</h2><p className="text-sm text-slate-500">{team.code}</p></div><Link className="font-bold text-slate-700" href={`/admin/teams/${team.id}/edit`}>Edit</Link><button className="font-bold text-red-700" onClick={() => void remove(team)}>Delete</button></article>)}</div>}</div>;
}
