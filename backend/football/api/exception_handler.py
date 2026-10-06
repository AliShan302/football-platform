from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

from football.exceptions import (
    InvalidEventMinute,
    InvalidMatchTransition,
    InvalidPenaltyType,
    InvalidRewardPoints,
    MatchNotFound,
    MatchNotLive,
    MatchFixtureLocked,
    ProtectedEventTeamAssignment,
    TeamNotInMatch,
)


ERROR_MAPPINGS = {
    MatchNotFound: (status.HTTP_404_NOT_FOUND, "match_not_found"),
    InvalidMatchTransition: (status.HTTP_409_CONFLICT, "invalid_match_transition"),
    MatchNotLive: (status.HTTP_409_CONFLICT, "match_not_live"),
    TeamNotInMatch: (status.HTTP_400_BAD_REQUEST, "team_not_in_match"),
    InvalidEventMinute: (status.HTTP_400_BAD_REQUEST, "invalid_event_minute"),
    InvalidRewardPoints: (status.HTTP_400_BAD_REQUEST, "invalid_reward_points"),
    InvalidPenaltyType: (status.HTTP_400_BAD_REQUEST, "invalid_penalty_type"),
    ProtectedEventTeamAssignment: (
        status.HTTP_409_CONFLICT,
        "protected_resource",
    ),
    MatchFixtureLocked: (status.HTTP_409_CONFLICT, "match_fixture_locked"),
}


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        return response

    for exception_type, (status_code, code) in ERROR_MAPPINGS.items():
        if isinstance(exc, exception_type):
            return Response(
                {"code": code, "detail": str(exc)},
                status=status_code,
            )
    return None
