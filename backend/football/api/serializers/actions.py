from rest_framework import serializers

from football.models import MatchEventType


class EventActionSerializer(serializers.Serializer):
    team_id = serializers.IntegerField()
    minute = serializers.IntegerField()
    player_name = serializers.CharField(required=False, allow_blank=True, default="")
    note = serializers.CharField(required=False, allow_blank=True, default="")


class GoalRequestSerializer(EventActionSerializer):
    pass


class PenaltyRequestSerializer(EventActionSerializer):
    penalty_type = serializers.ChoiceField(
        choices=[
            MatchEventType.YELLOW_CARD,
            MatchEventType.RED_CARD,
            MatchEventType.PENALTY_KICK,
        ]
    )


class RewardRequestSerializer(serializers.Serializer):
    team_id = serializers.IntegerField()
    minute = serializers.IntegerField()
    points = serializers.IntegerField()
    note = serializers.CharField(required=False, allow_blank=True, default="")
