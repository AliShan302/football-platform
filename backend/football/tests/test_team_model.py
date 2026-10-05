from datetime import date

from django.db import IntegrityError
from django.test import TestCase

from football.models import Event, EventTeam, Team


class TeamModelTests(TestCase):

    def setUp(self):
        self.event = Event.objects.create(
            name="Champions Cup",
            start_date=date(2026, 10, 10),
            end_date=date(2026, 10, 20),
        )

        self.team = Team.objects.create(
            name="Arsenal",
            code="ARS",
        )

    def test_create_team(self):
        self.assertEqual(self.team.name, "Arsenal")
        self.assertEqual(str(self.team), "Arsenal (ARS)")

    def test_assign_team_to_event(self):
        event_team = EventTeam.objects.create(
            event=self.event,
            team=self.team,
        )

        self.assertEqual(event_team.event, self.event)
        self.assertEqual(event_team.team, self.team)

    def test_team_cannot_be_added_twice_to_same_event(self):
        EventTeam.objects.create(
            event=self.event,
            team=self.team,
        )

        with self.assertRaises(IntegrityError):
            EventTeam.objects.create(
                event=self.event,
                team=self.team,
            )