from datetime import date

from django.urls import reverse
from rest_framework import status

from football.models import Event, EventTeam, Match, Round, Team

from .helpers import FootballAPITestCase


class EventAPITests(FootballAPITestCase):
    def test_event_list_is_paginated(self):
        response = self.client.get(reverse("event-list"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertIn("results", response.data)

    def test_event_detail_contains_teams_rounds_and_matches(self):
        response = self.client.get(reverse("event-detail", args=[self.event.pk]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["teams"]), 2)
        self.assertEqual(len(response.data["rounds"]), 1)
        self.assertEqual(len(response.data["rounds"][0]["matches"]), 1)

    def test_missing_event_returns_404(self):
        self.assertEqual(
            self.client.get(reverse("event-detail", args=[999999])).status_code,
            404,
        )

    def test_staff_event_crud_and_patch_merged_validation(self):
        self.authenticate_staff()
        create_response = self.client.post(
            reverse("event-list"),
            {
                "name": "New Cup",
                "start_date": "2027-01-01",
                "end_date": "2027-01-05",
            },
        )
        self.assertEqual(create_response.status_code, 201)

        detail = reverse("event-detail", args=[create_response.data["id"]])
        patch_response = self.client.patch(detail, {"name": "Renamed Cup"})
        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(patch_response.data["name"], "Renamed Cup")
        self.assertEqual(self.client.delete(detail).status_code, 204)

    def test_invalid_event_dates_return_400_on_create_and_patch(self):
        self.authenticate_staff()
        create_response = self.client.post(
            reverse("event-list"),
            {
                "name": "Invalid",
                "start_date": "2027-01-10",
                "end_date": "2027-01-01",
            },
        )
        patch_response = self.client.patch(
            reverse("event-detail", args=[self.event.pk]),
            {"end_date": "2026-01-01"},
        )

        self.assertEqual(create_response.status_code, 400)
        self.assertEqual(patch_response.status_code, 400)


class ResourceCRUDAPITests(FootballAPITestCase):
    def setUp(self):
        super().setUp()
        self.authenticate_staff()

    def test_team_crud_and_duplicate_code_validation(self):
        created = self.client.post(
            reverse("team-list"), {"name": "Barcelona", "code": "BAR"}
        )
        duplicate = self.client.post(
            reverse("team-list"), {"name": "Other", "code": "BAR"}
        )
        updated = self.client.patch(
            reverse("team-detail", args=[created.data["id"]]),
            {"name": "FC Barcelona"},
        )

        self.assertEqual(created.status_code, 201)
        self.assertEqual(duplicate.status_code, 400)
        self.assertEqual(updated.status_code, 200)

    def test_event_team_crud_and_duplicate_validation(self):
        created = self.client.post(
            reverse("event-team-list"),
            {"event": self.event.pk, "team": self.other.pk},
        )
        duplicate = self.client.post(
            reverse("event-team-list"),
            {"event": self.event.pk, "team": self.other.pk},
        )

        self.assertEqual(created.status_code, 201)
        self.assertEqual(duplicate.status_code, 400)
        self.assertEqual(
            self.client.delete(
                reverse("event-team-detail", args=[created.data["id"]])
            ).status_code,
            204,
        )

    def test_round_crud_and_unique_order_validation(self):
        duplicate = self.client.post(
            reverse("round-list"),
            {"event": self.event.pk, "name": "Duplicate", "order": 1},
        )
        created = self.client.post(
            reverse("round-list"),
            {"event": self.event.pk, "name": "Group", "order": 2},
        )

        self.assertEqual(duplicate.status_code, 400)
        self.assertEqual(created.status_code, 201)

    def test_match_crud_validates_domain_and_hides_lifecycle_writes(self):
        new_round = Round.objects.create(event=self.event, name="Other", order=2)
        invalid = self.client.post(
            reverse("match-list"),
            {
                "round": new_round.pk,
                "home_team": self.home.pk,
                "away_team": self.home.pk,
                "scheduled_at": "2026-10-10T12:00:00Z",
            },
        )
        valid = self.client.post(
            reverse("match-list"),
            {
                "round": new_round.pk,
                "home_team": self.home.pk,
                "away_team": self.away.pk,
                "scheduled_at": "2026-10-10T12:00:00Z",
                "status": "finished",
                "home_score": 9,
            },
        )

        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(valid.status_code, 201)
        saved = Match.objects.get(pk=valid.data["id"])
        self.assertEqual(saved.status, "scheduled")
        self.assertEqual(saved.home_score, 0)

    def test_protected_team_delete_returns_409(self):
        response = self.client.delete(reverse("team-detail", args=[self.home.pk]))
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
