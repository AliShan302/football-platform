from datetime import date

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from football.models import Event, EventTeam, Match, Round, Team


class FootballAPITestCase(APITestCase):
    def setUp(self):
        self.staff = get_user_model().objects.create_user(
            username="admin", password="password123", is_staff=True
        )
        self.user = get_user_model().objects.create_user(
            username="user", password="password123"
        )
        self.event = Event.objects.create(
            name="Champions Cup",
            start_date=date(2026, 10, 10),
            end_date=date(2026, 10, 20),
        )
        self.home = Team.objects.create(name="Arsenal", code="ARS")
        self.away = Team.objects.create(name="Chelsea", code="CHE")
        self.other = Team.objects.create(name="Liverpool", code="LIV")
        for team in (self.home, self.away):
            EventTeam.objects.create(event=self.event, team=team)
        self.round = Round.objects.create(event=self.event, name="Final", order=1)
        self.match = Match.objects.create(
            round=self.round,
            home_team=self.home,
            away_team=self.away,
            scheduled_at=timezone.now(),
        )

    def authenticate_staff(self):
        self.client.force_authenticate(self.staff)

    def authenticate_user(self):
        self.client.force_authenticate(self.user)
