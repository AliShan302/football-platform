import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useReconnectingWebSocket } from "@/hooks/useReconnectingWebSocket";
import type { StandingRow } from "@/lib/api/types";
import type { StandingsRealtimeMessage } from "@/lib/realtime/types";
import { RealtimeStandings } from "./RealtimeStandings";

vi.mock("@/hooks/useReconnectingWebSocket", () => ({ useReconnectingWebSocket: vi.fn() }));

const mockedHook = vi.mocked(useReconnectingWebSocket);
const initial: StandingRow = { team_id: 1, team_name: "Alpha", team_code: "ALP", played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, goal_difference: 0, match_points: 0, reward_points: 0, total_points: 0 };
const updated: StandingRow = { ...initial, played: 1, won: 1, goals_for: 2, goal_difference: 2, match_points: 3, total_points: 3 };

beforeEach(() => {
  process.env.NEXT_PUBLIC_WS_URL = "ws://localhost:8000/ws";
  mockedHook.mockReturnValue({ status: "connected", closePermanently: vi.fn() });
});

describe("RealtimeStandings", () => {
  it("applies an event-scoped standings update", () => {
    render(<RealtimeStandings eventId={7} initialRows={[initial]} />);
    const options = mockedHook.mock.calls[0][0] as unknown as { onMessage: (message: StandingsRealtimeMessage) => void };
    act(() => options.onMessage({ version: 1, type: "standings.updated", event_id: 7, trigger_match_id: 4, standings: [updated] }));
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("applies buffered updates after a REST resynchronization", () => {
    render(<RealtimeStandings eventId={7} initialRows={[initial]} />);
    const options = mockedHook.mock.calls[0][0] as unknown as { onSynchronized: (snapshot: StandingRow[], messages: StandingsRealtimeMessage[]) => void };
    act(() => options.onSynchronized([initial], [{ version: 1, type: "standings.updated", event_id: 7, trigger_match_id: 4, standings: [updated] }]));
    expect(screen.getByText("3")).toBeTruthy();
  });
});
