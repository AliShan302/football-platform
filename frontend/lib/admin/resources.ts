import type { EventDetail, EventSummary, MatchDetail, PaginatedResponse, TeamSummary } from "@/lib/api/types";
import { adminFetch } from "./client";
import type { EventInput, EventTeamAssignment, MatchActionResponse, MatchInput, RoundInput, TeamInput } from "./types";

export async function getAllPages<T>(path: string): Promise<T[]> {
  const items = new Map<number, T>();
  let next: string | null = path;
  let pages = 0;
  while (next && pages < 100) {
    const page: PaginatedResponse<T> = await adminFetch(next);
    for (const item of page.results) items.set((item as { id: number }).id, item);
    next = page.next;
    pages += 1;
  }
  if (next) throw new Error("Pagination exceeded the 100-page safety limit.");
  return [...items.values()];
}

export const adminResources = {
  events: () => getAllPages<EventSummary>("/events/"),
  event: (id: number | string) => adminFetch<EventDetail>(`/events/${id}/`),
  createEvent: (data: EventInput) => adminFetch<EventDetail>("/events/", { method: "POST", body: JSON.stringify(data) }),
  updateEvent: (id: number, data: Partial<EventInput>) => adminFetch<EventDetail>(`/events/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteEvent: (id: number) => adminFetch<void>(`/events/${id}/`, { method: "DELETE" }),
  teams: () => getAllPages<TeamSummary>("/teams/"),
  team: (id: number | string) => adminFetch<TeamSummary>(`/teams/${id}/`),
  createTeam: (data: TeamInput) => adminFetch<TeamSummary>("/teams/", { method: "POST", body: JSON.stringify(data) }),
  updateTeam: (id: number, data: TeamInput) => adminFetch<TeamSummary>(`/teams/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTeam: (id: number) => adminFetch<void>(`/teams/${id}/`, { method: "DELETE" }),
  assignments: (eventId: number) => getAllPages<EventTeamAssignment>(`/event-teams/?event=${eventId}`),
  assignTeam: (event: number, team: number) => adminFetch("/event-teams/", { method: "POST", body: JSON.stringify({ event, team }) }),
  removeAssignment: (id: number) => adminFetch<void>(`/event-teams/${id}/`, { method: "DELETE" }),
  rounds: (eventId: number) => getAllPages<import("./types").AdminRound>(`/rounds/?event=${eventId}`),
  createRound: (data: RoundInput) => adminFetch("/rounds/", { method: "POST", body: JSON.stringify(data) }),
  updateRound: (id: number, data: Partial<RoundInput>) => adminFetch(`/rounds/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteRound: (id: number) => adminFetch<void>(`/rounds/${id}/`, { method: "DELETE" }),
  match: (id: number | string) => adminFetch<MatchDetail>(`/matches/${id}/`),
  createMatch: (data: MatchInput) => adminFetch("/matches/", { method: "POST", body: JSON.stringify(data) }),
  updateMatch: (id: number, data: MatchInput) => adminFetch(`/matches/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteMatch: (id: number) => adminFetch<void>(`/matches/${id}/`, { method: "DELETE" }),
  startMatch: (id: number) => adminFetch<MatchDetail>(`/matches/${id}/start/`, { method: "POST", body: "{}" }),
  finishMatch: (id: number) => adminFetch<MatchDetail>(`/matches/${id}/finish/`, { method: "POST", body: "{}" }),
  addGoal: (id: number, data: object) => adminFetch<MatchActionResponse>(`/matches/${id}/goals/`, { method: "POST", body: JSON.stringify(data) }),
  addPenalty: (id: number, data: object) => adminFetch<MatchActionResponse>(`/matches/${id}/penalties/`, { method: "POST", body: JSON.stringify(data) }),
  addReward: (id: number, data: object) => adminFetch<MatchActionResponse>(`/matches/${id}/rewards/`, { method: "POST", body: JSON.stringify(data) }),
};
