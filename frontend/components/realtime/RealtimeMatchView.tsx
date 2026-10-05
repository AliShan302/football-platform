"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MatchTimeline } from "@/components/matches/MatchTimeline";
import { Scoreboard } from "@/components/matches/Scoreboard";
import { getMatch } from "@/lib/api/matches";
import type { MatchDetail } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { parseRealtimeMessage } from "@/lib/realtime/protocol";
import { reduceMatchRealtime } from "@/lib/realtime/reducers";
import type { MatchRealtimeMessage } from "@/lib/realtime/types";
import { buildWebSocketUrl } from "@/lib/realtime/websocket";
import { useReconnectingWebSocket } from "@/hooks/useReconnectingWebSocket";
import { ConnectionStatus } from "./ConnectionStatus";

function parseMatchMessage(raw: unknown): MatchRealtimeMessage | null {
  const message = parseRealtimeMessage(raw);
  return message &&
    (message.type === "match.status" ||
      message.type === "match.event" ||
      message.type === "error")
    ? message
    : null;
}

function reportProtocolError(message: MatchRealtimeMessage) {
  if (message.type === "error" && process.env.NODE_ENV === "development") {
    console.warn(`WebSocket protocol error: ${message.code}`);
  }
}

export function RealtimeMatchView({ initialMatch }: { initialMatch: MatchDetail }) {
  const [match, setMatch] = useState(initialMatch);
  const enabled = match.status !== "finished";
  const url = useMemo(
    () => (enabled ? buildWebSocketUrl(`/matches/${initialMatch.id}/`) : null),
    [enabled, initialMatch.id],
  );
  const resynchronize = useCallback(
    (signal: AbortSignal) => getMatch(String(initialMatch.id), signal),
    [initialMatch.id],
  );
  const onMessage = useCallback((message: MatchRealtimeMessage) => {
    reportProtocolError(message);
    if (message.type !== "error") {
      setMatch((current) => reduceMatchRealtime(current, message));
    }
  }, []);
  const onSynchronized = useCallback(
    (snapshot: MatchDetail, buffered: MatchRealtimeMessage[]) => {
      setMatch(
        buffered.reduce((current, message) => {
          reportProtocolError(message);
          return reduceMatchRealtime(current, message);
        }, snapshot),
      );
    },
    [],
  );
  const { status, closePermanently } = useReconnectingWebSocket({
    url,
    enabled,
    parseMessage: parseMatchMessage,
    resynchronize,
    onSynchronized,
    onMessage,
  });

  useEffect(() => {
    if (match.status === "finished") closePermanently();
  }, [match.status, closePermanently]);

  const details = [
    ["Scheduled", formatDateTime(match.scheduled_at)],
    ...(match.started_at ? [["Started", formatDateTime(match.started_at)]] : []),
    ...(match.ended_at ? [["Ended", formatDateTime(match.ended_at)]] : []),
    ["Venue", match.venue || "To be confirmed"],
  ];

  return (
    <div className="space-y-12">
      {match.status !== "finished" && (
        <div className="flex justify-end"><ConnectionStatus status={status} /></div>
      )}
      <Scoreboard match={match} />
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {details.map(([label, value]) => (
          <div key={label} className="card p-4">
            <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</dt>
            <dd className="mt-2 font-semibold text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
      <section>
        <p className="eyebrow">Match log</p>
        <h1 className="mb-6 text-3xl font-black tracking-tight text-slate-950">Timeline</h1>
        <MatchTimeline events={match.match_events} />
      </section>
    </div>
  );
}
