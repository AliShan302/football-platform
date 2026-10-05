from rest_framework import serializers

from football.models import EventTeam, Team

from .common import FullCleanModelSerializer


class TeamSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name", "code", "logo"]


class TeamSerializer(FullCleanModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name", "code", "logo", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class EventTeamReadSerializer(serializers.ModelSerializer):
    team = TeamSummarySerializer(read_only=True)

    class Meta:
        model = EventTeam
        fields = ["id", "event", "team", "created_at"]


class EventTeamWriteSerializer(FullCleanModelSerializer):
    class Meta:
        model = EventTeam
        fields = ["id", "event", "team", "created_at"]
        read_only_fields = ["id", "created_at"]
