from dataclasses import dataclass

from football.models import EventTeam, Match, MatchEvent, MatchEventType, MatchStatus


@dataclass(frozen=True)
class StandingRow:
    team_id: int
    team_name: str
    team_code: str
    played: int
    won: int
    drawn: int
    lost: int
    goals_for: int
    goals_against: int
    goal_difference: int
    match_points: int
    reward_points: int
    total_points: int


def calculate_standings(*, event_id: int) -> list[StandingRow]:
    event_teams = EventTeam.objects.filter(event_id=event_id).select_related("team")
    rows = {
        event_team.team_id: {
            "team_id": event_team.team_id,
            "team_name": event_team.team.name,
            "team_code": event_team.team.code,
            "played": 0,
            "won": 0,
            "drawn": 0,
            "lost": 0,
            "goals_for": 0,
            "goals_against": 0,
            "match_points": 0,
            "reward_points": 0,
        }
        for event_team in event_teams
    }

    finished_matches = Match.objects.filter(
        round__event_id=event_id,
        status=MatchStatus.FINISHED,
    )
    for match in finished_matches:
        home = rows[match.home_team_id]
        away = rows[match.away_team_id]

        home["played"] += 1
        away["played"] += 1
        home["goals_for"] += match.home_score
        home["goals_against"] += match.away_score
        away["goals_for"] += match.away_score
        away["goals_against"] += match.home_score

        if match.home_score > match.away_score:
            home["won"] += 1
            home["match_points"] += 3
            away["lost"] += 1
        elif match.home_score < match.away_score:
            away["won"] += 1
            away["match_points"] += 3
            home["lost"] += 1
        else:
            home["drawn"] += 1
            away["drawn"] += 1
            home["match_points"] += 1
            away["match_points"] += 1

    rewards = MatchEvent.objects.filter(
        match__round__event_id=event_id,
        match__status=MatchStatus.FINISHED,
        type=MatchEventType.REWARD,
    ).values_list("team_id", "points")
    for team_id, points in rewards:
        rows[team_id]["reward_points"] += points

    standings = [
        StandingRow(
            **row,
            goal_difference=row["goals_for"] - row["goals_against"],
            total_points=row["match_points"] + row["reward_points"],
        )
        for row in rows.values()
    ]
    return sorted(
        standings,
        key=lambda row: (
            -row.total_points,
            -row.goal_difference,
            -row.goals_for,
            row.team_name,
            row.team_id,
        ),
    )
