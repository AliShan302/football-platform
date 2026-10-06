"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { EventDetail, MatchSummary, TeamSummary } from "@/lib/api/types";
import { adminErrorMessage } from "@/lib/admin/client";
import { adminResources } from "@/lib/admin/resources";
import type { AdminRound, EventTeamAssignment, MatchInput } from "@/lib/admin/types";

type RoundEdit = { id?: number; name: string; order: string };
type MatchEdit = Partial<MatchInput> & { id?: number };

const emptyRound: RoundEdit = { name: "", order: "" };
const emptyMatch: MatchEdit = { venue: "" };

export function EventWorkspace({ eventId }: { eventId: number }) {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [assignments, setAssignments] = useState<EventTeamAssignment[]>([]);
  const [rounds, setRounds] = useState<AdminRound[]>([]);
  const [error, setError] = useState("");
  const [matchError, setMatchError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [roundEdit, setRoundEdit] = useState<RoundEdit>(emptyRound);
  const [matchEdit, setMatchEdit] = useState<MatchEdit>(emptyMatch);

  const load = useCallback(async () => {
    try {
      const [eventData, teamData, assignmentData, roundData] = await Promise.all([
        adminResources.event(eventId),
        adminResources.teams(),
        adminResources.assignments(eventId),
        adminResources.rounds(eventId),
      ]);
      setEvent(eventData);
      setTeams(teamData);
      setAssignments(assignmentData);
      setRounds(roundData);
    } catch (caught) {
      setError(adminErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const assignedIds = useMemo(() => new Set(assignments.map((item) => item.team.id)), [assignments]);
  const available = teams.filter((team) => !assignedIds.has(team.id));
  const selectedRound = rounds.find((round) => round.id === matchEdit.round);
  const occupiedTeamIds = useMemo(() => {
    const occupied = new Set<number>();
    selectedRound?.matches
      .filter((match) => match.id !== matchEdit.id)
      .forEach((match) => {
        occupied.add(match.home_team.id);
        occupied.add(match.away_team.id);
      });
    return occupied;
  }, [matchEdit.id, selectedRound]);

  async function mutate(action: () => Promise<unknown>, onFailure: (message: string) => void = setError) {
    setPending(true);
    setError("");
    try {
      await action();
      await load();
      return true;
    } catch (caught) {
      onFailure(adminErrorMessage(caught));
      return false;
    } finally {
      setPending(false);
    }
  }

  async function assign(submission: FormEvent<HTMLFormElement>) {
    submission.preventDefault();
    const data = new FormData(submission.currentTarget);
    const team = Number(data.get("team"));
    if (team) await mutate(() => adminResources.assignTeam(eventId, team));
  }

  async function saveRound(submission: FormEvent) {
    submission.preventDefault();
    const order = Number(roundEdit.order);
    if (!Number.isInteger(order) || order < 0) {
      setError("Round order must be a whole number of zero or greater.");
      return;
    }
    const duplicate = rounds.some((round) => round.order === order && round.id !== roundEdit.id);
    if (duplicate) {
      setError(`Round order ${order} is already used in this event.`);
      return;
    }
    const payload = { event: eventId, name: roundEdit.name, order };
    const saved = await mutate(() => roundEdit.id ? adminResources.updateRound(roundEdit.id, payload) : adminResources.createRound(payload));
    if (saved) setRoundEdit(emptyRound);
  }

  function editMatch(match: MatchSummary) {
    setMatchError("");
    setMatchEdit({
      id: match.id,
      round: match.round_id,
      home_team: match.home_team.id,
      away_team: match.away_team.id,
      scheduled_at: match.scheduled_at.slice(0, 16),
      venue: match.venue,
    });
  }

  async function saveMatch(submission: FormEvent) {
    submission.preventDefault();
    setMatchError("");
    if (!matchEdit.round || !matchEdit.home_team || !matchEdit.away_team || !matchEdit.scheduled_at) {
      setMatchError("Select a round, both teams, and a scheduled time.");
      return;
    }
    if (matchEdit.home_team === matchEdit.away_team) {
      setMatchError("A team cannot play against itself. Select two different teams.");
      return;
    }
    const round = rounds.find((item) => item.id === matchEdit.round);
    if (!round) {
      setMatchError("The selected round is no longer available. Choose another round.");
      return;
    }
    const conflictingTeamId = [matchEdit.home_team, matchEdit.away_team].find((teamId) => occupiedTeamIds.has(teamId));
    if (conflictingTeamId) {
      const teamName = assignments.find(({ team }) => team.id === conflictingTeamId)?.team.name ?? "The selected team";
      setMatchError(`${teamName} already has a match in ${round.name}. A team cannot play twice in the same round.`);
      return;
    }
    const scheduledAt = new Date(matchEdit.scheduled_at);
    if (Number.isNaN(scheduledAt.getTime())) {
      setMatchError("Enter a valid scheduled date and time.");
      return;
    }
    const payload: MatchInput = {
      round: matchEdit.round,
      home_team: matchEdit.home_team,
      away_team: matchEdit.away_team,
      scheduled_at: scheduledAt.toISOString(),
      venue: matchEdit.venue ?? "",
    };
    const saved = await mutate(
      () => matchEdit.id ? adminResources.updateMatch(matchEdit.id, payload) : adminResources.createMatch(payload),
      setMatchError,
    );
    if (saved) setMatchEdit(emptyMatch);
  }

  function updateMatchEdit(values: Partial<MatchEdit>) {
    setMatchError("");
    setMatchEdit((current) => ({ ...current, ...values }));
  }

  if (loading) return <p role="status">Loading event workspace…</p>;
  if (!event) return <p role="alert">Unable to load this event.</p>;

  const cannotScheduleReason = !rounds.length
    ? "Add a round before scheduling a match."
    : assignments.length < 2
      ? "Assign at least two teams before scheduling a match."
      : selectedRound && assignments.filter(({ team }) => !occupiedTeamIds.has(team.id)).length < 2
        ? `Fewer than two teams are available in ${selectedRound.name}. Teams cannot play twice in the same round.`
      : "";

  return (
    <div className="admin-workspace space-y-10">
      <header className="page-heading">
        <p className="eyebrow">Event workspace</p>
        <h1>{event.name}</h1>
        <p>{event.start_date} — {event.end_date} · {event.status}</p>
        <Link className="text-action" href={`/admin/events/${eventId}/edit`}>Edit event details →</Link>
      </header>

      {error && <p role="alert" className="alert-error">{error}</p>}

      <section>
        <h2>Registered teams</h2>
        <p className="mt-1 text-sm text-slate-500">Only teams assigned to this event can be scheduled.</p>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={assign}>
          <label className="sr-only" htmlFor="available-team">Available team</label>
          <select className="form-control sm:max-w-sm" id="available-team" name="team" disabled={pending || !available.length} required>
            <option value="">Select available team</option>
            {available.map((team) => <option value={team.id} key={team.id}>{team.name} ({team.code})</option>)}
          </select>
          <button className="button-primary" disabled={pending || !available.length}>Assign team</button>
        </form>
        {!available.length && <p className="mt-2 text-sm text-slate-500">All available teams are already assigned.</p>}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {assignments.map((assignment) => (
            <div className="card flex items-center gap-3 p-4" key={assignment.id}>
              <span className="flex-1 font-bold">{assignment.team.name} ({assignment.team.code})</span>
              <button className="text-sm font-bold text-red-700" disabled={pending} onClick={() => {
                if (window.confirm(`Remove ${assignment.team.name} from this event? Referenced assignments cannot be removed.`)) void mutate(() => adminResources.removeAssignment(assignment.id));
              }}>Remove</button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Rounds &amp; matches</h2>
        <p className="mt-1 text-sm text-slate-500">Each team can appear only once within a round.</p>
        <form className="card mt-4 grid gap-3 p-4 sm:grid-cols-[1fr_8rem_auto]" onSubmit={saveRound}>
          <label className="field-label">Name<input className="form-control mt-1" value={roundEdit.name} onChange={(e) => setRoundEdit({ ...roundEdit, name: e.target.value })} required /></label>
          <label className="field-label">Order<input className="form-control mt-1" type="number" min="0" value={roundEdit.order} onChange={(e) => setRoundEdit({ ...roundEdit, order: e.target.value })} required /></label>
          <button className="button-primary self-end" disabled={pending}>{roundEdit.id ? "Update" : "Add round"}</button>
        </form>
        <div className="mt-4 space-y-4">
          {rounds.map((round) => (
            <article className="card p-5" key={round.id}>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="flex-1 text-lg font-black">{round.order}. {round.name}</h3>
                <button className="font-bold text-slate-700" onClick={() => setRoundEdit({ id: round.id, name: round.name, order: String(round.order) })}>Edit</button>
                <button className="font-bold text-red-700" disabled={pending} onClick={() => {
                  if (window.confirm(`Delete ${round.name}? All matches in this round will also be deleted.`)) void mutate(() => adminResources.deleteRound(round.id));
                }}>Delete round</button>
              </div>
              <div className="mt-4 space-y-2">
                {round.matches.length ? round.matches.map((match) => (
                  <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3" key={match.id}>
                    <span className="min-w-0 flex-1 font-semibold">{match.home_team.name} vs {match.away_team.name} · {match.status}</span>
                    <Link className="font-bold text-emerald-700" href={`/admin/matches/${match.id}`}>Control</Link>
                    <button className="font-bold text-slate-700" disabled={match.status !== "scheduled"} onClick={() => editMatch(match)}>Edit</button>
                    <button className="font-bold text-red-700" disabled={pending} onClick={() => {
                      if (window.confirm("Delete this match?")) void mutate(() => adminResources.deleteMatch(match.id));
                    }}>Delete</button>
                  </div>
                )) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No matches scheduled in this round.</p>}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>{matchEdit.id ? "Edit scheduled match" : "Schedule match"}</h2>
        <p className="mt-1 text-sm text-slate-500">Choose two different available teams. Teams already used in the selected round are disabled.</p>
        {cannotScheduleReason && <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">{cannotScheduleReason}</p>}
        {matchError && <p role="alert" className="alert-error mt-4">{matchError}</p>}
        <form className="card mt-4 grid gap-4 p-5 md:grid-cols-2" onSubmit={saveMatch}>
          <label className="field-label">Round
            <select className="form-control mt-1" value={matchEdit.round ?? ""} onChange={(e) => updateMatchEdit({ round: Number(e.target.value) || undefined })} required>
              <option value="">Select round</option>
              {rounds.map((round) => <option value={round.id} key={round.id}>{round.name}</option>)}
            </select>
          </label>
          <label className="field-label">Scheduled time<input className="form-control mt-1" type="datetime-local" value={matchEdit.scheduled_at ?? ""} onChange={(e) => updateMatchEdit({ scheduled_at: e.target.value })} required /></label>
          <label className="field-label">Home team
            <select className="form-control mt-1" value={matchEdit.home_team ?? ""} onChange={(e) => updateMatchEdit({ home_team: Number(e.target.value) || undefined })} required>
              <option value="">Select team</option>
              {assignments.map(({ team }) => <option value={team.id} disabled={occupiedTeamIds.has(team.id)} key={team.id}>{team.name}{occupiedTeamIds.has(team.id) ? " — already scheduled" : ""}</option>)}
            </select>
          </label>
          <label className="field-label">Away team
            <select className="form-control mt-1" value={matchEdit.away_team ?? ""} onChange={(e) => updateMatchEdit({ away_team: Number(e.target.value) || undefined })} required>
              <option value="">Select team</option>
              {assignments.map(({ team }) => {
                const unavailable = team.id === matchEdit.home_team || occupiedTeamIds.has(team.id);
                return <option value={team.id} disabled={unavailable} key={team.id}>{team.name}{occupiedTeamIds.has(team.id) ? " — already scheduled" : ""}</option>;
              })}
            </select>
          </label>
          <label className="field-label md:col-span-2">Venue<input className="form-control mt-1" value={matchEdit.venue ?? ""} onChange={(e) => updateMatchEdit({ venue: e.target.value })} /></label>
          <div className="flex flex-wrap gap-3">
            <button className="button-primary" disabled={pending || Boolean(cannotScheduleReason)}>{pending ? "Saving…" : matchEdit.id ? "Update match" : "Create match"}</button>
            {matchEdit.id && <button type="button" className="button-secondary" onClick={() => { setMatchEdit(emptyMatch); setMatchError(""); }}>Cancel</button>}
          </div>
        </form>
      </section>
    </div>
  );
}
