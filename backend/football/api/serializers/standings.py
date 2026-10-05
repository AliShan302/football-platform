from rest_framework import serializers


class StandingSerializer(serializers.Serializer):
    team_id = serializers.IntegerField()
    team_name = serializers.CharField()
    team_code = serializers.CharField()
    played = serializers.IntegerField()
    won = serializers.IntegerField()
    drawn = serializers.IntegerField()
    lost = serializers.IntegerField()
    goals_for = serializers.IntegerField()
    goals_against = serializers.IntegerField()
    goal_difference = serializers.IntegerField()
    match_points = serializers.IntegerField()
    reward_points = serializers.IntegerField()
    total_points = serializers.IntegerField()
