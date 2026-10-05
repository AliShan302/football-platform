import type { ConnectionStatus as ConnectionState } from "@/lib/realtime/types";

const labels: Record<ConnectionState, string> = {
  connecting: "Connecting…",
  connected: "Live",
  reconnecting: "Reconnecting… showing last known data",
  disconnected: "Offline — showing last known data",
};

const styles: Record<ConnectionState, string> = {
  connecting: "border-sky-200 bg-sky-50 text-sky-800",
  connected: "border-emerald-200 bg-emerald-50 text-emerald-800",
  reconnecting: "border-amber-200 bg-amber-50 text-amber-900",
  disconnected: "border-slate-200 bg-slate-100 text-slate-700",
};

export function ConnectionStatus({ status }: { status: ConnectionState }) {
  return (
    <p
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${styles[status]}`}
      role="status"
      aria-live="polite"
    >
      {labels[status]}
    </p>
  );
}
