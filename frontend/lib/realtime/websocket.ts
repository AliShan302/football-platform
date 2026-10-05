const RETRY_DELAYS_MS = [500, 1_000, 2_000, 4_000, 8_000, 15_000] as const;

export function reconnectDelay(attempt: number): number {
  const index = Math.min(Math.max(attempt, 0), RETRY_DELAYS_MS.length - 1);
  return RETRY_DELAYS_MS[index];
}

function websocketBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (!configured) {
    throw new Error("NEXT_PUBLIC_WS_URL must be configured for realtime pages.");
  }

  const url = new URL(configured);
  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new Error("NEXT_PUBLIC_WS_URL must use ws:// or wss://.");
  }
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    url.protocol === "ws:"
  ) {
    throw new Error("Secure pages require NEXT_PUBLIC_WS_URL to use wss://.");
  }

  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function buildWebSocketUrl(path: string): string {
  const normalizedPath = `/${path.replace(/^\/+|\/+$/g, "")}/`;
  return `${websocketBaseUrl()}${normalizedPath}`;
}
