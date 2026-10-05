from unittest.mock import AsyncMock, patch

from django.db import transaction
from django.test import TransactionTestCase, override_settings
from django.utils import timezone

from football.models import Match, MatchEvent, MatchEventType, MatchStatus, Round
from football.realtime.broadcasts import _send
from football.services import start_match

from .helpers import TEST_CHANNEL_LAYERS, create_match


@override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
class RealtimeTransactionSignalTests(TransactionTestCase):
    def setUp(self):
        self.match, self.home, self.away = create_match()

    def test_match_creation_and_unchanged_or_score_only_saves_do_not_broadcast(self):
        with patch("football.realtime.signals.broadcast_match_status") as broadcast:
            another_round = Round.objects.create(
                event=self.match.round.event,
                name="Another round",
                order=2,
            )
            Match.objects.create(
                round=another_round,
                home_team=self.home,
                away_team=self.away,
                scheduled_at=timezone.now(),
            )
            self.match.save()
            self.match.home_score = 4
            self.match.save(update_fields=["home_score"])
        broadcast.assert_not_called()

    def test_channel_layer_failure_is_logged_and_not_propagated(self):
        with patch("football.realtime.broadcasts.get_channel_layer") as get_layer:
            get_layer.return_value.group_send = AsyncMock(
                side_effect=ConnectionError("Redis down")
            )
            with self.assertLogs("football.realtime.broadcasts", level="ERROR"):
                _send("match_1", {"version": 1, "type": "match.status"})

    def test_status_callback_runs_after_commit_and_once(self):
        with patch("football.realtime.signals.broadcast_match_status") as broadcast:
            with transaction.atomic():
                self.match.status = MatchStatus.LIVE
                self.match.save(update_fields=["status"])
                broadcast.assert_not_called()
            broadcast.assert_called_once_with(self.match.pk)

    def test_event_callback_runs_after_commit(self):
        start_match(match_id=self.match.pk)
        with patch("football.realtime.signals.broadcast_match_event") as broadcast:
            with transaction.atomic():
                event = MatchEvent.objects.create(
                    match=self.match,
                    team=self.home,
                    type=MatchEventType.YELLOW_CARD,
                    minute=10,
                )
                broadcast.assert_not_called()
            broadcast.assert_called_once_with(event.pk)

    def test_rollback_discards_event_broadcast(self):
        start_match(match_id=self.match.pk)
        with patch("football.realtime.signals.broadcast_match_event") as broadcast:
            try:
                with transaction.atomic():
                    MatchEvent.objects.create(
                        match=self.match,
                        team=self.home,
                        type=MatchEventType.GOAL,
                        minute=10,
                    )
                    raise RuntimeError("roll back")
            except RuntimeError:
                pass
        broadcast.assert_not_called()
        self.assertFalse(MatchEvent.objects.exists())

    def test_receivers_are_registered_once(self):
        from django.db.models.signals import post_save, pre_save
        from football.realtime.signals import (
            remember_previous_match_status,
            schedule_match_event_broadcast,
            schedule_match_status_broadcast,
        )

        pre_matches = [
            receiver for receiver in pre_save._live_receivers(self.match.__class__)[0]
            if receiver is remember_previous_match_status
        ]
        match_post = [
            receiver for receiver in post_save._live_receivers(self.match.__class__)[0]
            if receiver is schedule_match_status_broadcast
        ]
        event_post = [
            receiver for receiver in post_save._live_receivers(MatchEvent)[0]
            if receiver is schedule_match_event_broadcast
        ]
        self.assertEqual(len(pre_matches), 1)
        self.assertEqual(len(match_post), 1)
        self.assertEqual(len(event_post), 1)
