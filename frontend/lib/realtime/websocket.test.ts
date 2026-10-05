import { afterEach, describe, expect, it } from "vitest";
import { buildWebSocketUrl, reconnectDelay } from "./websocket";

const originalUrl = process.env.NEXT_PUBLIC_WS_URL;

afterEach(() => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_WS_URL;
  else process.env.NEXT_PUBLIC_WS_URL = originalUrl;
});

describe("buildWebSocketUrl", () => {
  it("normalizes slashes while preserving the route trailing slash", () => {
    process.env.NEXT_PUBLIC_WS_URL = "ws://localhost:8000/ws///";
    expect(buildWebSocketUrl("//matches/12//")).toBe("ws://localhost:8000/ws/matches/12/");
  });

  it("rejects missing and non-WebSocket configuration", () => {
    delete process.env.NEXT_PUBLIC_WS_URL;
    expect(() => buildWebSocketUrl("/live-matches/")).toThrow("NEXT_PUBLIC_WS_URL");
    process.env.NEXT_PUBLIC_WS_URL = "http://localhost:8000/ws";
    expect(() => buildWebSocketUrl("/live-matches/")).toThrow("ws:// or wss://");
  });
});

it("uses bounded exponential retry delays", () => {
  expect([0, 1, 2, 3, 4, 5, 20].map(reconnectDelay)).toEqual([
    500, 1_000, 2_000, 4_000, 8_000, 15_000, 15_000,
  ]);
});
