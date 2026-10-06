import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/client";
import { adminResources } from "@/lib/admin/resources";
import { EventForm } from "./EventForm";
import { TeamForm } from "./TeamForm";

const push = vi.fn(); const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@/lib/admin/resources", () => ({ adminResources: {
  event: vi.fn(), createEvent: vi.fn(), updateEvent: vi.fn(),
  team: vi.fn(), createTeam: vi.fn(), updateTeam: vi.fn(),
} }));

beforeEach(() => { push.mockReset(); refresh.mockReset(); vi.clearAllMocks(); });

describe("admin forms", () => {
  it("creates an event with the exact writable fields", async () => {
    vi.mocked(adminResources.createEvent).mockResolvedValue({ id: 7 } as never);
    render(<EventForm />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Cup" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Demo" } });
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-01-02" } });
    fireEvent.click(screen.getByRole("button", { name: "Save event" }));
    await waitFor(() => expect(adminResources.createEvent).toHaveBeenCalledWith({ name: "Cup", description: "Demo", start_date: "2026-01-01", end_date: "2026-01-02", status: "draft" }));
    expect(push).toHaveBeenCalledWith("/admin/events/7");
  });

  it("shows backend validation errors without clearing useful input", async () => {
    vi.mocked(adminResources.createEvent).mockRejectedValue(new AdminApiError("Bad request", 400, { end_date: ["End date cannot be before start date."] }));
    render(<EventForm />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Cup" } });
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-01-02" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Save event" }));
    expect((await screen.findByRole("alert")).textContent).toContain("End date cannot be before start date.");
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Cup");
  });

  it("edits only team name and code while preserving an existing logo", async () => {
    vi.mocked(adminResources.team).mockResolvedValue({ id: 2, name: "Alpha", code: "ALP", logo: "/logo.png" });
    vi.mocked(adminResources.updateTeam).mockResolvedValue({ id: 2, name: "Alpha FC", code: "ALP", logo: "/logo.png" });
    render(<TeamForm teamId={2} />);
    await screen.findByDisplayValue("Alpha");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Alpha FC" } });
    fireEvent.click(screen.getByRole("button", { name: "Save team" }));
    await waitFor(() => expect(adminResources.updateTeam).toHaveBeenCalledWith(2, { name: "Alpha FC", code: "ALP" }));
  });

  it("uploads an optional team logo as multipart form data", async () => {
    vi.mocked(adminResources.createTeam).mockResolvedValue({ id: 3, name: "Arsenal", code: "ARS", logo: "/media/arsenal.webp" });
    render(<TeamForm />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Arsenal" } });
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "ARS" } });
    const logo = new File(["logo"], "arsenal.webp", { type: "image/webp" });
    fireEvent.change(screen.getByLabelText(/Team logo/), { target: { files: [logo] } });
    fireEvent.click(screen.getByRole("button", { name: "Save team" }));
    await waitFor(() => expect(adminResources.createTeam).toHaveBeenCalled());
    const payload = vi.mocked(adminResources.createTeam).mock.calls[0][0];
    expect(payload).toBeInstanceOf(FormData);
    expect((payload as FormData).get("name")).toBe("Arsenal");
    expect((payload as FormData).get("code")).toBe("ARS");
    expect((payload as FormData).get("logo")).toBe(logo);
  });
});
