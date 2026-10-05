from django.db.models import Prefetch
from rest_framework.viewsets import ModelViewSet

from football.api.permissions import IsAdminOrReadOnly
from football.api.serializers import RoundReadSerializer, RoundWriteSerializer
from football.api.serializers.common import ProtectedDeleteMixin
from football.models import Match, Round


class RoundViewSet(ProtectedDeleteMixin, ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        matches = Match.objects.select_related("home_team", "away_team", "round__event")
        queryset = Round.objects.select_related("event").prefetch_related(
            Prefetch("matches", queryset=matches)
        )
        event_id = self.request.query_params.get("event")
        if event_id:
            queryset = queryset.filter(event_id=event_id)
        return queryset

    def get_serializer_class(self):
        if self.action in {"list", "retrieve"}:
            return RoundReadSerializer
        return RoundWriteSerializer
