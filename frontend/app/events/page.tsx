import type { Metadata } from "next";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { getEvents } from "@/lib/api/events";

export const metadata: Metadata = { title: "Events" };
export const dynamic = "force-dynamic";

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const rawPage = (await searchParams).page;
  const parsedPage = Number(Array.isArray(rawPage) ? rawPage[0] : rawPage ?? "1");
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const events = await getEvents(page);
  return (
    <div className="page-shell">
      <header className="page-heading"><p className="eyebrow">Competitions</p><h1>Football events</h1><p>Explore tournaments, registered teams, fixtures, and standings.</p></header>
      {events.results.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{events.results.map((event) => <EventCard key={event.id} event={event} />)}</div> : <EmptyState title="No events are available" />}
      <Pagination next={events.next} previous={events.previous} />
    </div>
  );
}
