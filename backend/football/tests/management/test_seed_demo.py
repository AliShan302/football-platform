from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from football.models import Event, EventTeam, Match, Round, Team


class SeedDemoCommandTests(TestCase):
    def test_creates_valid_demo_tournament(self):
        output = StringIO()

        call_command("seed_demo", stdout=output)

        event = Event.objects.get(name="Demo Championship")
        self.assertEqual(event.event_teams.count(), 4)
        self.assertEqual(event.rounds.count(), 3)
        self.assertEqual(Match.objects.filter(round__event=event).count(), 6)
        self.assertEqual(
            EventTeam.objects.filter(event=event).values("team_id").distinct().count(),
            4,
        )
        for round_obj in event.rounds.all():
            team_ids = []
            for match in round_obj.matches.all():
                match.full_clean()
                team_ids.extend((match.home_team_id, match.away_team_id))
            self.assertEqual(len(team_ids), len(set(team_ids)))
        self.assertIn(f"Event ID: {event.pk}", output.getvalue())

    def test_rerun_is_idempotent_and_preserves_unrelated_data(self):
        unrelated = Team.objects.create(name="Independent Town", code="IND")
        call_command("seed_demo", stdout=StringIO())
        call_command("seed_demo", stdout=StringIO())

        self.assertEqual(Event.objects.filter(name="Demo Championship").count(), 1)
        self.assertEqual(Round.objects.filter(event__name="Demo Championship").count(), 3)
        self.assertEqual(Match.objects.filter(round__event__name="Demo Championship").count(), 6)
        self.assertTrue(Team.objects.filter(pk=unrelated.pk).exists())
