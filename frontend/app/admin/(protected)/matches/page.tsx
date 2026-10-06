import type { Metadata } from "next";
import { MatchCard } from "@/components/matches/MatchCard";
import { RealtimeLiveMatches } from "@/components/realtime/RealtimeLiveMatches";
import { EmptyState } from "@/components/ui/EmptyState";
import { getAllLiveMatches, getAllMatchesByStatus } from "@/lib/api/matches";

export const metadata: Metadata = { title: "Match operations" };
export const dynamic = "force-dynamic";

export default async function AdminMatchesPage() {
  const [scheduledMatches, liveMatches] = await Promise.all([
    getAllMatchesByStatus("scheduled"),
    getAllLiveMatches(),
  ]);

  return (
    <div className="page-shell">
      <header className="page-heading">
        <p className="eyebrow football-kicker">Match operations</p>
        <h1>Matches</h1>
        <p>Start upcoming fixtures or open live matches directly from one operational view.</p>
      </header>

      <div className="space-y-12">
        <section aria-labelledby="live-controls-heading">
          <div className="section-heading">
            <div><p className="eyebrow">Running now</p><h2 id="live-controls-heading">Live matches</h2></div>
          </div>
          <RealtimeLiveMatches initialMatches={liveMatches} adminControls />
        </section>

        <section aria-labelledby="scheduled-controls-heading">
          <div className="section-heading">
            <div><p className="eyebrow">Ready to start</p><h2 id="scheduled-controls-heading">Upcoming matches</h2></div>
          </div>
          {scheduledMatches.length ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {scheduledMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  detailsHref={`/admin/matches/${match.id}`}
                  detailsLabel="Open controls"
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No upcoming matches" description="Schedule a fixture from an event workspace and it will appear here." />
          )}
        </section>
      </div>
    </div>
  );
}
