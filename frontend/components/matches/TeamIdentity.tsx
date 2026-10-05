import type { TeamSummary } from "@/lib/api/types";

export function TeamIdentity({ team, align = "left" }: { team: TeamSummary; align?: "left" | "right" }) {
  return (
    <div className={`flex min-w-0 items-center gap-3 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      {team.logo ? (
        // Backend-hosted media URLs are dynamic; a plain image avoids external-host configuration.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo} alt="" className="size-10 rounded-full bg-white object-cover ring-1 ring-slate-200" />
      ) : (
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800">{team.code.slice(0, 3)}</span>
      )}
      <span className="min-w-0">
        <strong className="block truncate text-sm text-slate-900">{team.name}</strong>
        <span className="text-xs font-semibold text-slate-500">{team.code}</span>
      </span>
    </div>
  );
}
