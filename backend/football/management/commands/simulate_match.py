import random

from django.core.management.base import BaseCommand, CommandError

from football.exceptions import FootballServiceError
from football.simulation import simulate_match
from football.simulation.exceptions import SimulationError


class Command(BaseCommand):
    help = "Simulate one scheduled football match."

    def add_arguments(self, parser):
        parser.add_argument("match_id", type=int)
        parser.add_argument("--speed", type=float, default=5)
        parser.add_argument("--seed", type=int)

    def handle(self, *args, **options):
        try:
            simulate_match(
                match_id=options["match_id"],
                speed=options["speed"],
                rng=random.Random(options["seed"]),
                reporter=self.stdout.write,
            )
        except (SimulationError, FootballServiceError, ValueError) as exc:
            raise CommandError(str(exc)) from exc
