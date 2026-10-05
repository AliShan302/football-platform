from rest_framework.viewsets import ModelViewSet

from football.api.permissions import IsAdminOrReadOnly
from football.api.serializers import (
    EventTeamReadSerializer,
    EventTeamWriteSerializer,
    TeamSerializer,
)
from football.api.serializers.common import ProtectedDeleteMixin
from football.models import EventTeam, Team


class TeamViewSet(ProtectedDeleteMixin, ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    permission_classes = [IsAdminOrReadOnly]


class EventTeamViewSet(ProtectedDeleteMixin, ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = EventTeam.objects.select_related("event", "team")
        event_id = self.request.query_params.get("event")
        if event_id:
            queryset = queryset.filter(event_id=event_id)
        return queryset

    def get_serializer_class(self):
        if self.action in {"list", "retrieve"}:
            return EventTeamReadSerializer
        return EventTeamWriteSerializer
