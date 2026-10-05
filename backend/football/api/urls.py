from django.urls import include, path
from rest_framework.permissions import AllowAny
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from football.api.views import (
    EventTeamViewSet,
    EventViewSet,
    LiveMatchListView,
    MatchViewSet,
    RoundViewSet,
    TeamViewSet,
)


router = DefaultRouter()
router.register("events", EventViewSet, basename="event")
router.register("teams", TeamViewSet, basename="team")
router.register("event-teams", EventTeamViewSet, basename="event-team")
router.register("rounds", RoundViewSet, basename="round")
router.register("matches", MatchViewSet, basename="match")

urlpatterns = [
    path(
        "auth/token/",
        TokenObtainPairView.as_view(permission_classes=[AllowAny]),
        name="token_obtain_pair",
    ),
    path(
        "auth/token/refresh/",
        TokenRefreshView.as_view(permission_classes=[AllowAny]),
        name="token_refresh",
    ),
    path("live-matches/", LiveMatchListView.as_view(), name="live-match-list"),
    path("", include(router.urls)),
]
