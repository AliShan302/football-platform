import { getApiBaseUrl } from "@/lib/api/client";

export type ApiErrorBody =
  | { code?: string; detail?: string; non_field_errors?: string[]; [field: string]: unknown }
  | null;

export class AdminApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: ApiErrorBody = null,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

let csrfToken: string | null = null;
let csrfPromise: Promise<string> | null = null;
let refreshPromise: Promise<void> | null = null;

function apiUrl(path: string) {
  return /^https?:\/\//.test(path) ? path : `${getApiBaseUrl()}${path}`;
}

async function responseBody(response: Response): Promise<ApiErrorBody> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  return await response.json() as ApiErrorBody;
}

function errorMessage(status: number, body: ApiErrorBody) {
  if (body && typeof body.detail === "string") return body.detail;
  if (status === 401) return "Authentication is required.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 409) return "The requested change conflicts with the current state.";
  return `Request failed with status ${status}.`;
}

async function rawRequest<T>(
  path: string,
  init: RequestInit = {},
  includeCsrf = false,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (includeCsrf) headers.set("X-CSRFToken", await ensureCsrfToken());
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch (error) {
    throw new AdminApiError(
      error instanceof Error ? error.message : "The API is unavailable.",
      0,
    );
  }
  if (!response.ok) {
    const body = await responseBody(response);
    throw new AdminApiError(errorMessage(response.status, body), response.status, body);
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

export function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return Promise.resolve(csrfToken);
  if (!csrfPromise) {
    csrfPromise = rawRequest<{ csrfToken: string }>("/auth/csrf/")
      .then((data) => {
        csrfToken = data.csrfToken;
        return csrfToken;
      })
      .finally(() => { csrfPromise = null; });
  }
  return csrfPromise;
}

async function refreshAccess(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = rawRequest<{ authenticated: true }>(
      "/auth/refresh/",
      { method: "POST", body: "{}" },
      true,
    ).then(() => undefined).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function adminFetch<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const unsafe = !["GET", "HEAD", "OPTIONS"].includes(method);
  try {
    return await rawRequest<T>(path, init, unsafe);
  } catch (error) {
    if (!(error instanceof AdminApiError) || error.status !== 401 || !retry) throw error;
    try {
      await refreshAccess();
    } catch (refreshError) {
      if (typeof window !== "undefined") window.dispatchEvent(new Event("admin-auth-expired"));
      throw refreshError;
    }
    return adminFetch<T>(path, init, false);
  }
}

export async function loginRequest(username: string, password: string) {
  return rawRequest<import("./types").AuthResponse>(
    "/auth/login/",
    { method: "POST", body: JSON.stringify({ username, password }) },
    true,
  );
}

export async function logoutRequest() {
  try {
    await rawRequest<void>("/auth/logout/", { method: "POST", body: "{}" }, true);
  } finally {
    csrfToken = null;
  }
}

export function resetAdminClientForTests() {
  csrfToken = null;
  csrfPromise = null;
  refreshPromise = null;
}

export function adminErrorMessage(error: unknown): string {
  if (!(error instanceof AdminApiError)) return "Something went wrong. Please try again.";
  if (error.body) {
    const fieldMessage = Object.values(error.body).find(
      (value) => Array.isArray(value) && typeof value[0] === "string",
    );
    if (Array.isArray(fieldMessage)) return fieldMessage.join(" ");
  }
  return error.message;
}
