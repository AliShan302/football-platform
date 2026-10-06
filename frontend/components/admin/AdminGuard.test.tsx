import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminGuard } from "./AdminGuard";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/contexts/AdminAuthContext", () => ({ useAdminAuth: vi.fn() }));
const auth = vi.mocked(useAdminAuth);

beforeEach(() => replace.mockReset());

describe("AdminGuard", () => {
  it("shows loading state during bootstrap", () => {
    auth.mockReturnValue({ user: null, loading: true, login: vi.fn(), logout: vi.fn() });
    render(<AdminGuard><p>Protected</p></AdminGuard>);
    expect(screen.getByRole("status").textContent).toContain("Checking");
  });
  it("redirects unauthenticated users", () => {
    auth.mockReturnValue({ user: null, loading: false, login: vi.fn(), logout: vi.fn() });
    render(<AdminGuard><p>Protected</p></AdminGuard>);
    expect(replace).toHaveBeenCalledWith("/admin/login");
  });
  it("shows forbidden state for authenticated non-staff users", () => {
    auth.mockReturnValue({ user: { id: 2, username: "user", is_staff: false }, loading: false, login: vi.fn(), logout: vi.fn() });
    render(<AdminGuard><p>Protected</p></AdminGuard>);
    expect(screen.getByText("Administrator access required")).toBeTruthy();
  });
  it("renders staff content", () => {
    auth.mockReturnValue({ user: { id: 1, username: "admin", is_staff: true }, loading: false, login: vi.fn(), logout: vi.fn() });
    render(<AdminGuard><p>Protected</p></AdminGuard>);
    expect(screen.getByText("Protected")).toBeTruthy();
  });
});
