import type { MatchEvent, MatchEventType } from "@/lib/api/types";
import { formatLabel } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";

const eventStyles: Record<MatchEventType, string> = {
  goal: "bg-emerald-500 text-white",
  yellow_card: "bg-yellow-400 text-yellow-950",
  red_card: "bg-red-600 text-white",
  penalty_kick: "bg-sky-600 text-white",
  reward: "bg-violet-600 text-white",
};

export function MatchTimeline({ events }: { events: MatchEvent[] }) {
  if (!events.length) return <EmptyState title="No timeline events yet" description="Match events will appear here." />;
  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="card flex gap-3 p-4 sm:gap-4">
          <div className="w-9 shrink-0 text-center text-base font-black tabular-nums text-slate-900 sm:w-12 sm:text-lg">{event.minute}&apos;</div>
          <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg text-xs font-black ${eventStyles[event.type]}`} aria-hidden="true">
            {event.type === "goal" ? "G" : event.type === "reward" ? "R" : "!"}
          </span>
          <div className="min-w-0">
            <p className="font-bold text-slate-900">{formatLabel(event.type)} · {event.team.name}</p>
            {(event.player_name || event.note) && <p className="mt-1 text-sm text-slate-500">{[event.player_name, event.note].filter(Boolean).join(" — ")}</p>}
            {event.type === "reward" && <p className={`mt-1 text-sm font-bold ${event.points > 0 ? "text-emerald-700" : "text-red-700"}`}>{event.points > 0 ? "+" : ""}{event.points} standing point{Math.abs(event.points) === 1 ? "" : "s"}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
