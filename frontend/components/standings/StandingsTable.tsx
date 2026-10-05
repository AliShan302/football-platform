import type { StandingRow } from "@/lib/api/types";
import { EmptyState } from "@/components/ui/EmptyState";

export function StandingsTable({ rows }: { rows: StandingRow[] }) {
  if (!rows.length) return <EmptyState title="No standings available yet" />;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead className="bg-slate-950 text-left text-xs uppercase tracking-wider text-slate-300">
          <tr>{["Pos", "Team", "P", "W", "D", "L", "GF", "GA", "GD", "Reward", "Pts"].map((heading) => <th key={heading} scope="col" className="px-4 py-3">{heading}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={row.team_id} className="bg-white hover:bg-slate-50">
              <td className="px-4 py-4 font-black text-slate-400">{index + 1}</td>
              <th scope="row" className="px-4 py-4 text-left"><span className="font-bold text-slate-950">{row.team_name}</span><span className="ml-2 text-xs text-slate-400">{row.team_code}</span></th>
              {[row.played, row.won, row.drawn, row.lost, row.goals_for, row.goals_against, row.goal_difference, row.reward_points].map((value, valueIndex) => <td key={valueIndex} className="px-4 py-4 tabular-nums text-slate-600">{value}</td>)}
              <td className="px-4 py-4 text-base font-black tabular-nums text-emerald-700">{row.total_points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
