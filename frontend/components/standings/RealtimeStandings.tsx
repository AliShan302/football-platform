"use client";

import { useCallback, useMemo, useState } from "react";
import { useReconnectingWebSocket } from "@/hooks/useReconnectingWebSocket";
import { getStandings } from "@/lib/api/events";
import type { StandingRow } from "@/lib/api/types";
import { parseRealtimeMessage } from "@/lib/realtime/protocol";
import type { StandingsRealtimeMessage } from "@/lib/realtime/types";
import { buildWebSocketUrl } from "@/lib/realtime/websocket";
import { ConnectionStatus } from "@/components/realtime/ConnectionStatus";
import { StandingsTable } from "./StandingsTable";

function parseStandingsMessage(raw: unknown): StandingsRealtimeMessage | null {
  const message = parseRealtimeMessage(raw);
  return message && (message.type === "standings.updated" || message.type === "error") ? message : null;
}

export function RealtimeStandings({ eventId, initialRows }: { eventId: number; initialRows: StandingRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const url = useMemo(() => buildWebSocketUrl(`/events/${eventId}/standings/`), [eventId]);
  const resynchronize = useCallback((signal: AbortSignal) => getStandings(String(eventId), signal), [eventId]);
  const onMessage = useCallback((message: StandingsRealtimeMessage) => {
    if (message.type === "standings.updated" && message.event_id === eventId) setRows(message.standings);
  }, [eventId]);
  const onSynchronized = useCallback((snapshot: StandingRow[], buffered: StandingsRealtimeMessage[]) => {
    const latest = buffered.reduce<StandingRow[]>((current, message) =>
      message.type === "standings.updated" && message.event_id === eventId ? message.standings : current,
    snapshot);
    setRows(latest);
  }, [eventId]);
  const { status } = useReconnectingWebSocket({ url, parseMessage: parseStandingsMessage, resynchronize, onSynchronized, onMessage });

  return (
    <div>
      <div className="mb-3 flex justify-end"><ConnectionStatus status={status} /></div>
      <StandingsTable rows={rows} />
    </div>
  );
}
