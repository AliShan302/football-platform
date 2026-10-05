import random
from collections import Counter

from django.test import TestCase

from football.models import MatchEventType
from football.simulation.generators import EVENT_ORDER, generate_match_plan

from .helpers import create_match


class SimulationGeneratorTests(TestCase):
    def setUp(self):
        _, self.match, self.home, self.away = create_match()

    def test_fixed_seed_is_reproducible_and_plan_is_valid(self):
        first = generate_match_plan(match=self.match, rng=random.Random(42))
        second = generate_match_plan(match=self.match, rng=random.Random(42))

        self.assertEqual(first, second)
        self.assertEqual(
            list(first.events),
            sorted(
                first.events,
                key=lambda item: (
                    item.minute,
                    EVENT_ORDER[item.event_type],
                    item.team_id,
                    item.player_name,
                    item.points,
                    item.note,
                ),
            ),
        )
        for event in first.events:
            self.assertGreaterEqual(event.minute, 0)
            self.assertLessEqual(event.minute, 90)
            self.assertIn(event.team_id, {self.home.pk, self.away.pk})
            self.assertIn(event.event_type, MatchEventType.values)
            if event.event_type == MatchEventType.REWARD:
                self.assertNotEqual(event.points, 0)

    def test_event_counts_stay_bounded_across_many_seeds(self):
        for seed in range(100):
            plan = generate_match_plan(match=self.match, rng=random.Random(seed))
            counts = Counter(event.event_type for event in plan.events)
            self.assertLessEqual(counts[MatchEventType.GOAL], 5)
            self.assertLessEqual(counts[MatchEventType.YELLOW_CARD], 4)
            self.assertLessEqual(counts[MatchEventType.RED_CARD], 1)
            self.assertLessEqual(counts[MatchEventType.PENALTY_KICK], 1)
            self.assertLessEqual(counts[MatchEventType.REWARD], 1)

    def test_converted_penalty_is_ordered_before_goal(self):
        converted = None
        for seed in range(1000):
            plan = generate_match_plan(match=self.match, rng=random.Random(seed))
            for index, event in enumerate(plan.events[:-1]):
                following = plan.events[index + 1]
                if (
                    event.event_type == MatchEventType.PENALTY_KICK
                    and following.event_type == MatchEventType.GOAL
                    and following.note == "Converted penalty"
                ):
                    converted = (event, following)
                    break
            if converted:
                break

        self.assertIsNotNone(converted)
        penalty, goal = converted
        self.assertEqual(penalty.minute, goal.minute)
        self.assertEqual(penalty.team_id, goal.team_id)
