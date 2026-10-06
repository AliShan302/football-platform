import Link from "next/link";
import type { MatchSummary } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TeamIdentity } from "./TeamIdentity";

export function MatchCard({
  match,
  detailsHref,
  detailsLabel = "Match details",
}: {
  match: MatchSummary;
  detailsHref?: string;
  detailsLabel?: string;
}) {
  const showScore = match.status !== "scheduled";
  return (
    <article className="card p-4 sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <StatusBadge status={match.status} />
        <span className="text-xs text-slate-500">{formatDateTime(match.scheduled_at)}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
        <TeamIdentity team={match.home_team} side="home" />
        <div className="order-first rounded-xl bg-slate-950 px-3 py-2 text-center text-xl font-black tabular-nums text-white sm:order-none">
          {showScore ? `${match.home_score} – ${match.away_score}` : "vs"}
        </div>
        <div className="sm:[&>div]:flex-row-reverse sm:[&>div]:text-right"><TeamIdentity team={match.away_team} side="away" /></div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
        <span className="min-w-0 break-words text-slate-500">{match.venue || "Venue TBC"}</span>
        <Link className="button-secondary" href={detailsHref ?? `/matches/${match.id}`}>{detailsLabel} →</Link>
      </div>
    </article>
  );
}
