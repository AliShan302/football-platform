from django.urls import path

from .consumers import EventStandingsConsumer, LiveMatchesConsumer, MatchConsumer


websocket_urlpatterns = [
    path("ws/matches/<int:match_id>/", MatchConsumer.as_asgi()),
    path("ws/live-matches/", LiveMatchesConsumer.as_asgi()),
    path("ws/events/<int:event_id>/standings/", EventStandingsConsumer.as_asgi()),
]
