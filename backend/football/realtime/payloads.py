from datetime import datetime


PROTOCOL_VERSION = 1


def _datetime(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.isoformat().replace("+00:00", "Z")


def team_payload(team) -> dict:
    return {
        "id": team.pk,
        "name": team.name,
        "code": team.code,
        "logo": team.logo.url if team.logo else None,
    }


def match_summary_payload(match) -> dict:
    return {
        "id": match.pk,
        "event_id": match.round.event_id,
        "round_id": match.round_id,
        "home_team": team_payload(match.home_team),
        "away_team": team_payload(match.away_team),
        "status": match.status,
        "home_score": match.home_score,
        "away_score": match.away_score,
        "scheduled_at": _datetime(match.scheduled_at),
        "started_at": _datetime(match.started_at),
        "ended_at": _datetime(match.ended_at),
        "venue": match.venue,
    }


def match_event_payload(event) -> dict:
    return {
        "id": event.pk,
        "type": event.type,
        "team": team_payload(event.team),
        "player_name": event.player_name,
        "minute": event.minute,
        "points": event.points,
        "note": event.note,
        "created_at": _datetime(event.created_at),
    }


def score_payload(match) -> dict:
    return {"home": match.home_score, "away": match.away_score}


def match_status_message(match) -> dict:
    return {
        "version": PROTOCOL_VERSION,
        "type": "match.status",
        "match_id": match.pk,
        "status": match.status,
        "started_at": _datetime(match.started_at),
        "ended_at": _datetime(match.ended_at),
        "score": score_payload(match),
    }


def match_event_message(event) -> dict:
    return {
        "version": PROTOCOL_VERSION,
        "type": "match.event",
        "match_id": event.match_id,
        "event": match_event_payload(event),
        "score": score_payload(event.match),
    }


def live_match_updated_message(match, *, reason: str) -> dict:
    return {
        "version": PROTOCOL_VERSION,
        "type": "live_match.updated",
        "reason": reason,
        "match": match_summary_payload(match),
    }


def live_match_removed_message(match) -> dict:
    return {
        "version": PROTOCOL_VERSION,
        "type": "live_match.removed",
        "match_id": match.pk,
        "status": match.status,
        "final_score": score_payload(match),
        "ended_at": _datetime(match.ended_at),
    }


def standings_updated_message(*, event_id: int, match_id: int, standings) -> dict:
    return {
        "version": PROTOCOL_VERSION,
        "type": "standings.updated",
        "event_id": event_id,
        "trigger_match_id": match_id,
        "standings": [
            {
                "team_id": row.team_id,
                "team_name": row.team_name,
                "team_code": row.team_code,
                "played": row.played,
                "won": row.won,
                "drawn": row.drawn,
                "lost": row.lost,
                "goals_for": row.goals_for,
                "goals_against": row.goals_against,
                "goal_difference": row.goal_difference,
                "match_points": row.match_points,
                "reward_points": row.reward_points,
                "total_points": row.total_points,
            }
            for row in standings
        ],
    }
