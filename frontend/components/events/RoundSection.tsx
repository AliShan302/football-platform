import type { EventRound } from "@/lib/api/types";
import { MatchCard } from "@/components/matches/MatchCard";
import { EmptyState } from "@/components/ui/EmptyState";

export function RoundSection({ round }: { round: EventRound }) {
  return (
    <section aria-labelledby={`round-${round.id}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-8 place-items-center rounded-full bg-emerald-100 text-sm font-black text-emerald-800">{round.order}</span>
        <h3 id={`round-${round.id}`} className="text-xl font-bold text-slate-950">{round.name}</h3>
      </div>
      {round.matches.length ? (
        <div className="grid gap-4 xl:grid-cols-2">{round.matches.map((match) => <MatchCard key={match.id} match={match} />)}</div>
      ) : <EmptyState title="No matches in this round" />}
    </section>
  );
}
