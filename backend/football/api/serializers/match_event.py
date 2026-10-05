from rest_framework import serializers

from football.models import MatchEvent

from .team import TeamSummarySerializer


class MatchEventSerializer(serializers.ModelSerializer):
    team = TeamSummarySerializer(read_only=True)

    class Meta:
        model = MatchEvent
        fields = [
            "id", "team", "type", "player_name", "minute", "points", "note",
            "created_at",
        ]
