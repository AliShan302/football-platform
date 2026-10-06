from datetime import date, datetime, time

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from football.models import Event, EventStatus, EventTeam, Match, Round, Team


DEMO_EVENT_NAME = "Demo Championship"
TEAM_DATA = (
    ("Northbridge FC", "NBFC"),
    ("Riverside United", "RSU"),
    ("Kingsport Athletic", "KSA"),
    ("Greenfield City", "GFC"),
)
FIXTURES = (
    (1, "Opening Round", "NBFC", "RSU", "KSA", "GFC"),
    (2, "Round Two", "NBFC", "KSA", "GFC", "RSU"),
    (3, "Final Round", "NBFC", "GFC", "RSU", "KSA"),
)


def _validated_save(instance):
    instance.full_clean()
    instance.save()
    return instance


class Command(BaseCommand):
    help = "Create an idempotent four-team demonstration tournament."

    @transaction.atomic
    def handle(self, *args, **options):
        existing = Event.objects.filter(name=DEMO_EVENT_NAME).first()
        if existing is not None:
            self._report(existing, created=False)
            return

        event = _validated_save(Event(
            name=DEMO_EVENT_NAME,
            description=(
                "A four-team tournament prepared for exploring fixtures, "
                "live scoring, standings, and simulation."
            ),
            start_date=date(2030, 6, 1),
            end_date=date(2030, 6, 7),
            status=EventStatus.ACTIVE,
        ))

        teams = {}
        for name, code in TEAM_DATA:
            team, created = Team.objects.get_or_create(code=code, defaults={"name": name})
            if not created and team.name != name:
                raise CommandError(
                    f"Cannot seed demo data: team code {code!r} is already in use."
                )
            if created:
                team.full_clean()
            teams[code] = team
            _validated_save(EventTeam(event=event, team=team))

        for order, round_name, home_one, away_one, home_two, away_two in FIXTURES:
            round_obj = _validated_save(Round(event=event, name=round_name, order=order))
            for slot, (home_code, away_code) in enumerate(
                ((home_one, away_one), (home_two, away_two)), start=1
            ):
                scheduled = timezone.make_aware(datetime.combine(
                    date(2030, 6, 1 + (order - 1) * 2),
                    time(17 + slot, 0),
                ))
                _validated_save(Match(
                    round=round_obj,
                    home_team=teams[home_code],
                    away_team=teams[away_code],
                    scheduled_at=scheduled,
                    venue=f"Demo Stadium {slot}",
                ))

        self._report(event, created=True)

    def _report(self, event, *, created):
        action = "created successfully" if created else "already exists; no duplicates created"
        self.stdout.write(self.style.SUCCESS(f"Demo data {action}."))
        self.stdout.write(f"Event ID: {event.pk}")
        self.stdout.write(f"Event: {event.name}")
        self.stdout.write(f"Teams: {event.event_teams.count()}")
        self.stdout.write(f"Rounds: {event.rounds.count()}")
        self.stdout.write(f"Matches: {Match.objects.filter(round__event=event).count()}")
        self.stdout.write(f"Public event: http://localhost:3000/events/{event.pk}")
        self.stdout.write(
            f"Simulation: python manage.py simulate_event {event.pk} --speed 10 --seed 42"
        )
