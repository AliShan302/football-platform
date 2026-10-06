"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getMatch } from "@/lib/api/matches";
import type { MatchDetail, MatchEvent } from "@/lib/api/types";
import { parseRealtimeMessage } from "@/lib/realtime/protocol";
import { reduceMatchRealtime } from "@/lib/realtime/reducers";
import type { MatchRealtimeMessage } from "@/lib/realtime/types";
import { buildWebSocketUrl } from "@/lib/realtime/websocket";
import { useReconnectingWebSocket } from "./useReconnectingWebSocket";

function parseMatchMessage(raw: unknown): MatchRealtimeMessage | null {
  const message = parseRealtimeMessage(raw);
  return message && (message.type === "match.status" || message.type === "match.event" || message.type === "error") ? message : null;
}

function reportError(message: MatchRealtimeMessage) {
  if (message.type === "error" && process.env.NODE_ENV === "development") console.warn(`WebSocket protocol error: ${message.code}`);
}

export function useRealtimeMatch(initialMatch: MatchDetail) {
  const [match, setMatch] = useState(initialMatch);
  const enabled = match.status !== "finished";
  const url = useMemo(() => enabled ? buildWebSocketUrl(`/matches/${initialMatch.id}/`) : null, [enabled, initialMatch.id]);
  const resynchronize = useCallback((signal: AbortSignal) => getMatch(String(initialMatch.id), signal), [initialMatch.id]);
  const onMessage = useCallback((message: MatchRealtimeMessage) => {
    reportError(message);
    if (message.type !== "error") setMatch((current) => reduceMatchRealtime(current, message));
  }, []);
  const onSynchronized = useCallback((snapshot: MatchDetail, buffered: MatchRealtimeMessage[]) => {
    setMatch(buffered.reduce((current, message) => { reportError(message); return reduceMatchRealtime(current, message); }, snapshot));
  }, []);
  const { status, closePermanently } = useReconnectingWebSocket({ url, enabled, parseMessage: parseMatchMessage, resynchronize, onSynchronized, onMessage });
  useEffect(() => { if (match.status === "finished") closePermanently(); }, [match.status, closePermanently]);

  const applyActionMatch = useCallback((snapshot: MatchDetail) => {
    setMatch((current) => {
      const snapshotIds = new Set(snapshot.match_events.map((item) => item.id));
      return current.match_events.filter((item) => !snapshotIds.has(item.id)).reduce(
        (next, event) => reduceMatchRealtime(next, { version: 1, type: "match.event", match_id: snapshot.id, event, score: { home: snapshot.home_score, away: snapshot.away_score } }),
        snapshot,
      );
    });
  }, []);
  const applyActionEvent = useCallback((event: MatchEvent, snapshot: MatchDetail) => {
    setMatch((current) => reduceMatchRealtime(current, { version: 1, type: "match.event", match_id: snapshot.id, event, score: { home: snapshot.home_score, away: snapshot.away_score } }));
  }, []);
  return { match, connectionStatus: status, applyActionMatch, applyActionEvent };
}
