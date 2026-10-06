import Link from "next/link";
import { EventCard } from "@/components/events/EventCard";
import { MatchCard } from "@/components/matches/MatchCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getEvents } from "@/lib/api/events";
import { getLiveMatches } from "@/lib/api/matches";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [eventsResult, liveResult] = await Promise.allSettled([getEvents(), getLiveMatches()]);
  if (eventsResult.status === "rejected" && liveResult.status === "rejected") throw eventsResult.reason;
  const events = eventsResult.status === "fulfilled" ? eventsResult.value.results.slice(0, 3) : null;
  const liveMatches = liveResult.status === "fulfilled" ? liveResult.value.results.slice(0, 4) : null;

  return (
    <>
      <section className="football-hero px-4 py-12 text-white sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="football-kicker text-sm font-bold uppercase tracking-[0.24em] text-emerald-300">Tournament command centre</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">Every match. Every moment. One clear scoreboard.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-emerald-50/75">Browse competitions, follow scores, inspect match timelines, and see authoritative standings.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link className="button-primary" href="/events">Explore events</Link><Link className="button-dark" href="/live">View live scoreboard</Link></div>
        </div>
      </section>
      <div className="page-shell space-y-12 sm:space-y-16">
        <section aria-labelledby="live-heading">
          <div className="section-heading"><div><p className="eyebrow">Now playing</p><h2 id="live-heading">Live matches</h2></div><Link href="/live">Open scoreboard →</Link></div>
          {liveMatches === null ? <InlineFailure label="Live matches are temporarily unavailable." /> : liveMatches.length ? <div className="grid gap-5 lg:grid-cols-2">{liveMatches.map((match) => <MatchCard key={match.id} match={match} />)}</div> : <EmptyState title="No matches are currently live" description="Check the events schedule for upcoming fixtures." />}
        </section>
        <section aria-labelledby="events-heading">
          <div className="section-heading"><div><p className="eyebrow">Competitions</p><h2 id="events-heading">Current and upcoming events</h2></div><Link href="/events">All events →</Link></div>
          {events === null ? <InlineFailure label="Events are temporarily unavailable." /> : events.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{events.map((event) => <EventCard key={event.id} event={event} />)}</div> : <EmptyState title="No events are available" />}
        </section>
      </div>
    </>
  );
}

function InlineFailure({ label }: { label: string }) {
  return <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-medium text-amber-900">{label} Try this section again shortly.</div>;
}
