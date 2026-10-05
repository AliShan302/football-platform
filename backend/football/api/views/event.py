from django.db.models import Count, Prefetch
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from football.api.permissions import IsAdminOrReadOnly
from football.api.serializers import (
    EventDetailSerializer,
    EventListSerializer,
    EventWriteSerializer,
    StandingSerializer,
)
from football.api.serializers.common import ProtectedDeleteMixin
from football.models import Event, Match, Round, Team
from football.services import calculate_standings


class EventViewSet(ProtectedDeleteMixin, ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Event.objects.all()
        if self.action == "list":
            return queryset.annotate(
                team_count=Count("teams", distinct=True)
            ).order_by("-start_date", "pk")
        if self.action in {"retrieve", "standings"}:
            match_queryset = Match.objects.select_related(
                "home_team", "away_team"
            ).order_by("scheduled_at")
            round_queryset = Round.objects.order_by("order").prefetch_related(
                Prefetch("matches", queryset=match_queryset)
            )
            return queryset.prefetch_related(
                Prefetch("teams", queryset=Team.objects.order_by("name")),
                Prefetch("rounds", queryset=round_queryset),
            )
        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return EventListSerializer
        if self.action == "retrieve":
            return EventDetailSerializer
        return EventWriteSerializer

    @action(detail=True, methods=["get"])
    def standings(self, request, pk=None):
        event = self.get_object()
        rows = calculate_standings(event_id=event.pk)
        return Response(StandingSerializer(rows, many=True).data)
