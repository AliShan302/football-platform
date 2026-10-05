import random
from unittest.mock import patch

from django.test import TestCase

from football.models import MatchEventType, MatchStatus
from football.services import add_goal as real_add_goal
from football.simulation.engine import simulate_event, simulate_match
from football.simulation.exceptions import (
    InvalidSimulationSpeed,
    MatchNotScheduled,
    SimulationEventNotFound,
    SimulationMatchNotFound,
)
from football.simulation.types import PlannedEvent, SimulationPlan

from .helpers import create_match


class MatchSimulationEngineTests(TestCase):
    def setUp(self):
        self.event, self.match, self.home, self.away = create_match()

    def plan(self, *events):
        return SimulationPlan(match_id=self.match.pk, events=tuple(events))

    def test_engine_delegates_every_event_and_lifecycle_to_services(self):
        plan = self.plan(
            PlannedEvent(10, MatchEventType.GOAL, self.home.pk, "Alex"),
            PlannedEvent(20, MatchEventType.YELLOW_CARD, self.away.pk, "Jamie"),
            PlannedEvent(30, MatchEventType.RED_CARD, self.home.pk, "Sam"),
            PlannedEvent(40, MatchEventType.PENALTY_KICK, self.away.pk, "Robin"),
            PlannedEvent(50, MatchEventType.REWARD, self.home.pk, points=2, note="Bonus"),
        )
        generator = lambda **kwargs: plan

        with (
            patch("football.simulation.engine.start_match") as start,
            patch("football.simulation.engine.add_goal") as goal,
            patch("football.simulation.engine.add_penalty") as penalty,
            patch("football.simulation.engine.add_reward") as reward,
            patch("football.simulation.engine.finish_match") as finish,
        ):
            simulate_match(
                match_id=self.match.pk,
                speed=5,
                rng=random.Random(1),
                sleeper=lambda seconds: None,
                plan_generator=generator,
            )

        start.assert_called_once_with(match_id=self.match.pk)
        finish.assert_called_once_with(match_id=self.match.pk)
        self.assertEqual(goal.call_count, 1)
        self.assertEqual(penalty.call_count, 3)
        self.assertEqual(reward.call_count, 1)
        self.assertEqual(reward.call_args.kwargs["points"], 2)

    def test_real_services_persist_events_and_goal_score(self):
        plan = self.plan(
            PlannedEvent(5, MatchEventType.GOAL, self.home.pk, "Alex"),
            PlannedEvent(5, MatchEventType.PENALTY_KICK, self.away.pk, "Jamie"),
            PlannedEvent(8, MatchEventType.GOAL, self.away.pk, "Jamie"),
        )
        result = simulate_match(
            match_id=self.match.pk,
            speed=5,
            rng=random.Random(1),
            sleeper=lambda seconds: None,
            plan_generator=lambda **kwargs: plan,
        )

        self.match.refresh_from_db()
        self.assertEqual(self.match.status, MatchStatus.FINISHED)
        self.assertEqual((result.home_score, result.away_score), (1, 1))
        self.assertEqual(
            list(self.match.match_events.values_list("minute", "type")),
            [(5, "goal"), (5, "penalty_kick"), (8, "goal")],
        )

    def test_timing_scales_and_same_minute_has_no_extra_sleep(self):
        plan = self.plan(
            PlannedEvent(10, MatchEventType.GOAL, self.home.pk),
            PlannedEvent(10, MatchEventType.YELLOW_CARD, self.away.pk),
            PlannedEvent(50, MatchEventType.REWARD, self.home.pk, points=1),
        )
        delays = []
        simulate_match(
            match_id=self.match.pk,
            speed=5,
            sleeper=delays.append,
            plan_generator=lambda **kwargs: plan,
        )
        self.assertEqual(delays, [0.2, 0.8, 0.8])
        self.assertAlmostEqual(sum(delays), 1.8)

    def test_invalid_speed_and_match_states_are_rejected(self):
        for speed in (0, -1):
            with self.subTest(speed=speed), self.assertRaises(InvalidSimulationSpeed):
                simulate_match(match_id=self.match.pk, speed=speed)
        with self.assertRaises(SimulationMatchNotFound):
            simulate_match(match_id=999999, sleeper=lambda seconds: None)
        self.match.status = MatchStatus.LIVE
        self.match.save(update_fields=["status"])
        with self.assertRaises(MatchNotScheduled):
            simulate_match(match_id=self.match.pk, sleeper=lambda seconds: None)
        self.match.status = MatchStatus.FINISHED
        self.match.save(update_fields=["status"])
        with self.assertRaises(MatchNotScheduled):
            simulate_match(match_id=self.match.pk, sleeper=lambda seconds: None)

    def test_later_service_failure_preserves_earlier_commits(self):
        plan = self.plan(
            PlannedEvent(1, MatchEventType.GOAL, self.home.pk),
            PlannedEvent(2, MatchEventType.GOAL, self.home.pk),
        )
        calls = 0

        def fail_second_goal(**kwargs):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise RuntimeError("generated event rejected")
            return real_add_goal(**kwargs)

        with patch("football.simulation.engine.add_goal", side_effect=fail_second_goal):
            with self.assertRaises(RuntimeError):
                simulate_match(
                    match_id=self.match.pk,
                    sleeper=lambda seconds: None,
                    plan_generator=lambda **kwargs: plan,
                )

        self.match.refresh_from_db()
        self.assertEqual(self.match.status, MatchStatus.LIVE)
        self.assertEqual(self.match.home_score, 1)

    def test_keyboard_interrupt_leaves_match_live(self):
        plan = self.plan(PlannedEvent(10, MatchEventType.GOAL, self.home.pk))
        with self.assertRaises(KeyboardInterrupt):
            simulate_match(
                match_id=self.match.pk,
                sleeper=lambda seconds: (_ for _ in ()).throw(KeyboardInterrupt()),
                plan_generator=lambda **kwargs: plan,
            )
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, MatchStatus.LIVE)


