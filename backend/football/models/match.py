from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q


class MatchStatus(models.TextChoices):
    SCHEDULED = "scheduled", "Scheduled"
    LIVE = "live", "Live"
    FINISHED = "finished", "Finished"


class Match(models.Model):
    round = models.ForeignKey(
        "Round",
        on_delete=models.CASCADE,
        related_name="matches",
    )

    home_team = models.ForeignKey(
        "Team",
        on_delete=models.PROTECT,
        related_name="home_matches",
    )

    away_team = models.ForeignKey(
        "Team",
        on_delete=models.PROTECT,
        related_name="away_matches",
    )

    status = models.CharField(
        max_length=20,
        choices=MatchStatus.choices,
        default=MatchStatus.SCHEDULED,
    )

    scheduled_at = models.DateTimeField()

    venue = models.CharField(
        max_length=255,
        blank=True,
    )

    started_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    ended_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    home_score = models.PositiveIntegerField(default=0)
    away_score = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["scheduled_at"]

        constraints = [
            models.CheckConstraint(
                condition=~Q(home_team=models.F("away_team")),
                name="match_teams_must_be_different",
            )
        ]

    @property
    def event(self):
        return self.round.event

    def clean(self):
        super().clean()

        errors = {}

        # Rule 1: a team cannot play itself.
        if (
            self.home_team_id
            and self.away_team_id
            and self.home_team_id == self.away_team_id
        ):
            errors["away_team"] = (
                "A team cannot play against itself."
            )

        # Rule 2: home team must belong to the event.
        if self.round_id and self.home_team_id:
            from .team import EventTeam

            home_registered = EventTeam.objects.filter(
                event_id=self.round.event_id,
                team_id=self.home_team_id,
            ).exists()

            if not home_registered:
                errors["home_team"] = (
                    "Home team must belong to this event."
                )

        # Rule 3: away team must belong to the event.
        if self.round_id and self.away_team_id:
            from .team import EventTeam

            away_registered = EventTeam.objects.filter(
                event_id=self.round.event_id,
                team_id=self.away_team_id,
            ).exists()

            if not away_registered:
                errors["away_team"] = (
                    "Away team must belong to this event."
                )

        # Rule 4: a team cannot play twice in one round.
        if self.round_id:
            existing_matches = Match.objects.filter(
                round_id=self.round_id,
            )

            if self.pk:
                existing_matches = existing_matches.exclude(pk=self.pk)

            if self.home_team_id:
                home_conflict = existing_matches.filter(
                    Q(home_team_id=self.home_team_id)
                    | Q(away_team_id=self.home_team_id)
                ).exists()

                if home_conflict:
                    errors["home_team"] = (
                        "This team already has a match in this round."
                    )

            if self.away_team_id:
                away_conflict = existing_matches.filter(
                    Q(home_team_id=self.away_team_id)
                    | Q(away_team_id=self.away_team_id)
                ).exists()

                if away_conflict:
                    errors["away_team"] = (
                        "This team already has a match in this round."
                    )

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"{self.home_team.name} vs {self.away_team.name}"