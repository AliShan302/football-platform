from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models


class MatchEventType(models.TextChoices):
    GOAL = "goal", "Goal"
    YELLOW_CARD = "yellow_card", "Yellow Card"
    RED_CARD = "red_card", "Red Card"
    PENALTY_KICK = "penalty_kick", "Penalty Kick"
    REWARD = "reward", "Reward"


class MatchEvent(models.Model):
    match = models.ForeignKey(
        "Match",
        on_delete=models.CASCADE,
        related_name="match_events",
    )

    team = models.ForeignKey(
        "Team",
        on_delete=models.PROTECT,
        related_name="match_events",
    )

    type = models.CharField(
        max_length=30,
        choices=MatchEventType.choices,
    )

    player_name = models.CharField(
        max_length=255,
        blank=True,
    )

    minute = models.PositiveIntegerField(
        validators=[MinValueValidator(0)]
    )

    points = models.IntegerField(default=0)

    note = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["minute", "created_at"]

    def clean(self):
        super().clean()

        errors = {}

        if self.match_id and self.team_id:
            participating_teams = {
                self.match.home_team_id,
                self.match.away_team_id,
            }

            if self.team_id not in participating_teams:
                errors["team"] = (
                    "The team must be participating in this match."
                )

        if self.type != MatchEventType.REWARD and self.points != 0:
            errors["points"] = (
                "Points can only be assigned to reward events."
            )

        if self.type == MatchEventType.REWARD and self.points == 0:
            errors["points"] = (
                "A reward event must have non-zero points."
            )

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return (
            f"{self.match} - "
            f"{self.get_type_display()} - "
            f"{self.minute}'"
        )