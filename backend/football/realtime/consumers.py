from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from football.models import Event, Match

from .broadcasts import LIVE_MATCHES_GROUP, event_standings_group_name, match_group_name
from .payloads import PROTOCOL_VERSION


class ReadOnlyConsumer(AsyncJsonWebsocketConsumer):
    async def receive_json(self, content, **kwargs):
        await self.send_json({
            "version": PROTOCOL_VERSION,
            "type": "error",
            "code": "read_only_connection",
            "detail": "This WebSocket is read-only.",
        })

    async def realtime_message(self, event):
        payload = event.get("payload")
        if not isinstance(payload, dict):
            return
        if "version" not in payload or "type" not in payload:
            return
        await self.send_json(payload)


class MatchConsumer(ReadOnlyConsumer):
    async def connect(self):
        self.match_id = self.scope["url_route"]["kwargs"]["match_id"]
        if not await self._match_exists(self.match_id):
            await self.close(code=4404)
            return
        self.group_name = match_group_name(self.match_id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    @database_sync_to_async
    def _match_exists(self, match_id):
        return Match.objects.filter(pk=match_id).exists()


class LiveMatchesConsumer(ReadOnlyConsumer):
    group_name = LIVE_MATCHES_GROUP

    async def connect(self):
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)


class EventStandingsConsumer(ReadOnlyConsumer):
    async def connect(self):
        self.event_id = self.scope["url_route"]["kwargs"]["event_id"]
        if not await self._event_exists(self.event_id):
            await self.close(code=4404)
            return
        self.group_name = event_standings_group_name(self.event_id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    @database_sync_to_async
    def _event_exists(self, event_id):
        return Event.objects.filter(pk=event_id).exists()
