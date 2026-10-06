import type { Metadata } from "next";
import { RealtimeLiveMatches } from "@/components/realtime/RealtimeLiveMatches";
import { getAllLiveMatches } from "@/lib/api/matches";

export const metadata: Metadata = { title: "Live matches" };
export const dynamic = "force-dynamic";

export default async function LiveMatchesPage() {
  const matches = await getAllLiveMatches();
  return (
    <div className="page-shell">
      <header className="page-heading"><p className="eyebrow football-kicker">Scoreboard</p><h1>Live matches</h1><p>Current matches update live, with REST recovery after interrupted connections.</p></header>
      <RealtimeLiveMatches initialMatches={matches} />
    </div>
  );
}
