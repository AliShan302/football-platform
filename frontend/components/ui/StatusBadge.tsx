import type { EventStatus, MatchStatus } from "@/lib/api/types";
import { formatLabel } from "@/lib/format";

const styles: Record<EventStatus | MatchStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  active: "bg-emerald-100 text-emerald-800",
  completed: "bg-indigo-100 text-indigo-800",
  scheduled: "bg-sky-100 text-sky-800",
  live: "bg-rose-100 text-rose-800 ring-1 ring-rose-200",
  finished: "bg-slate-200 text-slate-700",
};

export function StatusBadge({ status }: { status: EventStatus | MatchStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${styles[status]}`}>
      {status === "live" && <span aria-hidden="true" className="mr-1.5 size-1.5 rounded-full bg-rose-500" />}
      <span className="sr-only">Status: </span>{formatLabel(status)}
    </span>
  );
}
