from datetime import date

from django.db import IntegrityError
from django.test import TestCase

from football.models import Event, Round


class RoundModelTests(TestCase):

    def setUp(self):
        self.event = Event.objects.create(
            name="Champions Cup",
            start_date=date(2026, 10, 10),
            end_date=date(2026, 10, 20),
        )

    def test_create_round(self):
        round_obj = Round.objects.create(
            event=self.event,
            name="Semi-final",
            order=1,
        )

        self.assertEqual(round_obj.event, self.event)
        self.assertEqual(round_obj.order, 1)

    def test_round_order_must_be_unique_per_event(self):
        Round.objects.create(
            event=self.event,
            name="Semi-final",
            order=1,
        )

        with self.assertRaises(IntegrityError):
            Round.objects.create(
                event=self.event,
                name="Final",
                order=1,
            )