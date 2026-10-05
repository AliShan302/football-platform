from django.test import TestCase
from django.utils import timezone

from football.models import MatchEvent, MatchEventType
from football.realtime.payloads import (
    match_event_message,
    match_status_message,
    match_summary_payload,
    team_payload,
)

from .helpers import create_match


class RealtimePayloadTests(TestCase):
    def setUp(self):
        self.match, self.home, self.away = create_match()

    def test_team_and_match_payloads_have_documented_fields_only(self):
        self.assertEqual(
            set(team_payload(self.home)), {"id", "name", "code", "logo"}
        )
        self.assertEqual(
            set(match_summary_payload(self.match)),
            {
                "id", "event_id", "round_id", "home_team", "away_team",
                "status", "home_score", "away_score", "scheduled_at",
                "started_at", "ended_at", "venue",
            },
        )

    def test_datetime_values_are_iso_8601(self):
        self.match.started_at = timezone.now()
        payload = match_status_message(self.match)
        self.assertTrue(payload["started_at"].endswith("Z"))
        self.assertIn("T", payload["started_at"])

    def test_all_event_types_use_the_versioned_event_schema(self):
        for event_type in MatchEventType.values:
            points = 2 if event_type == MatchEventType.REWARD else 0
            event = MatchEvent.objects.create(
                match=self.match,
                team=self.home,
                type=event_type,
                minute=10,
                points=points,
            )
            payload = match_event_message(event)
            self.assertEqual(payload["version"], 1)
            self.assertEqual(payload["type"], "match.event")
            self.assertEqual(payload["event"]["type"], event_type)
            self.assertEqual(
                set(payload["event"]),
                {
                    "id", "type", "team", "player_name", "minute", "points",
                    "note", "created_at",
                },
            )
