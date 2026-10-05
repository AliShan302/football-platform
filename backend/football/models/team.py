from django.db import models


class Team(models.Model):
    name = models.CharField(max_length=255)

    code = models.CharField(
        max_length=10,
        unique=True,
    )

    logo = models.ImageField(
        upload_to="team_logos/",
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class EventTeam(models.Model):
    event = models.ForeignKey(
        "Event",
        on_delete=models.CASCADE,
        related_name="event_teams",
    )

    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name="event_teams",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["event", "team"],
                name="unique_team_per_event",
            )
        ]

    def __str__(self):
        return f"{self.event} - {self.team}"