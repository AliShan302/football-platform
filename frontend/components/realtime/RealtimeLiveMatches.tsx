"use client";

import { useCallback, useMemo, useState } from "react";
import { MatchCard } from "@/components/matches/MatchCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useReconnectingWebSocket } from "@/hooks/useReconnectingWebSocket";
import { getAllLiveMatches } from "@/lib/api/matches";
import type { MatchSummary } from "@/lib/api/types";
import { parseRealtimeMessage } from "@/lib/realtime/protocol";
import { reduceLiveMatchesRealtime } from "@/lib/realtime/reducers";
import type { LiveMatchesRealtimeMessage } from "@/lib/realtime/types";
import { buildWebSocketUrl } from "@/lib/realtime/websocket";
import { ConnectionStatus } from "./ConnectionStatus";

function parseLiveMessage(raw: unknown): LiveMatchesRealtimeMessage | null {
  const message = parseRealtimeMessage(raw);
  return message &&
    (message.type === "live_match.updated" ||
      message.type === "live_match.removed" ||
      message.type === "error")
    ? message
    : null;
}

function reportProtocolError(message: LiveMatchesRealtimeMessage) {
  if (message.type === "error" && process.env.NODE_ENV === "development") {
    console.warn(`WebSocket protocol error: ${message.code}`);
  }
}

export function RealtimeLiveMatches({ initialMatches }: { initialMatches: MatchSummary[] }) {
  const [matches, setMatches] = useState(initialMatches);
  const url = useMemo(() => buildWebSocketUrl("/live-matches/"), []);
  const resynchronize = useCallback(
    (signal: AbortSignal) => getAllLiveMatches(signal),
    [],
  );
  const onMessage = useCallback((message: LiveMatchesRealtimeMessage) => {
    reportProtocolError(message);
    if (message.type !== "error") {
      setMatches((current) => reduceLiveMatchesRealtime(current, message));
    }
  }, []);
  const onSynchronized = useCallback(
    (snapshot: MatchSummary[], buffered: LiveMatchesRealtimeMessage[]) => {
      setMatches(
        buffered.reduce((current, message) => {
          reportProtocolError(message);
          return reduceLiveMatchesRealtime(current, message);
        }, snapshot),
      );
    },
    [],
  );
  const { status } = useReconnectingWebSocket({
    url,
    parseMessage: parseLiveMessage,
    resynchronize,
    onSynchronized,
    onMessage,
  });

  return (
    <>
      <div className="mb-5 flex justify-end"><ConnectionStatus status={status} /></div>
      {matches.length ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {matches.map((match) => <MatchCard key={match.id} match={match} />)}
        </div>
      ) : (
        <EmptyState
          title="No matches are currently live"
          description="Upcoming and completed fixtures remain available through their events."
        />
      )}
    </>
  );
}
