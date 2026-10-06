"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { EventDetail, MatchSummary, TeamSummary } from "@/lib/api/types";
import { adminErrorMessage } from "@/lib/admin/client";
import { adminResources } from "@/lib/admin/resources";
import type { AdminRound, EventTeamAssignment, MatchInput } from "@/lib/admin/types";

export function EventWorkspace({ eventId }: { eventId: number }) {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [assignments, setAssignments] = useState<EventTeamAssignment[]>([]);
  const [rounds, setRounds] = useState<AdminRound[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [roundEdit, setRoundEdit] = useState<{ id?: number; name: string; order: string }>({ name: "", order: "" });
  const [matchEdit, setMatchEdit] = useState<Partial<MatchInput> & { id?: number }>({ venue: "" });

  const load = useCallback(async () => {
    try {
      const [eventData, teamData, assignmentData, roundData] = await Promise.all([
        adminResources.event(eventId), adminResources.teams(), adminResources.assignments(eventId), adminResources.rounds(eventId),
      ]);
      setEvent(eventData); setTeams(teamData); setAssignments(assignmentData); setRounds(roundData);
    } catch (caught) { setError(adminErrorMessage(caught)); }
    finally { setLoading(false); }
  }, [eventId]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const assignedIds = useMemo(() => new Set(assignments.map((item) => item.team.id)), [assignments]);
  const available = teams.filter((team) => !assignedIds.has(team.id));

  async function mutate(action: () => Promise<unknown>) {
    setPending(true); setError("");
    try { await action(); await load(); }
    catch (caught) { setError(adminErrorMessage(caught)); }
    finally { setPending(false); }
  }
  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const team = Number(data.get("team"));
    if (team) await mutate(() => adminResources.assignTeam(eventId, team));
  }
  async function saveRound(event: FormEvent) {
    event.preventDefault();
    const payload = { event: eventId, name: roundEdit.name, order: Number(roundEdit.order) };
    await mutate(() => roundEdit.id ? adminResources.updateRound(roundEdit.id, payload) : adminResources.createRound(payload));
    setRoundEdit({ name: "", order: "" });
  }
  function editMatch(match: MatchSummary) {
    setMatchEdit({ id: match.id, round: match.round_id, home_team: match.home_team.id, away_team: match.away_team.id, scheduled_at: match.scheduled_at.slice(0, 16), venue: match.venue });
  }
  async function saveMatch(event: FormEvent) {
    event.preventDefault();
    if (!matchEdit.round || !matchEdit.home_team || !matchEdit.away_team || !matchEdit.scheduled_at) { setError("Complete all required match fields."); return; }
    if (matchEdit.home_team === matchEdit.away_team) { setError("Home and away teams must be different."); return; }
    const payload: MatchInput = { round: matchEdit.round, home_team: matchEdit.home_team, away_team: matchEdit.away_team, scheduled_at: new Date(matchEdit.scheduled_at).toISOString(), venue: matchEdit.venue ?? "" };
    await mutate(() => matchEdit.id ? adminResources.updateMatch(matchEdit.id, payload) : adminResources.createMatch(payload));
    setMatchEdit({ venue: "" });
  }
  if (loading) return <p role="status">Loading event workspace…</p>;
  if (!event) return <p role="alert">Unable to load this event.</p>;
  return (
    <div className="space-y-12">
      <header className="page-heading"><p className="eyebrow">Event workspace</p><h1>{event.name}</h1><p>{event.start_date} — {event.end_date} · {event.status}</p><Link className="font-bold text-emerald-700" href={`/admin/events/${eventId}/edit`}>Edit event details →</Link></header>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
      <section><h2 className="text-2xl font-black">Registered teams</h2><form className="mt-4 flex flex-wrap gap-3" onSubmit={assign}><label className="sr-only" htmlFor="available-team">Available team</label><select className="min-w-60 rounded-xl border p-3" id="available-team" name="team" disabled={pending || !available.length} required><option value="">Select available team</option>{available.map((team) => <option value={team.id} key={team.id}>{team.name} ({team.code})</option>)}</select><button className="button-primary" disabled={pending || !available.length}>Assign team</button></form><div className="mt-4 grid gap-3 md:grid-cols-2">{assignments.map((assignment) => <div className="card flex items-center gap-3 p-4" key={assignment.id}><span className="flex-1 font-bold">{assignment.team.name} ({assignment.team.code})</span><button className="text-sm font-bold text-red-700" disabled={pending} onClick={() => { if (window.confirm(`Remove ${assignment.team.name} from this event? Referenced assignments cannot be removed.`)) void mutate(() => adminResources.removeAssignment(assignment.id)); }}>Remove</button></div>)}</div></section>
      <section><h2 className="text-2xl font-black">Rounds</h2><form className="card mt-4 grid gap-3 p-4 sm:grid-cols-[1fr_8rem_auto]" onSubmit={saveRound}><label className="font-bold">Name<input className="mt-1 w-full rounded-lg border p-2 font-normal" value={roundEdit.name} onChange={(e) => setRoundEdit({ ...roundEdit, name: e.target.value })} required /></label><label className="font-bold">Order<input className="mt-1 w-full rounded-lg border p-2 font-normal" type="number" min="0" value={roundEdit.order} onChange={(e) => setRoundEdit({ ...roundEdit, order: e.target.value })} required /></label><button className="button-primary self-end" disabled={pending}>{roundEdit.id ? "Update" : "Add round"}</button></form><div className="mt-4 space-y-4">{rounds.map((round) => <article className="card p-5" key={round.id}><div className="flex flex-wrap items-center gap-3"><h3 className="flex-1 text-lg font-black">{round.order}. {round.name}</h3><button className="font-bold text-slate-700" onClick={() => setRoundEdit({ id: round.id, name: round.name, order: String(round.order) })}>Edit</button><button className="font-bold text-red-700" disabled={pending} onClick={() => { if (window.confirm(`Delete ${round.name}? All matches in this round will also be deleted.`)) void mutate(() => adminResources.deleteRound(round.id)); }}>Delete round</button></div><div className="mt-4 space-y-2">{round.matches.map((match) => <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3" key={match.id}><span className="flex-1 font-semibold">{match.home_team.code} vs {match.away_team.code} · {match.status}</span><Link className="font-bold text-emerald-700" href={`/admin/matches/${match.id}`}>Control</Link><button className="font-bold text-slate-700" disabled={match.status !== "scheduled"} onClick={() => editMatch(match)}>Edit</button><button className="font-bold text-red-700" disabled={pending} onClick={() => { if (window.confirm("Delete this match?")) void mutate(() => adminResources.deleteMatch(match.id)); }}>Delete</button></div>)}</div></article>)}</div></section>
      <section><h2 className="text-2xl font-black">{matchEdit.id ? "Edit scheduled match" : "Schedule match"}</h2><form className="card mt-4 grid gap-4 p-5 md:grid-cols-2" onSubmit={saveMatch}><label className="font-bold">Round<select className="mt-1 w-full rounded-lg border p-3 font-normal" value={matchEdit.round ?? ""} onChange={(e) => setMatchEdit({ ...matchEdit, round: Number(e.target.value) })} required><option value="">Select round</option>{rounds.map((round) => <option value={round.id} key={round.id}>{round.name}</option>)}</select></label><label className="font-bold">Scheduled time<input className="mt-1 w-full rounded-lg border p-3 font-normal" type="datetime-local" value={matchEdit.scheduled_at ?? ""} onChange={(e) => setMatchEdit({ ...matchEdit, scheduled_at: e.target.value })} required /></label><label className="font-bold">Home team<select className="mt-1 w-full rounded-lg border p-3 font-normal" value={matchEdit.home_team ?? ""} onChange={(e) => setMatchEdit({ ...matchEdit, home_team: Number(e.target.value) })} required><option value="">Select team</option>{assignments.map(({ team }) => <option value={team.id} key={team.id}>{team.name}</option>)}</select></label><label className="font-bold">Away team<select className="mt-1 w-full rounded-lg border p-3 font-normal" value={matchEdit.away_team ?? ""} onChange={(e) => setMatchEdit({ ...matchEdit, away_team: Number(e.target.value) })} required><option value="">Select team</option>{assignments.map(({ team }) => <option value={team.id} disabled={team.id === matchEdit.home_team} key={team.id}>{team.name}</option>)}</select></label><label className="font-bold md:col-span-2">Venue<input className="mt-1 w-full rounded-lg border p-3 font-normal" value={matchEdit.venue ?? ""} onChange={(e) => setMatchEdit({ ...matchEdit, venue: e.target.value })} /></label><div className="flex gap-3"><button className="button-primary" disabled={pending}>{pending ? "Saving…" : matchEdit.id ? "Update match" : "Create match"}</button>{matchEdit.id && <button type="button" className="rounded-lg border px-4 font-bold" onClick={() => setMatchEdit({ venue: "" })}>Cancel</button>}</div></form></section>
    </div>
  );
}
