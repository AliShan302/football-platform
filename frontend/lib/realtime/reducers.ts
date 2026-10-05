import type { MatchDetail, MatchEvent, MatchSummary } from "@/lib/api/types";
import type {
  LiveMatchesRealtimeMessage,
  MatchRealtimeMessage,
} from "./types";

function compareEvents(left: MatchEvent, right: MatchEvent): number {
  return (
    left.minute - right.minute ||
    left.created_at.localeCompare(right.created_at) ||
    left.id - right.id
  );
}

export function sortLiveMatches(matches: MatchSummary[]): MatchSummary[] {
  return [...matches].sort(
    (left, right) =>
      left.scheduled_at.localeCompare(right.scheduled_at) || left.id - right.id,
  );
}

export function reduceMatchRealtime(
  state: MatchDetail,
  message: MatchRealtimeMessage,
): MatchDetail {
  if (message.type === "error" || message.match_id !== state.id) return state;

  if (message.type === "match.status") {
    return {
      ...state,
      status: message.status,
      started_at: message.started_at,
      ended_at: message.ended_at,
      home_score: message.score.home,
      away_score: message.score.away,
    };
  }

  const events = state.match_events.filter((event) => event.id !== message.event.id);
  events.push(message.event);
  events.sort(compareEvents);
  return {
    ...state,
    home_score: message.score.home,
    away_score: message.score.away,
    match_events: events,
  };
}

export function reduceLiveMatchesRealtime(
  state: MatchSummary[],
  message: LiveMatchesRealtimeMessage,
): MatchSummary[] {
  if (message.type === "error") return state;
  if (message.type === "live_match.removed") {
    const matches = state.filter((match) => match.id !== message.match_id);
    return matches.length === state.length ? state : matches;
  }

  const matches = state.filter((match) => match.id !== message.match.id);
  matches.push(message.match);
  return sortLiveMatches(matches);
}
