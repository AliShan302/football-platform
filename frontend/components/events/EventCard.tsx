import Link from "next/link";
import type { EventSummary } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function EventCard({ event }: { event: EventSummary }) {
  return (
    <article className="card flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{event.team_count} team{event.team_count === 1 ? "" : "s"}</p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">{event.name}</h2>
        </div>
        <StatusBadge status={event.status} />
      </div>
      <p className="mt-4 line-clamp-2 flex-1 text-sm leading-6 text-slate-600">{event.description || "Tournament details will be announced soon."}</p>
      <p className="mt-5 text-sm font-medium text-slate-500">{formatDate(event.start_date)} — {formatDate(event.end_date)}</p>
      <Link className="mt-5 font-bold text-emerald-700 hover:text-emerald-900" href={`/events/${event.id}`}>View tournament →</Link>
    </article>
  );
}
