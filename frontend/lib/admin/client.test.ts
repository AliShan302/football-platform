import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError, adminFetch, ensureCsrfToken, loginRequest, logoutRequest, resetAdminClientForTests } from "./client";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => resetAdminClientForTests());
afterEach(() => vi.unstubAllGlobals());

describe("admin authentication client", () => {
  it("bootstraps CSRF and sends credentials plus CSRF on login", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ csrfToken: "csrf-value" }))
      .mockResolvedValueOnce(json({ authenticated: true, user: { id: 1, username: "admin", is_staff: true } }));
    vi.stubGlobal("fetch", fetchMock);
    await loginRequest("admin", "secret");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ credentials: "include", method: "POST" });
    expect((fetchMock.mock.calls[1][1]?.headers as Headers).get("X-CSRFToken")).toBe("csrf-value");
    expect(String(fetchMock.mock.calls[1][1]?.body)).toContain("secret");
  });

  it("preserves invalid-login errors", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(json({ csrfToken: "csrf" }))
      .mockResolvedValueOnce(json({ detail: "Invalid credentials" }, 401)));
    await expect(loginRequest("admin", "wrong")).rejects.toMatchObject({ status: 401 });
  });

  it("refreshes once, retries the original request, and shares refresh across concurrent 401s", async () => {
    let resourceCalls = 0; let refreshCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/auth/csrf/")) return json({ csrfToken: "csrf" });
      if (url.endsWith("/auth/refresh/")) { refreshCalls += 1; return json({ authenticated: true }); }
      resourceCalls += 1;
      return resourceCalls <= 2 ? json({ detail: "expired" }, 401) : json({ id: resourceCalls });
    }));
    await ensureCsrfToken();
    const [first, second] = await Promise.all([adminFetch<{ id: number }>("/teams/"), adminFetch<{ id: number }>("/events/")]);
    expect(refreshCalls).toBe(1);
    expect(first.id).toBeGreaterThan(2);
    expect(second.id).toBeGreaterThan(2);
  });

  it("does not refresh a 403", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ detail: "Forbidden" }, 403));
    vi.stubGlobal("fetch", fetchMock);
    await expect(adminFetch("/teams/")).rejects.toBeInstanceOf(AdminApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("clears client CSRF state on logout", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ csrfToken: "one" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(json({ csrfToken: "two" }));
    vi.stubGlobal("fetch", fetchMock);
    await logoutRequest();
    await ensureCsrfToken();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
