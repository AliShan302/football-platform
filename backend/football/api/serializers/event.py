from rest_framework import serializers

from football.models import Event

from .common import FullCleanModelSerializer
from .round import RoundReadSerializer
from .team import TeamSummarySerializer


class EventListSerializer(serializers.ModelSerializer):
    team_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Event
        fields = [
            "id", "name", "description", "start_date", "end_date", "status",
            "team_count",
        ]


class EventDetailSerializer(serializers.ModelSerializer):
    teams = TeamSummarySerializer(many=True, read_only=True)
    rounds = RoundReadSerializer(many=True, read_only=True)

    class Meta:
        model = Event
        fields = [
            "id", "name", "description", "start_date", "end_date", "status",
            "teams", "rounds", "created_at", "updated_at",
        ]


class EventWriteSerializer(FullCleanModelSerializer):
    class Meta:
        model = Event
        fields = [
            "id", "name", "description", "start_date", "end_date", "status",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
