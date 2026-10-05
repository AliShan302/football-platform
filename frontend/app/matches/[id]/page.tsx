import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RealtimeMatchView } from "@/components/realtime/RealtimeMatchView";
import { ApiError } from "@/lib/api/client";
import { getMatch } from "@/lib/api/matches";

export const metadata: Metadata = { title: "Match details" };
export const dynamic = "force-dynamic";

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let match;
  try { match = await getMatch(id); }
  catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); throw error; }
  return (
    <div className="page-shell"><RealtimeMatchView initialMatch={match} /></div>
  );
}
