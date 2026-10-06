from django.db import transaction
from django.db.models import Q

from football.exceptions import MatchFixtureLocked, ProtectedEventTeamAssignment
from football.models import EventTeam, Match, MatchStatus


@transaction.atomic
def delete_event_team_assignment(*, assignment: EventTeam) -> None:
    assignment = EventTeam.objects.select_for_update().get(pk=assignment.pk)
    referenced = Match.objects.filter(
        round__event_id=assignment.event_id,
    ).filter(
        Q(home_team_id=assignment.team_id) | Q(away_team_id=assignment.team_id)
    ).exists()
    if referenced:
        raise ProtectedEventTeamAssignment(
            event_id=assignment.event_id,
            team_id=assignment.team_id,
        )
    assignment.delete()


def validate_match_fixture_update(*, match: Match, changes: dict) -> None:
    if match.status == MatchStatus.SCHEDULED:
        return

    relation_fields = {"round", "home_team", "away_team"}
    fixture_fields = relation_fields | {"scheduled_at", "venue"}
    for field in fixture_fields.intersection(changes):
        current = getattr(match, field)
        proposed = changes[field]
        if field in relation_fields:
            current = current.pk
            proposed = proposed.pk
        if current != proposed:
            raise MatchFixtureLocked(match_id=match.pk, status=match.status)
