import type {
  MatchEvent,
  MatchEventType,
  MatchStatus,
  MatchSummary,
  TeamSummary,
  StandingRow,
} from "@/lib/api/types";
import type { RealtimeMessage, RealtimeScore } from "./types";

type UnknownRecord = Record<string, unknown>;

const MATCH_STATUSES = new Set<MatchStatus>(["scheduled", "live", "finished"]);
const EVENT_TYPES = new Set<MatchEventType>([
  "goal",
  "yellow_card",
  "red_card",
  "penalty_kick",
  "reward",
]);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isId(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringOrNull(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isStatus(value: unknown): value is MatchStatus {
  return typeof value === "string" && MATCH_STATUSES.has(value as MatchStatus);
}

function isScore(value: unknown): value is RealtimeScore {
  return (
    isRecord(value) &&
    isNumber(value.home) &&
    isNumber(value.away) &&
    value.home >= 0 &&
    value.away >= 0
  );
}

function isTeam(value: unknown): value is TeamSummary {
  return (
    isRecord(value) &&
    isId(value.id) &&
    typeof value.name === "string" &&
    typeof value.code === "string" &&
    isStringOrNull(value.logo)
  );
}

function isMatchEvent(value: unknown): value is MatchEvent {
  return (
    isRecord(value) &&
    isId(value.id) &&
    isTeam(value.team) &&
    typeof value.type === "string" &&
    EVENT_TYPES.has(value.type as MatchEventType) &&
    typeof value.player_name === "string" &&
    Number.isInteger(value.minute) &&
    (value.minute as number) >= 0 &&
    isNumber(value.points) &&
    typeof value.note === "string" &&
    typeof value.created_at === "string"
  );
}

function isMatchSummary(value: unknown): value is MatchSummary {
  return (
    isRecord(value) &&
    isId(value.id) &&
    isId(value.round_id) &&
    isId(value.event_id) &&
    isTeam(value.home_team) &&
    isTeam(value.away_team) &&
    isStatus(value.status) &&
    typeof value.scheduled_at === "string" &&
    typeof value.venue === "string" &&
    isStringOrNull(value.started_at) &&
    isStringOrNull(value.ended_at) &&
    isNumber(value.home_score) &&
    isNumber(value.away_score) &&
    value.home_score >= 0 &&
    value.away_score >= 0
  );
}

function isStandingRow(value: unknown): value is StandingRow {
  return isRecord(value) &&
    isId(value.team_id) &&
    typeof value.team_name === "string" &&
    typeof value.team_code === "string" &&
    ["played", "won", "drawn", "lost", "goals_for", "goals_against", "goal_difference", "match_points", "reward_points", "total_points"]
      .every((field) => isNumber(value[field]));
}

export function parseRealtimeMessage(raw: unknown): RealtimeMessage | null {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  if (!isRecord(value) || value.version !== 1 || typeof value.type !== "string") {
    return null;
  }

  switch (value.type) {
    case "match.status":
      return isId(value.match_id) &&
        isStatus(value.status) &&
        isStringOrNull(value.started_at) &&
        isStringOrNull(value.ended_at) &&
        isScore(value.score)
        ? (value as unknown as RealtimeMessage)
        : null;
    case "match.event":
      return isId(value.match_id) && isMatchEvent(value.event) && isScore(value.score)
        ? (value as unknown as RealtimeMessage)
        : null;
    case "live_match.updated":
      return (value.reason === "started" || value.reason === "score_changed") &&
        isMatchSummary(value.match)
        ? (value as unknown as RealtimeMessage)
        : null;
    case "live_match.removed":
      return isId(value.match_id) &&
        isStatus(value.status) &&
        isScore(value.final_score) &&
        isStringOrNull(value.ended_at)
        ? (value as unknown as RealtimeMessage)
        : null;
    case "standings.updated":
      return isId(value.event_id) &&
        isId(value.trigger_match_id) &&
        Array.isArray(value.standings) &&
        value.standings.every(isStandingRow)
        ? (value as unknown as RealtimeMessage)
        : null;
    case "error":
      return typeof value.code === "string" && typeof value.detail === "string"
        ? (value as unknown as RealtimeMessage)
        : null;
    default:
      return null;
  }
}
