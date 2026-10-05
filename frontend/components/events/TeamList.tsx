import type { TeamSummary } from "@/lib/api/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { TeamIdentity } from "@/components/matches/TeamIdentity";

export function TeamList({ teams }: { teams: TeamSummary[] }) {
  if (!teams.length) return <EmptyState title="No teams registered" />;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => <li key={team.id} className="card p-4"><TeamIdentity team={team} /></li>)}
    </ul>
  );
}
