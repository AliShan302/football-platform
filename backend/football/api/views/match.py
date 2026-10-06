from django.db.models import Prefetch
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from football.api.permissions import IsAdminOrReadOnly
from football.api.serializers import (
    GoalRequestSerializer,
    MatchDetailSerializer,
    MatchEventSerializer,
    MatchListSerializer,
    MatchWriteSerializer,
    PenaltyRequestSerializer,
    RewardRequestSerializer,
)
from football.api.serializers.common import ProtectedDeleteMixin
from football.models import Match, MatchEvent, MatchStatus
from football.services import (
    add_goal,
    add_penalty,
    add_reward,
    finish_match,
    start_match,
    validate_match_fixture_update,
)


def optimized_matches():
    events = MatchEvent.objects.select_related("team").order_by("minute", "created_at")
    return Match.objects.select_related(
        "round", "round__event", "home_team", "away_team"
    ).prefetch_related(Prefetch("match_events", queryset=events))


class MatchViewSet(ProtectedDeleteMixin, ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = optimized_matches()
        event_id = self.request.query_params.get("event")
        round_id = self.request.query_params.get("round")
        match_status = self.request.query_params.get("status")
        if event_id:
            queryset = queryset.filter(round__event_id=event_id)
        if round_id:
            queryset = queryset.filter(round_id=round_id)
        if match_status:
            queryset = queryset.filter(status=match_status)
        return queryset

    def get_serializer_class(self):
        if self.action == "retrieve":
            return MatchDetailSerializer
        if self.action == "list":
            return MatchListSerializer
        return MatchWriteSerializer

    def perform_update(self, serializer):
        validate_match_fixture_update(
            match=serializer.instance,
            changes=serializer.validated_data,
        )
        serializer.save()

    def _serialized_match(self, match_id):
        match = optimized_matches().get(pk=match_id)
        return MatchDetailSerializer(match, context=self.get_serializer_context()).data

    @action(detail=True, methods=["post"], permission_classes=[IsAdminUser])
    def start(self, request, pk=None):
        match = start_match(match_id=pk)
        return Response(self._serialized_match(match.pk))

    @action(
        detail=True, methods=["post"], url_path="goals",
        permission_classes=[IsAdminUser],
    )
    def goals(self, request, pk=None):
        serializer = GoalRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = add_goal(match_id=pk, **serializer.validated_data)
        return Response(
            {
                "event": MatchEventSerializer(event).data,
                "match": self._serialized_match(event.match_id),
            },
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True, methods=["post"], url_path="penalties",
        permission_classes=[IsAdminUser],
    )
    def penalties(self, request, pk=None):
        serializer = PenaltyRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = add_penalty(match_id=pk, **serializer.validated_data)
        return Response(
            {
                "event": MatchEventSerializer(event).data,
                "match": self._serialized_match(event.match_id),
            },
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True, methods=["post"], url_path="rewards",
        permission_classes=[IsAdminUser],
    )
    def rewards(self, request, pk=None):
        serializer = RewardRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = add_reward(match_id=pk, **serializer.validated_data)
        return Response(
            {
                "event": MatchEventSerializer(event).data,
                "match": self._serialized_match(event.match_id),
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAdminUser])
    def finish(self, request, pk=None):
        match = finish_match(match_id=pk)
        return Response(self._serialized_match(match.pk))


class LiveMatchListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = MatchListSerializer

    def get_queryset(self):
        return Match.objects.filter(status=MatchStatus.LIVE).select_related(
            "round", "round__event", "home_team", "away_team"
        )
