import type { MatchSummary } from "@/lib/api/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TeamIdentity } from "./TeamIdentity";

export function Scoreboard({ match }: { match: MatchSummary }) {
  return (
    <section className="overflow-hidden rounded-3xl bg-[#071b18] p-5 text-white shadow-xl sm:p-10" aria-label="Match scoreboard">
      <div className="mb-6 flex justify-center sm:mb-8"><StatusBadge status={match.status} /></div>
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-8">
        <div className="[&_strong]:text-white [&_span]:text-emerald-200"><TeamIdentity team={match.home_team} side="home" /></div>
        <div className="order-first rounded-2xl bg-white/5 py-4 text-center sm:order-none sm:bg-transparent sm:py-0">
          <div className="text-4xl font-black tracking-tight tabular-nums sm:text-6xl">{match.home_score} <span className="text-emerald-400">–</span> {match.away_score}</div>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.25em] text-emerald-200">Score</p>
        </div>
        <div className="[&_strong]:text-white [&_span]:text-emerald-200 sm:[&>div]:flex-row-reverse sm:[&>div]:text-right"><TeamIdentity team={match.away_team} side="away" /></div>
      </div>
    </section>
  );
}
