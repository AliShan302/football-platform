import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchDetail, MatchSummary } from "@/lib/api/types";
import type {
  LiveMatchesRealtimeMessage,
  MatchRealtimeMessage,
} from "@/lib/realtime/types";
import { useReconnectingWebSocket } from "@/hooks/useReconnectingWebSocket";
import { RealtimeLiveMatches } from "./RealtimeLiveMatches";
import { RealtimeMatchView } from "./RealtimeMatchView";

vi.mock("@/hooks/useReconnectingWebSocket", () => ({
  useReconnectingWebSocket: vi.fn(),
}));

const mockedHook = vi.mocked(useReconnectingWebSocket);
const closePermanently = vi.fn();
const home = { id: 1, name: "Alpha", code: "ALP", logo: null };
const away = { id: 2, name: "Beta", code: "BET", logo: null };

function matchSummary(): MatchSummary {
  return {
    id: 8,
    event_id: 3,
    round_id: 4,
    home_team: home,
    away_team: away,
    status: "live",
    scheduled_at: "2026-01-01T12:00:00Z",
    venue: "Ground",
    started_at: "2026-01-01T12:00:00Z",
    ended_at: null,
    home_score: 1,
    away_score: 0,
  };
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_WS_URL = "ws://localhost:8000/ws";
  closePermanently.mockReset();
  mockedHook.mockReturnValue({ status: "connected", closePermanently });
});

describe("realtime view behavior", () => {
  it("shows the existing empty state after the final live match is removed", () => {
    render(<RealtimeLiveMatches initialMatches={[matchSummary()]} />);
    const options = mockedHook.mock.calls[0][0] as unknown as {
      onMessage: (message: LiveMatchesRealtimeMessage) => void;
    };
    act(() => options.onMessage({
      version: 1,
      type: "live_match.removed",
      match_id: 8,
      status: "finished",
      final_score: { home: 1, away: 0 },
      ended_at: "2026-01-01T13:00:00Z",
    }));
    expect(screen.getByText("No matches are currently live")).toBeTruthy();
  });

  it("links admin live matches directly to their controls", () => {
    render(<RealtimeLiveMatches initialMatches={[matchSummary()]} adminControls />);
    expect(screen.getByRole("link", { name: /Control match/ }).getAttribute("href")).toBe("/admin/matches/8");
  });

  it("applies a finished status before intentionally closing the match socket", () => {
    const initialMatch: MatchDetail = { ...matchSummary(), match_events: [] };
    render(<RealtimeMatchView initialMatch={initialMatch} />);
    const options = mockedHook.mock.calls[0][0] as unknown as {
      onMessage: (message: MatchRealtimeMessage) => void;
    };
    act(() => options.onMessage({
      version: 1,
      type: "match.status",
      match_id: 8,
      status: "finished",
      started_at: initialMatch.started_at,
      ended_at: "2026-01-01T13:00:00Z",
      score: { home: 2, away: 1 },
    }));
    expect(screen.getByText("Finished")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Match scoreboard" }).textContent).toContain("2 – 1");
    expect(closePermanently).toHaveBeenCalled();
  });
});
