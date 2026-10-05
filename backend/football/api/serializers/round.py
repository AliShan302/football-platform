from rest_framework import serializers

from football.models import Round

from .common import FullCleanModelSerializer
from .match import MatchListSerializer


class RoundReadSerializer(serializers.ModelSerializer):
    matches = MatchListSerializer(many=True, read_only=True)

    class Meta:
        model = Round
        fields = ["id", "event", "name", "order", "created_at", "matches"]


class RoundWriteSerializer(FullCleanModelSerializer):
    class Meta:
        model = Round
        fields = ["id", "event", "name", "order", "created_at"]
        read_only_fields = ["id", "created_at"]
