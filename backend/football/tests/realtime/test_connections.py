from asgiref.sync import async_to_sync
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase, override_settings

from football.realtime.routing import websocket_urlpatterns

from .helpers import TEST_CHANNEL_LAYERS, create_match


@override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
class RealtimeConnectionTests(TransactionTestCase):
    def setUp(self):
        self.match, self.home, self.away = create_match()
        self.application = URLRouter(websocket_urlpatterns)

    def test_existing_match_connects_without_jwt_and_is_read_only(self):
        async def scenario():
            communicator = WebsocketCommunicator(
                self.application, f"/ws/matches/{self.match.pk}/"
            )
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            await communicator.send_json_to({"action": "goal", "team_id": self.home.pk})
            response = await communicator.receive_json_from()
            self.assertEqual(response["type"], "error")
            self.assertEqual(response["code"], "read_only_connection")
            await communicator.disconnect()

        async_to_sync(scenario)()
        self.match.refresh_from_db()
        self.assertEqual(self.match.home_score, 0)

    def test_nonexistent_match_closes_with_4404(self):
        async def scenario():
            communicator = WebsocketCommunicator(
                self.application, "/ws/matches/999999/"
            )
            connected, close_code = await communicator.connect()
            self.assertFalse(connected)
            self.assertEqual(close_code, 4404)

        async_to_sync(scenario)()

    def test_malformed_match_route_is_rejected(self):
        async def scenario():
            communicator = WebsocketCommunicator(
                self.application, "/ws/matches/not-a-number/"
            )
            try:
                connected, _ = await communicator.connect()
                self.assertFalse(connected)
            except ValueError:
                pass

        async_to_sync(scenario)()

    def test_live_matches_connects_anonymously(self):
        async def scenario():
            communicator = WebsocketCommunicator(
                self.application, "/ws/live-matches/"
            )
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            await communicator.disconnect()

        async_to_sync(scenario)()

    def test_existing_event_standings_connects_anonymously_and_is_read_only(self):
        async def scenario():
            communicator = WebsocketCommunicator(
                self.application, f"/ws/events/{self.match.round.event_id}/standings/"
            )
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            await communicator.send_json_to({"action": "refresh"})
            response = await communicator.receive_json_from()
            self.assertEqual(response["code"], "read_only_connection")
            await communicator.disconnect()

        async_to_sync(scenario)()

    def test_disconnect_removes_group_membership(self):
        async def scenario():
            communicator = WebsocketCommunicator(
                self.application, f"/ws/matches/{self.match.pk}/"
            )
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            await communicator.disconnect()
            await communicator.send_input({"type": "websocket.disconnect"})

        async_to_sync(scenario)()
