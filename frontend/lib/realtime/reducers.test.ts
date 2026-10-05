import { describe, expect, it } from "vitest";
import type { MatchDetail, MatchEvent, MatchSummary } from "@/lib/api/types";
import { reduceLiveMatchesRealtime, reduceMatchRealtime } from "./reducers";
import type { MatchEventMessage } from "./types";

const home = { id: 1, name: "Alpha", code: "ALP", logo: null };
const away = { id: 2, name: "Beta", code: "BET", logo: null };

function summary(id = 8, scheduledAt = "2026-01-01T12:00:00Z"): MatchSummary {
  return { id, event_id: 3, round_id: 4, home_team: home, away_team: away, status: "live", scheduled_at: scheduledAt, venue: "Ground", started_at: scheduledAt, ended_at: null, home_score: 0, away_score: 0 };
}

function match(): MatchDetail {
  return { ...summary(), match_events: [] };
}

function event(id: number, type: MatchEvent["type"], minute = 20, createdAt = "2026-01-01T12:20:00Z"): MatchEvent {
  return { id, team: home, type, player_name: "Player", minute, points: type === "reward" ? 2 : 0, note: "", created_at: createdAt };
}

function eventMessage(item: MatchEvent, homeScore = 0): MatchEventMessage {
  return { version: 1, type: "match.event", match_id: 8, event: item, score: { home: homeScore, away: 0 } };
}

describe("reduceMatchRealtime", () => {
  it("applies status, timestamps, and authoritative score", () => {
    const result = reduceMatchRealtime(match(), { version: 1, type: "match.status", match_id: 8, status: "finished", started_at: "start", ended_at: "end", score: { home: 3, away: 2 } });
    expect(result).toMatchObject({ status: "finished", started_at: "start", ended_at: "end", home_score: 3, away_score: 2 });
  });

  it.each(["goal", "yellow_card", "red_card", "penalty_kick", "reward"] as const)("upserts a %s event and uses the supplied score", (type) => {
    const result = reduceMatchRealtime(match(), eventMessage(event(1, type), 7));
    expect(result.match_events).toHaveLength(1);
    expect(result.match_events[0].type).toBe(type);
    expect(result.home_score).toBe(7);
  });

  it("replaces duplicate IDs without duplication", () => {
    const first = reduceMatchRealtime(match(), eventMessage(event(1, "goal"), 1));
    const replacement = { ...event(1, "goal"), note: "corrected" };
    const result = reduceMatchRealtime(first, eventMessage(replacement, 1));
    expect(result.match_events).toEqual([replacement]);
  });

  it("orders by minute, created_at, then ID", () => {
    const items = [
      event(3, "goal", 20, "2026-01-01T12:20:01Z"),
      event(2, "goal", 10, "2026-01-01T12:10:00Z"),
      event(1, "goal", 20, "2026-01-01T12:20:01Z"),
      event(4, "goal", 20, "2026-01-01T12:20:00Z"),
    ];
    const result = items.reduce((state, item) => reduceMatchRealtime(state, eventMessage(item)), match());
    expect(result.match_events.map(({ id }) => id)).toEqual([2, 4, 1, 3]);
  });

  it("ignores messages for another match", () => {
    const current = match();
    expect(reduceMatchRealtime(current, { ...eventMessage(event(1, "goal")), match_id: 99 })).toBe(current);
  });
});

describe("reduceLiveMatchesRealtime", () => {
  const updated = (item: MatchSummary, reason: "started" | "score_changed" = "started") => ({ version: 1 as const, type: "live_match.updated" as const, reason, match: item });

  it("inserts, sorts, and replaces complete matches without duplicates", () => {
    const later = summary(9, "2026-01-02T12:00:00Z");
    const earlier = summary(8, "2026-01-01T12:00:00Z");
    let state = reduceLiveMatchesRealtime([later], updated(earlier));
    const scored = { ...earlier, home_score: 2 };
    state = reduceLiveMatchesRealtime(state, updated(scored, "score_changed"));
    expect(state.map(({ id }) => id)).toEqual([8, 9]);
    expect(state.filter(({ id }) => id === 8)).toEqual([scored]);
  });

  it("removes a match and treats a missing match as a no-op", () => {
    const state = [summary()];
    const removed = reduceLiveMatchesRealtime(state, { version: 1, type: "live_match.removed", match_id: 8, status: "finished", final_score: { home: 0, away: 0 }, ended_at: "end" });
    expect(removed).toEqual([]);
    expect(reduceLiveMatchesRealtime(state, { version: 1, type: "live_match.removed", match_id: 99, status: "finished", final_score: { home: 0, away: 0 }, ended_at: "end" })).toBe(state);
  });
});
