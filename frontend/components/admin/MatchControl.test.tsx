import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchDetail, MatchEventType } from "@/lib/api/types";
import { useRealtimeMatch } from "@/hooks/useRealtimeMatch";
import { adminResources } from "@/lib/admin/resources";
import { MatchControl } from "./MatchControl";

vi.mock("@/hooks/useRealtimeMatch", () => ({ useRealtimeMatch: vi.fn() }));
vi.mock("@/lib/admin/resources", () => ({ adminResources: {
  startMatch: vi.fn(), finishMatch: vi.fn(), addGoal: vi.fn(), addPenalty: vi.fn(), addReward: vi.fn(),
} }));

const mockedRealtime = vi.mocked(useRealtimeMatch);
const home = { id: 1, name: "Alpha", code: "ALP", logo: null };
const away = { id: 2, name: "Beta", code: "BET", logo: null };
const baseMatch = (status: MatchDetail["status"] = "live"): MatchDetail => ({ id: 8, event_id: 3, round_id: 4, home_team: home, away_team: away, status, scheduled_at: "2026-01-01T12:00:00Z", venue: "Ground", started_at: status === "scheduled" ? null : "2026-01-01T12:00:00Z", ended_at: status === "finished" ? "2026-01-01T13:00:00Z" : null, home_score: 0, away_score: 0, match_events: [] });
const eventResponse = (type: MatchEventType) => ({ event: { id: 20, team: home, type, player_name: "Player", minute: 10, points: type === "reward" ? -1 : 0, note: "Note", created_at: "2026-01-01T12:10:00Z" }, match: baseMatch() });
const applyActionMatch = vi.fn(); const applyActionEvent = vi.fn();

beforeEach(() => {
  applyActionMatch.mockReset(); applyActionEvent.mockReset();
  mockedRealtime.mockImplementation((initial) => ({ match: initial, connectionStatus: "connected", applyActionMatch, applyActionEvent }));
  vi.mocked(adminResources.addGoal).mockResolvedValue(eventResponse("goal"));
  vi.mocked(adminResources.addPenalty).mockResolvedValue(eventResponse("yellow_card"));
  vi.mocked(adminResources.addReward).mockResolvedValue(eventResponse("reward"));
  vi.mocked(adminResources.startMatch).mockResolvedValue(baseMatch("live"));
  vi.mocked(adminResources.finishMatch).mockResolvedValue(baseMatch("finished"));
});

function fillCommon() {
  fireEvent.change(screen.getByLabelText("Minute"), { target: { value: "10" } });
  fireEvent.change(screen.getByLabelText("Note"), { target: { value: "Note" } });
}

describe("MatchControl", () => {
  it("shows only lifecycle-appropriate controls", () => {
    const { rerender } = render(<MatchControl initialMatch={baseMatch("scheduled")} />);
    expect(screen.getByRole("button", { name: "Start match" })).toBeTruthy();
    rerender(<MatchControl initialMatch={baseMatch("finished")} />);
    expect(screen.queryByRole("button", { name: /Add goal/i })).toBeNull();
    expect(screen.getByText(/controls are read-only/i)).toBeTruthy();
  });

  it("sends the exact goal payload and reconciles the backend event", async () => {
    render(<MatchControl initialMatch={baseMatch()} />); fillCommon();
    fireEvent.change(screen.getByLabelText("Player name"), { target: { value: "Player" } });
    fireEvent.submit(screen.getByLabelText("Minute").closest("form")!);
    await waitFor(() => expect(adminResources.addGoal).toHaveBeenCalledWith(8, { team_id: 1, minute: 10, player_name: "Player", note: "Note" }));
    expect(applyActionEvent).toHaveBeenCalled();
  });

  it("sends explicit penalty type without scoring locally", async () => {
    render(<MatchControl initialMatch={baseMatch()} />);
    fireEvent.click(screen.getByRole("button", { name: "Add Yellow card" })); fillCommon();
    fireEvent.change(screen.getByLabelText("Player name"), { target: { value: "Player" } });
    fireEvent.submit(screen.getByLabelText("Minute").closest("form")!);
    await waitFor(() => expect(adminResources.addPenalty).toHaveBeenCalledWith(8, { team_id: 1, minute: 10, penalty_type: "yellow_card", player_name: "Player", note: "Note" }));
    expect(applyActionEvent).toHaveBeenCalled();
  });

  it("supports negative nonzero reward payloads", async () => {
    render(<MatchControl initialMatch={baseMatch()} />);
    fireEvent.click(screen.getByRole("button", { name: "Add Reward" })); fillCommon();
    fireEvent.change(screen.getByLabelText("Points"), { target: { value: "-1" } });
    fireEvent.submit(screen.getByLabelText("Minute").closest("form")!);
    await waitFor(() => expect(adminResources.addReward).toHaveBeenCalledWith(8, { team_id: 1, minute: 10, points: -1, note: "Note" }));
    expect(applyActionEvent).toHaveBeenCalled();
  });
});
