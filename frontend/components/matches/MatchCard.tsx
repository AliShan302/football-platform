import Link from "next/link";
import type { MatchSummary } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TeamIdentity } from "./TeamIdentity";

export function MatchCard({ match }: { match: MatchSummary }) {
  const showScore = match.status !== "scheduled";
  return (
    <article className="card p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <StatusBadge status={match.status} />
        <span className="text-xs text-slate-500">{formatDateTime(match.scheduled_at)}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamIdentity team={match.home_team} />
        <div className="rounded-xl bg-slate-950 px-3 py-2 text-center text-xl font-black tabular-nums text-white">
          {showScore ? `${match.home_score} – ${match.away_score}` : "vs"}
        </div>
        <TeamIdentity team={match.away_team} align="right" />
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
        <span className="truncate text-slate-500">{match.venue || "Venue TBC"}</span>
        <Link className="font-bold text-emerald-700 hover:text-emerald-900" href={`/matches/${match.id}`}>Match details →</Link>
      </div>
    </article>
  );
}
