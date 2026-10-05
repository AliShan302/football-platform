import { afterEach, describe, expect, it, vi } from "vitest";
import { getAllLiveMatches } from "./matches";

const team = { id: 1, name: "Alpha", code: "ALP", logo: null };
const match = (id: number, scheduledAt: string) => ({
  id,
  event_id: 2,
  round_id: 3,
  home_team: team,
  away_team: { ...team, id: 2, name: "Beta", code: "BET" },
  status: "live",
  home_score: 0,
  away_score: 0,
  scheduled_at: scheduledAt,
  started_at: scheduledAt,
  ended_at: null,
  venue: "Ground",
});

afterEach(() => vi.unstubAllGlobals());

describe("getAllLiveMatches", () => {
  it("follows pagination, deduplicates IDs, and sorts deterministically", async () => {
    const later = match(9, "2026-01-02T12:00:00Z");
    const earlier = match(8, "2026-01-01T12:00:00Z");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 2, next: "http://api.test/api/live-matches/?page=2", previous: null, results: [later] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 2, next: null, previous: "http://api.test/api/live-matches/", results: [earlier, { ...later, home_score: 1 }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAllLiveMatches();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.map(({ id }) => id)).toEqual([8, 9]);
    expect(result[1].home_score).toBe(1);
  });
});
