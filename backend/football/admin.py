from django.contrib import admin

from .models import (
    Event,
    EventTeam,
    Match,
    MatchEvent,
    Round,
    Team,
)


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "start_date",
        "end_date",
        "status",
    )
    list_filter = ("status",)
    search_fields = ("name",)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "code")
    search_fields = ("name", "code")


@admin.register(EventTeam)
class EventTeamAdmin(admin.ModelAdmin):
    list_display = ("event", "team")
    list_filter = ("event",)


@admin.register(Round)
class RoundAdmin(admin.ModelAdmin):
    list_display = ("name", "event", "order")
    list_filter = ("event",)


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = (
        "home_team",
        "away_team",
        "round",
        "status",
        "home_score",
        "away_score",
        "scheduled_at",
    )

    list_filter = (
        "status",
        "round__event",
    )


@admin.register(MatchEvent)
class MatchEventAdmin(admin.ModelAdmin):
    list_display = (
        "match",
        "team",
        "type",
        "player_name",
        "minute",
        "points",
    )

    list_filter = (
        "type",
        "match__round__event",
    )