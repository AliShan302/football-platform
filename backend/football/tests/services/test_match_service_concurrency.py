from concurrent.futures import ThreadPoolExecutor
from datetime import date
from threading import Barrier

from django.db import close_old_connections, connection
from django.test import TransactionTestCase
from django.utils import timezone

from football.models import Event, EventTeam, Match, Round, Team
from football.services import add_goal, start_match


class MatchServiceConcurrencyTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        if connection.vendor != "postgresql":
            self.skipTest("Row-lock concurrency tests require PostgreSQL.")

        event = Event.objects.create(
            name="Concurrency Cup",
            start_date=date(2026, 10, 10),
            end_date=date(2026, 10, 20),
        )
        self.home = Team.objects.create(name="Arsenal", code="ARS")
        self.away = Team.objects.create(name="Chelsea", code="CHE")
        EventTeam.objects.create(event=event, team=self.home)
        EventTeam.objects.create(event=event, team=self.away)
        round_obj = Round.objects.create(event=event, name="Final", order=1)
        self.match = Match.objects.create(
            round=round_obj,
            home_team=self.home,
            away_team=self.away,
            scheduled_at=timezone.now(),
        )
        start_match(match_id=self.match.pk)

    def test_concurrent_goals_do_not_lose_score_updates(self):
        ready = Barrier(2)

        def score_goal(minute):
            close_old_connections()
            try:
                ready.wait(timeout=5)
                return add_goal(
                    match_id=self.match.pk,
                    team_id=self.home.pk,
                    minute=minute,
                ).pk
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            event_ids = list(executor.map(score_goal, (10, 11)))

        self.match.refresh_from_db()
        self.assertEqual(len(event_ids), 2)
        self.assertEqual(self.match.home_score, 2)
        self.assertEqual(self.match.match_events.count(), 2)
