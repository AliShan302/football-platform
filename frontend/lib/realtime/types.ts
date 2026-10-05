import type {
  MatchEvent,
  MatchStatus,
  MatchSummary,
} from "@/lib/api/types";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

export interface RealtimeScore {
  home: number;
  away: number;
}

export interface MatchStatusMessage {
  version: 1;
  type: "match.status";
  match_id: number;
  status: MatchStatus;
  started_at: string | null;
  ended_at: string | null;
  score: RealtimeScore;
}

export interface MatchEventMessage {
  version: 1;
  type: "match.event";
  match_id: number;
  event: MatchEvent;
  score: RealtimeScore;
}

export interface LiveMatchUpdatedMessage {
  version: 1;
  type: "live_match.updated";
  reason: "started" | "score_changed";
  match: MatchSummary;
}

export interface LiveMatchRemovedMessage {
  version: 1;
  type: "live_match.removed";
  match_id: number;
  status: MatchStatus;
  final_score: RealtimeScore;
  ended_at: string | null;
}

export interface RealtimeErrorMessage {
  version: 1;
  type: "error";
  code: string;
  detail: string;
}

export type MatchRealtimeMessage =
  | MatchStatusMessage
  | MatchEventMessage
  | RealtimeErrorMessage;

export type LiveMatchesRealtimeMessage =
  | LiveMatchUpdatedMessage
  | LiveMatchRemovedMessage
  | RealtimeErrorMessage;

export type RealtimeMessage =
  | MatchStatusMessage
  | MatchEventMessage
  | LiveMatchUpdatedMessage
  | LiveMatchRemovedMessage
  | RealtimeErrorMessage;
