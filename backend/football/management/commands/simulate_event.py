from django.core.management.base import BaseCommand, CommandError

from football.simulation import simulate_event
from football.simulation.exceptions import SimulationError


class Command(BaseCommand):
    help = "Simulate all scheduled matches in an event."

    def add_arguments(self, parser):
        parser.add_argument("event_id", type=int)
        parser.add_argument("--speed", type=float, default=5)
        parser.add_argument("--seed", type=int)

    def handle(self, *args, **options):
        try:
            result = simulate_event(
                event_id=options["event_id"],
                speed=options["speed"],
                seed=options["seed"],
                reporter=self.stdout.write,
            )
        except SimulationError as exc:
            raise CommandError(str(exc)) from exc
        if result.failed:
            raise CommandError(
                f"Event simulation completed with {result.failed} failed match(es)."
            )
