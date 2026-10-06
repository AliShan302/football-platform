import { apiFetch } from "./client";
import type { EventDetail, EventSummary, PaginatedResponse, StandingRow } from "./types";

export function getEvents(page = 1) {
  return apiFetch<PaginatedResponse<EventSummary>>(`/events/?page=${page}`);
}

export function getEvent(id: string) {
  return apiFetch<EventDetail>(`/events/${encodeURIComponent(id)}/`);
}

export function getStandings(id: string, signal?: AbortSignal) {
  return apiFetch<StandingRow[]>(`/events/${encodeURIComponent(id)}/standings/`, signal);
}
