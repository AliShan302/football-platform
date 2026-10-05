from django.db import transaction
from django.utils import timezone

from football.exceptions import (
    InvalidEventMinute,
    InvalidMatchTransition,
    InvalidPenaltyType,
    InvalidRewardPoints,
    MatchNotFound,
    MatchNotLive,
    TeamNotInMatch,
)
from football.models import Match, MatchEvent, MatchEventType, MatchStatus


def _get_locked_match(*, match_id: int) -> Match:
    try:
        return Match.objects.select_for_update().get(pk=match_id)
    except Match.DoesNotExist as exc:
        raise MatchNotFound(match_id) from exc


def _require_live_match(*, match: Match) -> None:
    if match.status != MatchStatus.LIVE:
        raise MatchNotLive(
            match_id=match.pk,
            current_status=match.status,
        )


def _validate_participating_team(*, match: Match, team_id: int) -> None:
    if team_id not in {match.home_team_id, match.away_team_id}:
        raise TeamNotInMatch(match_id=match.pk, team_id=team_id)


def _validate_minute(*, minute: int) -> None:
    if isinstance(minute, bool) or not isinstance(minute, int) or minute < 0:
        raise InvalidEventMinute(minute)


@transaction.atomic
def start_match(*, match_id: int, started_at=None) -> Match:
    match = _get_locked_match(match_id=match_id)
    if match.status != MatchStatus.SCHEDULED:
        raise InvalidMatchTransition(
            current_status=match.status,
            target_status=MatchStatus.LIVE,
        )

    match.status = MatchStatus.LIVE
    match.started_at = started_at if started_at is not None else timezone.now()
    match.ended_at = None
    match.save(update_fields=["status", "started_at", "ended_at", "updated_at"])
    return match


@transaction.atomic
def finish_match(*, match_id: int, ended_at=None) -> Match:
    match = _get_locked_match(match_id=match_id)
    if match.status != MatchStatus.LIVE:
        raise InvalidMatchTransition(
            current_status=match.status,
            target_status=MatchStatus.FINISHED,
        )

    match.status = MatchStatus.FINISHED
    match.ended_at = ended_at if ended_at is not None else timezone.now()
    match.save(update_fields=["status", "ended_at", "updated_at"])
    return match


@transaction.atomic
def add_goal(
    *,
    match_id: int,
    team_id: int,
    minute: int,
    player_name: str = "",
    note: str = "",
) -> MatchEvent:
    match = _get_locked_match(match_id=match_id)
    _require_live_match(match=match)
    _validate_participating_team(match=match, team_id=team_id)
    _validate_minute(minute=minute)

    event = MatchEvent(
        match=match,
        team_id=team_id,
        type=MatchEventType.GOAL,
        player_name=player_name,
        minute=minute,
        note=note,
    )
    event.full_clean()
    event.save()

    if team_id == match.home_team_id:
        match.home_score += 1
        score_field = "home_score"
    else:
        match.away_score += 1
        score_field = "away_score"

    match.save(update_fields=[score_field, "updated_at"])
    return event


@transaction.atomic
def add_penalty(
    *,
    match_id: int,
    team_id: int,
    penalty_type: MatchEventType,
    minute: int,
    player_name: str = "",
    note: str = "",
) -> MatchEvent:
    match = _get_locked_match(match_id=match_id)
    _require_live_match(match=match)
    _validate_participating_team(match=match, team_id=team_id)
    _validate_minute(minute=minute)
    allowed_penalty_types = {
        MatchEventType.YELLOW_CARD,
        MatchEventType.RED_CARD,
        MatchEventType.PENALTY_KICK,
    }
    if penalty_type not in allowed_penalty_types:
        raise InvalidPenaltyType(penalty_type)

    event = MatchEvent(
        match=match,
        team_id=team_id,
        type=penalty_type,
        player_name=player_name,
        minute=minute,
        note=note,
    )
    event.full_clean()
    event.save()
    return event


@transaction.atomic
def add_reward(
    *,
    match_id: int,
    team_id: int,
    minute: int,
    points: int,
    note: str = "",
) -> MatchEvent:
    match = _get_locked_match(match_id=match_id)
    _require_live_match(match=match)
    _validate_participating_team(match=match, team_id=team_id)
    _validate_minute(minute=minute)
    if isinstance(points, bool) or not isinstance(points, int) or points == 0:
        raise InvalidRewardPoints(points)

    event = MatchEvent(
        match=match,
        team_id=team_id,
        type=MatchEventType.REWARD,
        minute=minute,
        points=points,
        note=note,
    )
    event.full_clean()
    event.save()
    return event
