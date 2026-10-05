import type { Metadata } from "next";
import { MatchCard } from "@/components/matches/MatchCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getLiveMatches } from "@/lib/api/matches";

export const metadata: Metadata = { title: "Live matches" };
export const dynamic = "force-dynamic";

export default async function LiveMatchesPage() {
  const matches = await getLiveMatches();
  return (
    <div className="page-shell">
      <header className="page-heading"><p className="eyebrow">Scoreboard</p><h1>Live matches</h1><p>Latest REST snapshot of matches currently in play. Refresh to fetch current state.</p></header>
      {matches.results.length ? <div className="grid gap-5 lg:grid-cols-2">{matches.results.map((match) => <MatchCard key={match.id} match={match} />)}</div> : <EmptyState title="No matches are currently live" description="Upcoming and completed fixtures remain available through their events." />}
    </div>
  );
}
