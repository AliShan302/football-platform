import { apiFetch } from "./client";
import type { MatchDetail, MatchSummary, PaginatedResponse } from "./types";
import { sortLiveMatches } from "../realtime/reducers";

export function getMatch(id: string, signal?: AbortSignal) {
  return apiFetch<MatchDetail>(`/matches/${encodeURIComponent(id)}/`, signal);
}

export function getLiveMatches() {
  return apiFetch<PaginatedResponse<MatchSummary>>("/live-matches/");
}

export async function getAllLiveMatches(signal?: AbortSignal) {
  const matches = new Map<number, MatchSummary>();
  let next: string | null = "/live-matches/";
  let pages = 0;

  while (next && pages < 100) {
    const page: PaginatedResponse<MatchSummary> = await apiFetch(next, signal);
    for (const match of page.results) matches.set(match.id, match);
    next = page.next;
    pages += 1;
  }
  if (next) throw new Error("Live-match pagination exceeded the 100-page safety limit.");
  return sortLiveMatches([...matches.values()]);
}
