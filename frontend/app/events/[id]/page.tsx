import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoundSection } from "@/components/events/RoundSection";
import { TeamList } from "@/components/events/TeamList";
import { StandingsTable } from "@/components/standings/StandingsTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ApiError } from "@/lib/api/client";
import { getEvent, getStandings } from "@/lib/api/events";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Event details" };
export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data;
  try { data = await Promise.all([getEvent(id), getStandings(id)]); }
  catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); throw error; }
  const [event, standings] = data;
  return (
    <div className="page-shell space-y-14">
      <header className="rounded-3xl bg-[#071b18] p-7 text-white sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm font-bold uppercase tracking-wider text-emerald-300">Tournament</p><h1 className="mt-2 text-3xl font-black sm:text-5xl">{event.name}</h1></div><StatusBadge status={event.status} /></div>
        <p className="mt-5 max-w-3xl leading-7 text-emerald-50/75">{event.description || "Tournament details will be announced soon."}</p>
        <p className="mt-6 text-sm font-semibold text-emerald-100">{formatDate(event.start_date)} — {formatDate(event.end_date)}</p>
      </header>
      <Section title="Registered teams"><TeamList teams={event.teams} /></Section>
      <Section title="Standings"><StandingsTable rows={standings} /></Section>
      <Section title="Rounds and fixtures">{event.rounds.length ? <div className="space-y-10">{event.rounds.map((round) => <RoundSection key={round.id} round={round} />)}</div> : <div className="card p-8 text-center text-slate-500">No rounds have been scheduled.</div>}</Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-5 text-2xl font-black tracking-tight text-slate-950">{title}</h2>{children}</section>;
}
