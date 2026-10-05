from datetime import date, timedelta
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from football.exceptions import (
    InvalidEventMinute,
    InvalidMatchTransition,
    InvalidPenaltyType,
    InvalidRewardPoints,
    MatchNotFound,
    MatchNotLive,
    TeamNotInMatch,
)
from football.models import (
    Event,
    EventTeam,
    Match,
    MatchEvent,
    MatchEventType,
    MatchStatus,
    Round,
    Team,
)
from football.services import (
    add_goal,
    add_penalty,
    add_reward,
    finish_match,
    start_match,
)


class MatchServiceTests(TestCase):
    def setUp(self):
        self.event = Event.objects.create(
            name="Champions Cup",
            start_date=date(2026, 10, 10),
            end_date=date(2026, 10, 20),
        )
        self.home = Team.objects.create(name="Arsenal", code="ARS")
        self.away = Team.objects.create(name="Chelsea", code="CHE")
        self.other = Team.objects.create(name="Liverpool", code="LIV")
        for team in (self.home, self.away, self.other):
            EventTeam.objects.create(event=self.event, team=team)
        self.round = Round.objects.create(event=self.event, name="Final", order=1)
        self.match = Match.objects.create(
            round=self.round,
            home_team=self.home,
            away_team=self.away,
            scheduled_at=timezone.now(),
        )

    def make_live(self):
        return start_match(match_id=self.match.pk)

    def test_start_match_sets_live_status_and_start_time(self):
        result = start_match(match_id=self.match.pk)

        self.match.refresh_from_db()
        self.assertEqual(result.status, MatchStatus.LIVE)
        self.assertEqual(self.match.status, MatchStatus.LIVE)
        self.assertIsNotNone(self.match.started_at)
        self.assertIsNone(self.match.ended_at)

    def test_start_match_preserves_supplied_timestamp(self):
        started_at = timezone.now() - timedelta(minutes=2)

        start_match(match_id=self.match.pk, started_at=started_at)

        self.match.refresh_from_db()
        self.assertEqual(self.match.started_at, started_at)

    def test_start_rejects_live_and_finished_matches(self):
        self.make_live()
        with self.assertRaises(InvalidMatchTransition):
            start_match(match_id=self.match.pk)

        finish_match(match_id=self.match.pk)
        with self.assertRaises(InvalidMatchTransition):
            start_match(match_id=self.match.pk)

    def test_finish_match_requires_live_match(self):
        with self.assertRaises(InvalidMatchTransition):
            finish_match(match_id=self.match.pk)

    def test_finish_match_sets_finished_status_and_end_time(self):
        live_match = self.make_live()
        started_at = live_match.started_at
        ended_at = timezone.now() + timedelta(minutes=90)

        result = finish_match(match_id=self.match.pk, ended_at=ended_at)

        self.match.refresh_from_db()
        self.assertEqual(result.status, MatchStatus.FINISHED)
        self.assertEqual(self.match.ended_at, ended_at)
        self.assertEqual(self.match.started_at, started_at)

    def test_finish_rejects_already_finished_match(self):
        self.make_live()
        finish_match(match_id=self.match.pk)

        with self.assertRaises(InvalidMatchTransition):
            finish_match(match_id=self.match.pk)

    def test_missing_match_raises_service_exception(self):
        with self.assertRaises(MatchNotFound):
            start_match(match_id=999999)

    def test_home_and_away_goals_increment_only_their_score(self):
        self.make_live()

        home_event = add_goal(
            match_id=self.match.pk,
            team_id=self.home.pk,
            minute=10,
            player_name="Saka",
        )
        away_event = add_goal(
            match_id=self.match.pk,
            team_id=self.away.pk,
            minute=20,
            player_name="Palmer",
        )

        self.match.refresh_from_db()
        self.assertEqual(home_event.type, MatchEventType.GOAL)
        self.assertEqual(away_event.type, MatchEventType.GOAL)
        self.assertEqual(self.match.home_score, 1)
        self.assertEqual(self.match.away_score, 1)

    def test_goal_requires_live_match(self):
        with self.assertRaises(MatchNotLive):
            add_goal(match_id=self.match.pk, team_id=self.home.pk, minute=1)

        self.make_live()
        finish_match(match_id=self.match.pk)
        with self.assertRaises(MatchNotLive):
            add_goal(match_id=self.match.pk, team_id=self.home.pk, minute=1)

    def test_event_rejects_non_participating_team(self):
        self.make_live()

        with self.assertRaises(TeamNotInMatch):
            add_goal(match_id=self.match.pk, team_id=self.other.pk, minute=1)

    def test_event_rejects_negative_minute(self):
        self.make_live()

        with self.assertRaises(InvalidEventMinute):
            add_goal(match_id=self.match.pk, team_id=self.home.pk, minute=-1)

    def test_goal_validation_failure_does_not_change_score(self):
        self.make_live()

        with patch.object(MatchEvent, "full_clean", side_effect=ValidationError("bad event")):
            with self.assertRaises(ValidationError):
                add_goal(match_id=self.match.pk, team_id=self.home.pk, minute=10)

        self.match.refresh_from_db()
        self.assertEqual(self.match.home_score, 0)
        self.assertFalse(MatchEvent.objects.exists())

    def test_goal_score_save_failure_rolls_back_created_event(self):
        self.make_live()

        with patch.object(Match, "save", side_effect=RuntimeError("database failure")):
            with self.assertRaises(RuntimeError):
                add_goal(match_id=self.match.pk, team_id=self.home.pk, minute=10)

        self.match.refresh_from_db()
        self.assertEqual(self.match.home_score, 0)
        self.assertFalse(MatchEvent.objects.exists())

    def test_penalty_kick_creates_event_without_changing_scores(self):
        self.make_live()

        event = add_penalty(
            match_id=self.match.pk,
            team_id=self.home.pk,
            penalty_type=MatchEventType.PENALTY_KICK,
            minute=30,
            player_name="Saka",
            note="Penalty awarded",
        )

        self.match.refresh_from_db()
        self.assertEqual(event.type, MatchEventType.PENALTY_KICK)
        self.assertEqual(self.match.home_score, 0)
        self.assertEqual(self.match.away_score, 0)

    def test_yellow_card_creates_event_without_changing_scores(self):
        self.make_live()

        event = add_penalty(
            match_id=self.match.pk,
            team_id=self.away.pk,
            penalty_type=MatchEventType.YELLOW_CARD,
            minute=31,
        )

        self.match.refresh_from_db()
        self.assertEqual(event.type, MatchEventType.YELLOW_CARD)
        self.assertEqual(self.match.home_score, 0)
        self.assertEqual(self.match.away_score, 0)

    def test_red_card_creates_event_without_changing_scores(self):
        self.make_live()

        event = add_penalty(
            match_id=self.match.pk,
            team_id=self.home.pk,
            penalty_type=MatchEventType.RED_CARD,
            minute=32,
        )

        self.match.refresh_from_db()
        self.assertEqual(event.type, MatchEventType.RED_CARD)
        self.assertEqual(self.match.home_score, 0)
        self.assertEqual(self.match.away_score, 0)

    def test_penalty_rejects_invalid_event_type(self):
        self.make_live()

        for invalid_type in (MatchEventType.GOAL, MatchEventType.REWARD, "unknown"):
            with self.subTest(invalid_type=invalid_type):
                with self.assertRaises(InvalidPenaltyType):
                    add_penalty(
                        match_id=self.match.pk,
                        team_id=self.home.pk,
                        penalty_type=invalid_type,
                        minute=33,
                    )

        self.assertFalse(MatchEvent.objects.exists())

    def test_penalty_uses_common_event_validation(self):
        self.make_live()

        with self.assertRaises(TeamNotInMatch):
            add_penalty(
                match_id=self.match.pk,
                team_id=self.other.pk,
                penalty_type=MatchEventType.PENALTY_KICK,
                minute=1,
            )
        with self.assertRaises(InvalidEventMinute):
            add_penalty(
                match_id=self.match.pk,
                team_id=self.home.pk,
                penalty_type=MatchEventType.PENALTY_KICK,
                minute=-1,
            )

    def test_reward_accepts_positive_and_negative_points_without_scoring(self):
        self.make_live()

        positive = add_reward(
            match_id=self.match.pk,
            team_id=self.home.pk,
            minute=40,
            points=2,
            note="Fair play",
        )
        negative = add_reward(
            match_id=self.match.pk,
            team_id=self.away.pk,
            minute=50,
            points=-1,
            note="Deduction",
        )

        self.match.refresh_from_db()
        self.assertEqual(positive.points, 2)
        self.assertEqual(negative.points, -1)
        self.assertEqual(self.match.home_score, 0)
        self.assertEqual(self.match.away_score, 0)

    def test_reward_rejects_zero_points(self):
        self.make_live()

        with self.assertRaises(InvalidRewardPoints):
            add_reward(
                match_id=self.match.pk,
                team_id=self.home.pk,
                minute=10,
                points=0,
            )

    def test_penalty_and_reward_require_live_match(self):
        with self.assertRaises(MatchNotLive):
            add_penalty(
                match_id=self.match.pk,
                team_id=self.home.pk,
                penalty_type=MatchEventType.PENALTY_KICK,
                minute=1,
            )
        with self.assertRaises(MatchNotLive):
            add_reward(
                match_id=self.match.pk,
                team_id=self.home.pk,
                minute=1,
                points=1,
            )

    def test_penalty_and_reward_reject_finished_match(self):
        self.make_live()
        finish_match(match_id=self.match.pk)

        with self.assertRaises(MatchNotLive):
            add_penalty(
                match_id=self.match.pk,
                team_id=self.home.pk,
                penalty_type=MatchEventType.PENALTY_KICK,
                minute=90,
            )
        with self.assertRaises(MatchNotLive):
            add_reward(
                match_id=self.match.pk,
                team_id=self.home.pk,
                minute=90,
                points=1,
            )

    def test_reward_rejects_non_participating_team(self):
        self.make_live()

        with self.assertRaises(TeamNotInMatch):
            add_reward(
                match_id=self.match.pk,
                team_id=self.other.pk,
                minute=10,
                points=1,
            )
