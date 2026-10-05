from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase, override_settings

from football.models import MatchEventType
from football.realtime.routing import websocket_urlpatterns
from football.simulation.engine import simulate_match
from football.simulation.types import PlannedEvent, SimulationPlan

from .helpers import create_match


TEST_CHANNEL_LAYERS = {
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
}


@override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
class SimulationRealtimeIntegrationTests(TransactionTestCase):
    def test_simulation_naturally_emits_service_signal_websocket_messages(self):
        _, match, home, _ = create_match()
        plan = SimulationPlan(
            match_id=match.pk,
            events=(PlannedEvent(10, MatchEventType.GOAL, home.pk, "Alex"),),
        )

        async def scenario():
            communicator = WebsocketCommunicator(
                URLRouter(websocket_urlpatterns), f"/ws/matches/{match.pk}/"
            )
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            await database_sync_to_async(simulate_match)(
                match_id=match.pk,
                sleeper=lambda seconds: None,
                plan_generator=lambda **kwargs: plan,
            )
            messages = [await communicator.receive_json_from() for _ in range(3)]
            self.assertEqual(
                [message["type"] for message in messages],
                ["match.status", "match.event", "match.status"],
            )
            self.assertEqual(messages[1]["score"], {"home": 1, "away": 0})
            await communicator.disconnect()

        async_to_sync(scenario)()
