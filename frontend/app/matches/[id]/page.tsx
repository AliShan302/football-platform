import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MatchTimeline } from "@/components/matches/MatchTimeline";
import { Scoreboard } from "@/components/matches/Scoreboard";
import { ApiError } from "@/lib/api/client";
import { getMatch } from "@/lib/api/matches";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Match details" };
export const dynamic = "force-dynamic";

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let match;
  try { match = await getMatch(id); }
  catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); throw error; }
  const details = [
    ["Scheduled", formatDateTime(match.scheduled_at)],
    ...(match.started_at ? [["Started", formatDateTime(match.started_at)]] : []),
    ...(match.ended_at ? [["Ended", formatDateTime(match.ended_at)]] : []),
    ["Venue", match.venue || "To be confirmed"],
  ];
  return (
    <div className="page-shell space-y-12">
      <Scoreboard match={match} />
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{details.map(([label, value]) => <div key={label} className="card p-4"><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-2 font-semibold text-slate-800">{value}</dd></div>)}</dl>
      <section><p className="eyebrow">Match log</p><h1 className="mb-6 text-3xl font-black tracking-tight text-slate-950">Timeline</h1><MatchTimeline events={match.match_events} /></section>
    </div>
  );
}
