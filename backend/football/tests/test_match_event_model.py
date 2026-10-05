from datetime import date

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from football.models import (
    Event,
    EventTeam,
    Match,
    MatchEvent,
    MatchEventType,
    Round,
    Team,
)


class MatchEventModelTests(TestCase):

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

        for team in [
            self.arsenal,
            self.chelsea,
            self.liverpool,
        ]:
            EventTeam.objects.create(
                event=self.event,
                team=team,
            )

        self.round = Round.objects.create(
            event=self.event,
            name="Final",
            order=1,
        )

        self.match = Match.objects.create(
            round=self.round,
            home_team=self.arsenal,
            away_team=self.chelsea,
            scheduled_at=timezone.now(),
        )
    def test_create_goal_event(self):
        event = MatchEvent(
            match=self.match,
            team=self.arsenal,
            type=MatchEventType.GOAL,
            player_name="Saka",
            minute=25,
        )

        event.full_clean()
        event.save()

        self.assertEqual(event.type, MatchEventType.GOAL)
        self.assertEqual(event.minute, 25)

    def test_match_event_team_must_participate_in_match(self):
        event = MatchEvent(
            match=self.match,
            team=self.liverpool,
            type=MatchEventType.GOAL,
            player_name="Salah",
            minute=20,
        )

        with self.assertRaises(ValidationError):
            event.full_clean()
    def test_goal_cannot_have_reward_points(self):
        event = MatchEvent(
            match=self.match,
            team=self.arsenal,
            type=MatchEventType.GOAL,
            player_name="Saka",
            minute=30,
            points=3,
        )

        with self.assertRaises(ValidationError):
            event.full_clean()

    def test_reward_requires_non_zero_points(self):
        event = MatchEvent(
            match=self.match,
            team=self.arsenal,
            type=MatchEventType.REWARD,
            minute=50,
            points=0,
            note="Fair play bonus",
        )

        with self.assertRaises(ValidationError):
            event.full_clean()

    def test_create_valid_reward(self):
        event = MatchEvent(
            match=self.match,
            team=self.arsenal,
            type=MatchEventType.REWARD,
            minute=50,
            points=2,
            note="Fair play bonus",
        )

        event.full_clean()
        event.save()

        self.assertEqual(event.points, 2)

    def test_match_event_minute_cannot_be_negative(self):
        event = MatchEvent(
            match=self.match,
            team=self.arsenal,
            type=MatchEventType.GOAL,
            player_name="Saka",
            minute=-1,
        )

        with self.assertRaises(ValidationError):
            event.full_clean()