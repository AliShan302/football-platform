from io import StringIO
from unittest.mock import patch

from django.core.management import CommandError, call_command
from django.test import TestCase

from football.simulation.exceptions import InvalidSimulationSpeed
from football.simulation.types import EventSimulationResult

from .helpers import create_match


class SimulationCommandTests(TestCase):
    def setUp(self):
        self.event, self.match, self.home, self.away = create_match()

    def test_simulate_match_forwards_id_speed_seed_and_output(self):
        output = StringIO()
        with patch(
            "football.management.commands.simulate_match.simulate_match"
        ) as simulator:
            simulator.side_effect = lambda **kwargs: kwargs["reporter"]("Started")
            call_command(
                "simulate_match", self.match.pk, speed=2.5, seed=42, stdout=output
            )
        self.assertEqual(simulator.call_args.kwargs["match_id"], self.match.pk)
        self.assertEqual(simulator.call_args.kwargs["speed"], 2.5)
        self.assertEqual(simulator.call_args.kwargs["rng"].random(), __import__("random").Random(42).random())
        self.assertIn("Started", output.getvalue())

    def test_simulate_match_invalid_speed_becomes_command_error(self):
        with patch(
            "football.management.commands.simulate_match.simulate_match",
            side_effect=InvalidSimulationSpeed(0),
        ):
            with self.assertRaises(CommandError):
                call_command("simulate_match", self.match.pk, speed=0)

    def test_simulate_event_reports_failed_result_as_command_error(self):
        result = EventSimulationResult(
            event_id=self.event.pk,
            completed=1,
            skipped=0,
            failed=1,
            failures=("failure",),
        )
        with patch(
            "football.management.commands.simulate_event.simulate_event",
            return_value=result,
        ) as simulator:
            with self.assertRaises(CommandError):
                call_command("simulate_event", self.event.pk, speed=5, seed=42)
        self.assertEqual(simulator.call_args.kwargs["event_id"], self.event.pk)
        self.assertEqual(simulator.call_args.kwargs["seed"], 42)
