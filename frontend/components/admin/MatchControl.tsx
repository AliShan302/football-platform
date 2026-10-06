"use client";

import { FormEvent, useState } from "react";
import { ConnectionStatus } from "@/components/realtime/ConnectionStatus";
import { MatchTimeline } from "@/components/matches/MatchTimeline";
import { Scoreboard } from "@/components/matches/Scoreboard";
import { useRealtimeMatch } from "@/hooks/useRealtimeMatch";
import type { MatchDetail } from "@/lib/api/types";
import { adminErrorMessage } from "@/lib/admin/client";
import { adminResources } from "@/lib/admin/resources";
import { formatDateTime } from "@/lib/format";

type EventKind = "goal" | "yellow_card" | "red_card" | "penalty_kick" | "reward";

const labels: Record<EventKind, string> = {
  goal: "Goal",
  yellow_card: "Yellow card",
  red_card: "Red card",
  penalty_kick: "Penalty kick",
  reward: "Reward",
};

export function MatchControl({ initialMatch }: { initialMatch: MatchDetail }) {
  const { match, connectionStatus, applyActionMatch, applyActionEvent } = useRealtimeMatch(initialMatch);
  const [kind, setKind] = useState<EventKind>("goal");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function lifecycle(action: "start" | "finish") {
    setPending(true); setError(""); setSuccess("");
    try {
      const snapshot = action === "start" ? await adminResources.startMatch(match.id) : await adminResources.finishMatch(match.id);
      applyActionMatch(snapshot); setSuccess(action === "start" ? "Match started." : "Match finished.");
    } catch (caught) { setError(adminErrorMessage(caught)); }
    finally { setPending(false); }
  }
  async function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setSuccess("");
    const form = event.currentTarget; const data = new FormData(form);
    const base = { team_id: Number(data.get("team_id")), minute: Number(data.get("minute")), note: String(data.get("note") ?? "") };
    try {
      const response = kind === "goal"
        ? await adminResources.addGoal(match.id, { ...base, player_name: String(data.get("player_name") ?? "") })
        : kind === "reward"
          ? await adminResources.addReward(match.id, { ...base, points: Number(data.get("points")) })
          : await adminResources.addPenalty(match.id, { ...base, penalty_type: kind, player_name: String(data.get("player_name") ?? "") });
      applyActionEvent(response.event, response.match); setSuccess(`${labels[kind]} recorded.`); form.reset();
    } catch (caught) { setError(adminErrorMessage(caught)); }
    finally { setPending(false); }
  }
  return (
    <div className="admin-match-control space-y-8">
      <div className="flex justify-end">{match.status !== "finished" && <ConnectionStatus status={connectionStatus} />}</div>
      <Scoreboard match={match} />
      <dl className="grid gap-3 sm:grid-cols-2"><div className="card p-4"><dt className="text-xs font-bold uppercase text-slate-400">Scheduled</dt><dd className="mt-2 font-semibold">{formatDateTime(match.scheduled_at)}</dd></div><div className="card p-4"><dt className="text-xs font-bold uppercase text-slate-400">Venue</dt><dd className="mt-2 font-semibold">{match.venue || "To be confirmed"}</dd></div></dl>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}{success && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-emerald-800">{success}</p>}
      {match.status === "scheduled" && <button className="button-primary" disabled={pending} onClick={() => void lifecycle("start")}>{pending ? "Starting…" : "Start match"}</button>}
      {match.status === "live" && <section className="card p-6"><h2 className="text-2xl font-black">Match actions</h2><div className="mt-4 flex flex-wrap gap-2">{(Object.keys(labels) as EventKind[]).map((value) => <button type="button" key={value} onClick={() => setKind(value)} className={`rounded-lg border px-3 py-2 text-sm font-bold ${kind === value ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-slate-300"}`}>Add {labels[value]}</button>)}</div><form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={addEvent}><label className="font-bold">Team<select name="team_id" required className="mt-1 w-full rounded-lg border p-3 font-normal"><option value={match.home_team.id}>{match.home_team.name}</option><option value={match.away_team.id}>{match.away_team.name}</option></select></label><label className="font-bold">Minute<input name="minute" type="number" min="0" required className="mt-1 w-full rounded-lg border p-3 font-normal" /></label>{kind !== "reward" && <label className="font-bold">Player name<input name="player_name" className="mt-1 w-full rounded-lg border p-3 font-normal" /></label>}{kind === "reward" && <label className="font-bold">Points<input name="points" type="number" required className="mt-1 w-full rounded-lg border p-3 font-normal" /></label>}<label className="font-bold md:col-span-2">Note<textarea name="note" className="mt-1 w-full rounded-lg border p-3 font-normal" /></label><button className="button-primary" disabled={pending}>{pending ? "Saving…" : `Add ${labels[kind]}`}</button></form><button className="mt-6 rounded-lg bg-red-700 px-4 py-3 font-bold text-white" disabled={pending} onClick={() => { if (window.confirm("Finish this match? This cannot be reversed.")) void lifecycle("finish"); }}>{pending ? "Working…" : "Finish match"}</button></section>}
      {match.status === "finished" && <p className="rounded-xl bg-slate-100 p-4 font-semibold">This match is finished. Controls are read-only.</p>}
      <section><p className="eyebrow">Match log</p><h2 className="mb-5 text-2xl font-black">Timeline</h2><MatchTimeline events={match.match_events} /></section>
    </div>
  );
}
