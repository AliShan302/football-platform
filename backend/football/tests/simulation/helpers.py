from datetime import date

from django.utils import timezone

from football.models import Event, EventTeam, Match, Round, Team


def create_match(*, event_name="Simulation Cup", round_order=1):
    event = Event.objects.create(
        name=event_name,
        start_date=date(2026, 10, 10),
        end_date=date(2026, 10, 20),
    )
    home = Team.objects.create(name=f"Home {event.pk}", code=f"H{event.pk}")
    away = Team.objects.create(name=f"Away {event.pk}", code=f"A{event.pk}")
    EventTeam.objects.create(event=event, team=home)
    EventTeam.objects.create(event=event, team=away)
    round_obj = Round.objects.create(event=event, name="Final", order=round_order)
    match = Match.objects.create(
        round=round_obj,
        home_team=home,
        away_team=away,
        scheduled_at=timezone.now(),
    )
    return event, match, home, away
