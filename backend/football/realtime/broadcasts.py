import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from football.models import Match, MatchEvent, MatchEventType, MatchStatus

from .payloads import (
    live_match_removed_message,
    live_match_updated_message,
    match_event_message,
    match_status_message,
)


logger = logging.getLogger(__name__)
LIVE_MATCHES_GROUP = "live_matches"


def match_group_name(match_id: int) -> str:
    return f"match_{match_id}"


def _send(group: str, payload: dict) -> None:
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            raise RuntimeError("No channel layer is configured.")
        async_to_sync(channel_layer.group_send)(
            group,
            {"type": "realtime.message", "payload": payload},
        )
    except Exception:
        logger.exception("Realtime broadcast to group %s failed.", group)


def _match_queryset():
    return Match.objects.select_related(
        "round", "round__event", "home_team", "away_team"
    )


def broadcast_match_status(match_id: int) -> None:
    try:
        match = _match_queryset().get(pk=match_id)
    except Match.DoesNotExist:
        logger.warning("Skipped status broadcast for deleted match %s.", match_id)
        return

    _send(match_group_name(match.pk), match_status_message(match))
    if match.status == MatchStatus.LIVE:
        _send(
            LIVE_MATCHES_GROUP,
            live_match_updated_message(match, reason="started"),
        )
    elif match.status == MatchStatus.FINISHED:
        _send(LIVE_MATCHES_GROUP, live_match_removed_message(match))


def broadcast_match_event(event_id: int) -> None:
    try:
        event = MatchEvent.objects.select_related(
            "team",
            "match__round",
            "match__round__event",
            "match__home_team",
            "match__away_team",
        ).get(pk=event_id)
    except MatchEvent.DoesNotExist:
        logger.warning("Skipped broadcast for deleted match event %s.", event_id)
        return

    _send(match_group_name(event.match_id), match_event_message(event))
    if event.type == MatchEventType.GOAL:
        _send(
            LIVE_MATCHES_GROUP,
            live_match_updated_message(event.match, reason="score_changed"),
        )
