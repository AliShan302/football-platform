export type EventStatus = "draft" | "active" | "completed";
export type MatchStatus = "scheduled" | "live" | "finished";
export type MatchEventType =
  | "goal"
  | "yellow_card"
  | "red_card"
  | "penalty_kick"
  | "reward";

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface TeamSummary {
  id: number;
  name: string;
  code: string;
  logo: string | null;
}

export interface EventSummary {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: EventStatus;
  team_count: number;
}

export interface MatchSummary {
  id: number;
  round_id: number;
  event_id: number;
  home_team: TeamSummary;
  away_team: TeamSummary;
  status: MatchStatus;
  scheduled_at: string;
  venue: string;
  started_at: string | null;
  ended_at: string | null;
  home_score: number;
  away_score: number;
}

export interface EventRound {
  id: number;
  event: number;
  name: string;
  order: number;
  created_at: string;
  matches: MatchSummary[];
}

export interface EventDetail {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: EventStatus;
  teams: TeamSummary[];
  rounds: EventRound[];
  created_at: string;
  updated_at: string;
}

export interface MatchEvent {
  id: number;
  team: TeamSummary;
  type: MatchEventType;
  player_name: string;
  minute: number;
  points: number;
  note: string;
  created_at: string;
}

export interface MatchDetail extends MatchSummary {
  match_events: MatchEvent[];
}

export interface StandingRow {
  team_id: number;
  team_name: string;
  team_code: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  match_points: number;
  reward_points: number;
  total_points: number;
}
