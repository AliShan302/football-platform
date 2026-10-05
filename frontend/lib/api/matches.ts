import { apiFetch } from "./client";
import type { MatchDetail, MatchSummary, PaginatedResponse } from "./types";

export function getMatch(id: string) {
  return apiFetch<MatchDetail>(`/matches/${encodeURIComponent(id)}/`);
}

export function getLiveMatches() {
  return apiFetch<PaginatedResponse<MatchSummary>>("/live-matches/");
}
