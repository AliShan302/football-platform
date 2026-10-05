import type { MatchSummary } from "@/lib/api/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TeamIdentity } from "./TeamIdentity";

export function Scoreboard({ match }: { match: MatchSummary }) {
  return (
    <section className="overflow-hidden rounded-3xl bg-[#071b18] p-6 text-white shadow-xl sm:p-10" aria-label="Match scoreboard">
      <div className="mb-8 flex justify-center"><StatusBadge status={match.status} /></div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-10">
        <div className="[&_strong]:text-white [&_span]:text-emerald-200"><TeamIdentity team={match.home_team} /></div>
        <div className="text-center">
          <div className="text-4xl font-black tracking-tight tabular-nums sm:text-6xl">{match.home_score} <span className="text-emerald-400">–</span> {match.away_score}</div>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.25em] text-emerald-200">Score</p>
        </div>
        <div className="[&_strong]:text-white [&_span]:text-emerald-200"><TeamIdentity team={match.away_team} align="right" /></div>
      </div>
    </section>
  );
}
