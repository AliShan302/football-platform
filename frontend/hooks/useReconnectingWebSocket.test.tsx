import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReconnectingWebSocket } from "./useReconnectingWebSocket";

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  onopen: (() => void | Promise<void>) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  readyState = 0;
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  });

  constructor(public readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  open() {
    this.readyState = MockWebSocket.OPEN;
    return this.onopen?.();
  }

  message(data: unknown) {
    this.onmessage?.({ data });
  }

  serverClose() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.useFakeTimers();
  MockWebSocket.instances = [];
  vi.stubGlobal("WebSocket", MockWebSocket);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useReconnectingWebSocket", () => {
  it("connects, buffers during REST resync, then reports connected", async () => {
    const rest = deferred<string>();
    const onSynchronized = vi.fn();
    const onMessage = vi.fn();
    const { result } = renderHook(() => useReconnectingWebSocket({
      url: "ws://example.test/ws/live-matches/",
      parseMessage: (raw) => typeof raw === "string" ? raw : null,
      resynchronize: () => rest.promise,
      onSynchronized,
      onMessage,
    }));

    const socket = MockWebSocket.instances[0];
    expect(result.current.status).toBe("connecting");
    await act(async () => { socket.open(); });
    act(() => socket.message("goal"));
    await act(async () => { rest.resolve("older REST"); await rest.promise; });

    expect(onSynchronized).toHaveBeenCalledWith("older REST", ["goal"]);
    expect(onMessage).not.toHaveBeenCalled();
    expect(result.current.status).toBe("connected");
  });

  it("reconnects after an unexpected close and ignores stale generations", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const resynchronize = vi.fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const onSynchronized = vi.fn();
    const { result } = renderHook(() => useReconnectingWebSocket({
      url: "ws://example.test/ws/live-matches/",
      parseMessage: (raw) => String(raw),
      resynchronize,
      onSynchronized,
      onMessage: vi.fn(),
    }));

    const socketOne = MockWebSocket.instances[0];
    await act(async () => { socketOne.open(); });
    act(() => socketOne.serverClose());
    expect(result.current.status).toBe("reconnecting");
    await act(async () => { vi.advanceTimersByTime(500); });
    const socketTwo = MockWebSocket.instances[1];
    await act(async () => { socketTwo.open(); });
    await act(async () => { second.resolve("new"); await second.promise; });
    await act(async () => { first.resolve("stale"); await first.promise; });

    expect(onSynchronized).toHaveBeenCalledTimes(1);
    expect(onSynchronized).toHaveBeenCalledWith("new", []);
    expect(result.current.status).toBe("connected");
  });

  it("retries a failed resync and resets the delay after success", async () => {
    const resynchronize = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue("fresh");
    const { result } = renderHook(() => useReconnectingWebSocket({
      url: "ws://example.test/ws/live-matches/",
      parseMessage: (raw) => String(raw),
      resynchronize,
      onSynchronized: vi.fn(),
      onMessage: vi.fn(),
    }));

    await act(async () => { await MockWebSocket.instances[0].open(); });
    expect(result.current.status).toBe("reconnecting");
    await act(async () => { vi.advanceTimersByTime(500); });
    await act(async () => { await MockWebSocket.instances[1].open(); });
    expect(result.current.status).toBe("connected");
    act(() => MockWebSocket.instances[1].serverClose());
    await act(async () => { vi.advanceTimersByTime(499); });
    expect(MockWebSocket.instances).toHaveLength(2);
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(MockWebSocket.instances).toHaveLength(3);
  });

  it("cleans up the socket, timer, and in-flight REST request on unmount", async () => {
    let signal: AbortSignal | undefined;
    const rest = deferred<string>();
    const { unmount } = renderHook(() => useReconnectingWebSocket({
      url: "ws://example.test/ws/live-matches/",
      parseMessage: (raw) => String(raw),
      resynchronize: (currentSignal) => { signal = currentSignal; return rest.promise; },
      onSynchronized: vi.fn(),
      onMessage: vi.fn(),
    }));
    const socket = MockWebSocket.instances[0];
    await act(async () => { socket.open(); });
    unmount();
    expect(signal?.aborted).toBe(true);
    expect(socket.close).toHaveBeenCalled();
    act(() => vi.runAllTimers());
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it("does not reconnect after an intentional close", () => {
    const { result } = renderHook(() => useReconnectingWebSocket({
      url: "ws://example.test/ws/live-matches/",
      parseMessage: (raw) => String(raw),
      resynchronize: async () => "fresh",
      onSynchronized: vi.fn(),
      onMessage: vi.fn(),
    }));
    act(() => result.current.closePermanently());
    act(() => vi.runAllTimers());
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(result.current.status).toBe("disconnected");
  });
});

