from datetime import date

from django.utils import timezone

from football.models import Event, EventTeam, Match, Round, Team


def create_match():
    event = Event.objects.create(
        name="Realtime Cup",
        start_date=date(2026, 10, 10),
        end_date=date(2026, 10, 20),
    )
    home = Team.objects.create(name="Arsenal", code="ARS")
    away = Team.objects.create(name="Chelsea", code="CHE")
    EventTeam.objects.create(event=event, team=home)
    EventTeam.objects.create(event=event, team=away)
    round_obj = Round.objects.create(event=event, name="Final", order=1)
    match = Match.objects.create(
        round=round_obj,
        home_team=home,
        away_team=away,
        scheduled_at=timezone.now(),
    )
    return match, home, away


TEST_CHANNEL_LAYERS = {
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
}
