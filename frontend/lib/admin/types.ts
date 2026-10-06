import type {
  EventDetail,
  EventRound,
  EventStatus,
  MatchDetail,
  MatchSummary,
  TeamSummary,
} from "@/lib/api/types";

export interface AdminUser {
  id: number;
  username: string;
  is_staff: boolean;
}

export interface AuthResponse {
  authenticated: true;
  user: AdminUser;
}

export interface EventTeamAssignment {
  id: number;
  event: number;
  team: TeamSummary;
  created_at: string;
}

export interface EventInput {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: EventStatus;
}

export interface TeamInput {
  name: string;
  code: string;
}

export interface RoundInput {
  event: number;
  name: string;
  order: number;
}

export interface MatchInput {
  round: number;
  home_team: number;
  away_team: number;
  scheduled_at: string;
  venue: string;
}

export interface MatchActionResponse {
  event: MatchDetail["match_events"][number];
  match: MatchDetail;
}

export type AdminEventDetail = EventDetail;
export type AdminRound = EventRound;
export type AdminMatch = MatchSummary;
