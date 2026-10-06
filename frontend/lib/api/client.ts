export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    const internal = process.env.API_INTERNAL_URL?.replace(/\/$/, "");
    if (internal) return internal;
  }
  const configured = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "http://localhost:8000/api";
  throw new Error("NEXT_PUBLIC_API_URL must be configured in production.");
}

export async function apiFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    const url = /^https?:\/\//.test(path) ? path : `${getApiBaseUrl()}${path}`;
    response = await fetch(url, { cache: "no-store", signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(
      error instanceof Error ? error.message : "The API is unavailable.",
      0,
    );
  }
  if (!response.ok) {
    throw new ApiError(`API request failed with status ${response.status}.`, response.status);
  }
  return (await response.json()) as T;
}
