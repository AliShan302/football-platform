from datetime import date

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone

from football.models import (
    Event,
    EventTeam,
    Match,
    MatchStatus,
    Round,
    Team,
)


class MatchModelTests(TestCase):

    def setUp(self):
        self.event = Event.objects.create(
            name="Champions Cup",
            start_date=date(2026, 10, 10),
            end_date=date(2026, 10, 20),
        )

        self.arsenal = Team.objects.create(
            name="Arsenal",
            code="ARS",
        )

        self.chelsea = Team.objects.create(
            name="Chelsea",
            code="CHE",
        )

        self.liverpool = Team.objects.create(
            name="Liverpool",
            code="LIV",
        )

        self.city = Team.objects.create(
            name="Manchester City",
            code="MCI",
        )

        for team in [
            self.arsenal,
            self.chelsea,
            self.liverpool,
            self.city,
        ]:
            EventTeam.objects.create(
                event=self.event,
                team=team,
            )

        self.round = Round.objects.create(
            event=self.event,
            name="Semi-final",
            order=1,
        )

    def test_create_valid_match(self):
        match = Match(
            round=self.round,
            home_team=self.arsenal,
            away_team=self.chelsea,
            scheduled_at=timezone.now(),
        )

        match.full_clean()
        match.save()

        self.assertEqual(match.status, MatchStatus.SCHEDULED)
        self.assertEqual(match.home_score, 0)
        self.assertEqual(match.away_score, 0)

    def test_team_cannot_play_itself(self):
        match = Match(
            round=self.round,
            home_team=self.arsenal,
            away_team=self.arsenal,
            scheduled_at=timezone.now(),
        )

        with self.assertRaises(ValidationError):
            match.full_clean()

    def test_database_rejects_same_home_and_away_team(self):
        with self.assertRaises(IntegrityError):
            Match.objects.create(
                round=self.round,
                home_team=self.arsenal,
                away_team=self.arsenal,
                scheduled_at=timezone.now(),
            )
    def test_team_must_belong_to_event(self):
        barcelona = Team.objects.create(
            name="Barcelona",
            code="BAR",
        )

        match = Match(
            round=self.round,
            home_team=self.arsenal,
            away_team=barcelona,
            scheduled_at=timezone.now(),
        )

        with self.assertRaises(ValidationError):
            match.full_clean()

    def test_team_cannot_play_twice_in_same_round(self):
        first_match = Match(
            round=self.round,
            home_team=self.arsenal,
            away_team=self.chelsea,
            scheduled_at=timezone.now(),
        )

        first_match.full_clean()
        first_match.save()

        second_match = Match(
            round=self.round,
            home_team=self.liverpool,
            away_team=self.arsenal,
            scheduled_at=timezone.now(),
        )

        with self.assertRaises(ValidationError):
            second_match.full_clean()

    def test_team_can_play_again_in_different_round(self):
        semi_final = Match(
            round=self.round,
            home_team=self.arsenal,
            away_team=self.chelsea,
            scheduled_at=timezone.now(),
        )

        semi_final.full_clean()
        semi_final.save()

        final_round = Round.objects.create(
            event=self.event,
            name="Final",
            order=2,
        )

        final = Match(
            round=final_round,
            home_team=self.arsenal,
            away_team=self.liverpool,
            scheduled_at=timezone.now(),
        )

        final.full_clean()
        final.save()

        self.assertIsNotNone(final.pk)