import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/client";
import { adminResources } from "@/lib/admin/resources";
import { EventWorkspace } from "./EventWorkspace";

vi.mock("@/lib/admin/resources", () => ({ adminResources: {
  event: vi.fn(), teams: vi.fn(), assignments: vi.fn(), rounds: vi.fn(),
  assignTeam: vi.fn(), removeAssignment: vi.fn(), createRound: vi.fn(),
  updateRound: vi.fn(), deleteRound: vi.fn(), createMatch: vi.fn(),
  updateMatch: vi.fn(), deleteMatch: vi.fn(),
} }));

const alpha = { id: 1, name: "Alpha", code: "ALP", logo: null };
const beta = { id: 2, name: "Beta", code: "BET", logo: null };
const gamma = { id: 3, name: "Gamma", code: "GAM", logo: null };
const event = { id: 5, name: "Cup", description: "", start_date: "2026-01-01", end_date: "2026-01-02", status: "draft" as const, teams: [alpha, beta], rounds: [], created_at: "", updated_at: "" };
const assignments = [
  { id: 11, event: 5, team: alpha, created_at: "" },
  { id: 12, event: 5, team: beta, created_at: "" },
];
const rounds = [{ id: 7, event: 5, name: "Final", order: 1, created_at: "", matches: [] }];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminResources.event).mockResolvedValue(event);
  vi.mocked(adminResources.teams).mockResolvedValue([alpha, beta, gamma]);
  vi.mocked(adminResources.assignments).mockResolvedValue(assignments);
  vi.mocked(adminResources.rounds).mockResolvedValue(rounds);
  vi.mocked(adminResources.assignTeam).mockResolvedValue({});
  vi.mocked(adminResources.deleteRound).mockResolvedValue();
  vi.mocked(adminResources.createMatch).mockResolvedValue({});
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("EventWorkspace", () => {
  it("assigns an available team without requiring typed IDs", async () => {
    render(<EventWorkspace eventId={5} />);
    const selector = await screen.findByLabelText("Available team");
    fireEvent.change(selector, { target: { value: "3" } });
    fireEvent.submit(selector.closest("form")!);
    await waitFor(() => expect(adminResources.assignTeam).toHaveBeenCalledWith(5, 3));
  });

  it("shows a controlled protected-assignment error and warns about round cascades", async () => {
    vi.mocked(adminResources.removeAssignment).mockRejectedValue(new AdminApiError("Referenced assignment", 409, { code: "protected_resource", detail: "Referenced assignment" }));
    render(<EventWorkspace eventId={5} />);
    await screen.findByText("Alpha (ALP)");
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    expect((await screen.findByRole("alert")).textContent).toContain("Referenced assignment");
    fireEvent.click(screen.getByRole("button", { name: "Delete round" }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("All matches"));
  });

  it("creates a match from round and registered-team selectors", async () => {
    render(<EventWorkspace eventId={5} />);
    await screen.findByText("Final");
    fireEvent.change(screen.getByLabelText("Round"), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText("Home team"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Away team"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Scheduled time"), { target: { value: "2026-01-01T12:00" } });
    fireEvent.change(screen.getByLabelText("Venue"), { target: { value: "Ground" } });
    fireEvent.click(screen.getByRole("button", { name: "Create match" }));
    await waitFor(() => expect(adminResources.createMatch).toHaveBeenCalledWith({ round: 7, home_team: 1, away_team: 2, scheduled_at: new Date("2026-01-01T12:00").toISOString(), venue: "Ground" }));
  });
});
