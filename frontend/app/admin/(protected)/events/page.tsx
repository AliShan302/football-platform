"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { EventSummary } from "@/lib/api/types";
import { adminErrorMessage } from "@/lib/admin/client";
import { adminResources } from "@/lib/admin/resources";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventSummary[]>([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const load = () => adminResources.events().then(setEvents).catch((caught) => setError(adminErrorMessage(caught))).finally(() => setLoading(false));
  useEffect(() => { void load(); }, []);
  async function remove(item: EventSummary) { if (!window.confirm(`Delete ${item.name}? Its rounds and matches will also be deleted.`)) return; try { await adminResources.deleteEvent(item.id); await load(); } catch (caught) { setError(adminErrorMessage(caught)); } }
  return <div className="page-shell"><header className="section-heading"><div><p className="eyebrow">Administration</p><h1>Events</h1></div><Link className="button-primary" href="/admin/events/new">New event</Link></header>{error && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}{loading ? <p role="status">Loading events…</p> : <div className="space-y-3">{events.map((item) => <article className="card flex flex-wrap items-center gap-3 p-5" key={item.id}><div className="min-w-0 flex-1"><h2 className="font-black">{item.name}</h2><p className="text-sm text-slate-500">{item.start_date} — {item.end_date} · {item.status}</p></div><Link className="font-bold text-emerald-700" href={`/admin/events/${item.id}`}>Manage</Link><Link className="font-bold text-slate-700" href={`/admin/events/${item.id}/edit`}>Edit</Link><button className="font-bold text-red-700" onClick={() => void remove(item)}>Delete</button></article>)}</div>}</div>;
}
