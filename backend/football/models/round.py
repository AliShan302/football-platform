from django.db import models


class Round(models.Model):
    event = models.ForeignKey(
        "Event",
        on_delete=models.CASCADE,
        related_name="rounds",
    )

    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order"]

        constraints = [
            models.UniqueConstraint(
                fields=["event", "order"],
                name="unique_round_order_per_event",
            )
        ]

    def __str__(self):
        return f"{self.event.name} - {self.name}"