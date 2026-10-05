import { describe, expect, it } from "vitest";
import { parseRealtimeMessage } from "./protocol";

const team = { id: 1, name: "Alpha", code: "ALP", logo: null };
const score = { home: 1, away: 0 };
const event = {
  id: 10,
  team,
  type: "goal",
  player_name: "Player",
  minute: 12,
  points: 0,
  note: "",
  created_at: "2026-01-01T12:00:00Z",
};
const match = {
  id: 4,
  event_id: 2,
  round_id: 3,
  home_team: team,
  away_team: { ...team, id: 2, name: "Beta", code: "BET" },
  status: "live",
  home_score: 1,
  away_score: 0,
  scheduled_at: "2026-01-01T11:00:00Z",
  started_at: "2026-01-01T11:00:00Z",
  ended_at: null,
  venue: "Ground",
};

describe("parseRealtimeMessage", () => {
  it.each([
    { version: 1, type: "match.status", match_id: 4, status: "live", started_at: null, ended_at: null, score },
    { version: 1, type: "match.event", match_id: 4, event, score },
    { version: 1, type: "live_match.updated", reason: "started", match },
    { version: 1, type: "live_match.removed", match_id: 4, status: "finished", final_score: score, ended_at: "2026-01-01T13:00:00Z" },
    { version: 1, type: "error", code: "read_only_connection", detail: "Read only" },
  ])("accepts valid $type messages", (message) => {
    expect(parseRealtimeMessage(JSON.stringify(message))).toEqual(message);
  });

  it.each([
    "not json",
    JSON.stringify({ version: 2, type: "match.status" }),
    JSON.stringify({ version: 1, type: "future.message" }),
    JSON.stringify({ version: 1, type: "match.status", match_id: 0, status: "live", started_at: null, ended_at: null, score }),
    JSON.stringify({ version: 1, type: "match.event", match_id: 4, event, score: { home: "1", away: 0 } }),
  ])("ignores malformed or unsupported input", (raw) => {
    expect(parseRealtimeMessage(raw)).toBeNull();
  });
});
