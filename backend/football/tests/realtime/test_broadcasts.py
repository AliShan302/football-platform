from asgiref.sync import async_to_sync
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from django.test import TransactionTestCase, override_settings

from football.models import MatchEventType, MatchStatus
from football.realtime.routing import websocket_urlpatterns
from football.services import add_goal, add_penalty, add_reward, finish_match, start_match

from .helpers import TEST_CHANNEL_LAYERS, create_match


@override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
class RealtimeBroadcastTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.match, self.home, self.away = create_match()
        self.application = URLRouter(websocket_urlpatterns)

    async def _connect(self, path):
        communicator = WebsocketCommunicator(self.application, path)
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        return communicator

    def test_start_sends_exactly_one_message_to_each_group(self):
        async def scenario():
            match_socket = await self._connect(f"/ws/matches/{self.match.pk}/")
            live_socket = await self._connect("/ws/live-matches/")
            await database_sync_to_async(start_match)(match_id=self.match.pk)

            match_payload = await match_socket.receive_json_from()
            live_payload = await live_socket.receive_json_from()
            self.assertEqual(match_payload["type"], "match.status")
            self.assertEqual(match_payload["status"], MatchStatus.LIVE)
            self.assertEqual(live_payload["type"], "live_match.updated")
            self.assertEqual(live_payload["reason"], "started")
            self.assertTrue(await match_socket.receive_nothing(timeout=0.05))
            self.assertTrue(await live_socket.receive_nothing(timeout=0.05))
            await match_socket.disconnect()
            await live_socket.disconnect()

        async_to_sync(scenario)()

    def test_goal_sends_committed_score_once_to_each_group(self):
        start_match(match_id=self.match.pk)

        async def scenario():
            match_socket = await self._connect(f"/ws/matches/{self.match.pk}/")
            live_socket = await self._connect("/ws/live-matches/")
            await database_sync_to_async(add_goal)(
                match_id=self.match.pk,
                team_id=self.home.pk,
                minute=10,
            )
            match_payload = await match_socket.receive_json_from()
            live_payload = await live_socket.receive_json_from()
            self.assertEqual(match_payload["type"], "match.event")
            self.assertEqual(match_payload["event"]["type"], MatchEventType.GOAL)
            self.assertEqual(match_payload["score"], {"home": 1, "away": 0})
            self.assertEqual(live_payload["reason"], "score_changed")
            self.assertEqual(live_payload["match"]["home_score"], 1)
            self.assertTrue(await match_socket.receive_nothing(timeout=0.05))
            self.assertTrue(await live_socket.receive_nothing(timeout=0.05))
            await match_socket.disconnect()
            await live_socket.disconnect()

        async_to_sync(scenario)()
        self.match.refresh_from_db()
        self.assertEqual(self.match.home_score, 1)

    def test_penalties_broadcast_only_to_match_and_never_change_score(self):
        start_match(match_id=self.match.pk)

        async def scenario():
            match_socket = await self._connect(f"/ws/matches/{self.match.pk}/")
            live_socket = await self._connect("/ws/live-matches/")
            for minute, event_type in enumerate(
                (
                    MatchEventType.YELLOW_CARD,
                    MatchEventType.RED_CARD,
                    MatchEventType.PENALTY_KICK,
                ),
                start=1,
            ):
                await database_sync_to_async(add_penalty)(
                    match_id=self.match.pk,
                    team_id=self.home.pk,
                    penalty_type=event_type,
                    minute=minute,
                )
                payload = await match_socket.receive_json_from()
                self.assertEqual(payload["event"]["type"], event_type)
                self.assertEqual(payload["score"], {"home": 0, "away": 0})
                self.assertTrue(await live_socket.receive_nothing(timeout=0.05))
            await match_socket.disconnect()
            await live_socket.disconnect()

        async_to_sync(scenario)()
        self.match.refresh_from_db()
        self.assertEqual((self.match.home_score, self.match.away_score), (0, 0))

    def test_positive_and_negative_rewards_are_match_only(self):
        start_match(match_id=self.match.pk)

        async def scenario():
            match_socket = await self._connect(f"/ws/matches/{self.match.pk}/")
            live_socket = await self._connect("/ws/live-matches/")
            for minute, points in ((1, 2), (2, -1)):
                await database_sync_to_async(add_reward)(
                    match_id=self.match.pk,
                    team_id=self.home.pk,
                    minute=minute,
                    points=points,
                )
                payload = await match_socket.receive_json_from()
                self.assertEqual(payload["event"]["points"], points)
                self.assertEqual(payload["score"], {"home": 0, "away": 0})
                self.assertTrue(await live_socket.receive_nothing(timeout=0.05))
            await match_socket.disconnect()
            await live_socket.disconnect()

        async_to_sync(scenario)()

    def test_finish_sends_status_and_global_removal(self):
        start_match(match_id=self.match.pk)
        add_goal(match_id=self.match.pk, team_id=self.home.pk, minute=10)

        async def scenario():
            match_socket = await self._connect(f"/ws/matches/{self.match.pk}/")
            live_socket = await self._connect("/ws/live-matches/")
            await database_sync_to_async(finish_match)(match_id=self.match.pk)
            match_payload = await match_socket.receive_json_from()
            live_payload = await live_socket.receive_json_from()
            self.assertEqual(match_payload["status"], MatchStatus.FINISHED)
            self.assertEqual(match_payload["score"], {"home": 1, "away": 0})
            self.assertEqual(live_payload["type"], "live_match.removed")
            self.assertEqual(live_payload["final_score"], {"home": 1, "away": 0})
            await match_socket.disconnect()
            await live_socket.disconnect()

        async_to_sync(scenario)()
