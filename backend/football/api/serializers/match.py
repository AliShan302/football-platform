from rest_framework import serializers

from football.models import Match

from .common import FullCleanModelSerializer
from .match_event import MatchEventSerializer
from .team import TeamSummarySerializer


class MatchListSerializer(serializers.ModelSerializer):
    home_team = TeamSummarySerializer(read_only=True)
    away_team = TeamSummarySerializer(read_only=True)
    round_id = serializers.IntegerField(read_only=True)
    event_id = serializers.IntegerField(source="round.event_id", read_only=True)

    class Meta:
        model = Match
        fields = [
            "id", "round_id", "event_id", "home_team", "away_team", "status",
            "scheduled_at", "venue", "started_at", "ended_at", "home_score",
            "away_score",
        ]


class MatchDetailSerializer(MatchListSerializer):
    match_events = MatchEventSerializer(many=True, read_only=True)

    class Meta(MatchListSerializer.Meta):
        fields = MatchListSerializer.Meta.fields + ["match_events"]


class MatchWriteSerializer(FullCleanModelSerializer):
    class Meta:
        model = Match
        fields = [
            "id", "round", "home_team", "away_team", "scheduled_at", "venue",
            "status", "started_at", "ended_at", "home_score", "away_score",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status", "started_at", "ended_at", "home_score", "away_score",
            "created_at", "updated_at",
        ]
