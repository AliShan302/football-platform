from django.core.exceptions import ValidationError
from django.db import models


class EventStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    COMPLETED = "completed", "Completed"


class Event(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    start_date = models.DateField()
    end_date = models.DateField()

    status = models.CharField(
        max_length=20,
        choices=EventStatus.choices,
        default=EventStatus.DRAFT,
    )

    teams = models.ManyToManyField(
        "Team",
        through="EventTeam",
        related_name="events",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date"]

    def clean(self):
        super().clean()

        if (
            self.start_date
            and self.end_date
            and self.end_date < self.start_date
        ):
            raise ValidationError({
                "end_date": "End date cannot be before start date."
            })

    def __str__(self):
        return self.name