class EventSimulationEngineTests(TestCase):
    def setUp(self):
        self.event, self.first, self.home, self.away = create_match()

    def test_missing_event_is_rejected(self):
        with self.assertRaises(SimulationEventNotFound):
            simulate_event(event_id=999999, sleeper=lambda seconds: None)

    def test_matches_are_sequential_and_statuses_are_skipped(self):
        from django.utils import timezone
        from football.models import Match, Round

        later_round = Round.objects.create(event=self.event, name="Later", order=2)
        second = Match.objects.create(
            round=later_round,
            home_team=self.home,
            away_team=self.away,
            scheduled_at=timezone.now(),
        )
        self.first.status = MatchStatus.FINISHED
        self.first.save(update_fields=["status"])
        seen = []

        def simulator(**kwargs):
            seen.append((kwargs["match_id"], kwargs["rng"].random()))

        first_result = simulate_event(
            event_id=self.event.pk,
            speed=5,
            seed=42,
            sleeper=lambda seconds: None,
            match_simulator=simulator,
        )
        second_seen = []
        simulate_event(
            event_id=self.event.pk,
            speed=5,
            seed=42,
            sleeper=lambda seconds: None,
            match_simulator=lambda **kwargs: second_seen.append(
                (kwargs["match_id"], kwargs["rng"].random())
            ),
        )
        self.assertEqual(first_result.skipped, 1)
        self.assertEqual(first_result.completed, 1)
        self.assertEqual(seen, second_seen)
        self.assertEqual(seen[0][0], second.pk)

    def test_failure_does_not_prevent_later_match(self):
        from datetime import timedelta
        from django.utils import timezone
        from football.models import Match, Round

        later_round = Round.objects.create(event=self.event, name="Later", order=2)
        second = Match.objects.create(
            round=later_round,
            home_team=self.home,
            away_team=self.away,
            scheduled_at=timezone.now() + timedelta(minutes=1),
        )
        seen = []

        def simulator(**kwargs):
            seen.append(kwargs["match_id"])
            if kwargs["match_id"] == self.first.pk:
                raise RuntimeError("failure")

        result = simulate_event(
            event_id=self.event.pk,
            sleeper=lambda seconds: None,
            match_simulator=simulator,
        )
        self.assertEqual(seen, [self.first.pk, second.pk])
        self.assertEqual((result.completed, result.failed), (1, 1))
