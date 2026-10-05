from datetime import date

from django.core.exceptions import ValidationError
from django.test import TestCase

from football.models import Event, EventStatus


class EventModelTests(TestCase):

    def test_create_valid_event(self):
        event = Event(
            name="Champions Cup",
            description="Test tournament",
            start_date=date(2026, 10, 10),
            end_date=date(2026, 10, 20),
        )

        event.full_clean()
        event.save()

        self.assertEqual(event.status, EventStatus.DRAFT)
        self.assertEqual(str(event), "Champions Cup")

    def test_end_date_cannot_be_before_start_date(self):
        event = Event(
            name="Invalid Cup",
            start_date=date(2026, 10, 20),
            end_date=date(2026, 10, 10),
        )

        with self.assertRaises(ValidationError):
            event.full_clean()