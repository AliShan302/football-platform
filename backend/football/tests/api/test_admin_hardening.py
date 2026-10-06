from django.urls import reverse

from football.models import EventTeam, MatchStatus

from .helpers import FootballAPITestCase


class EventTeamRemovalProtectionTests(FootballAPITestCase):
    def setUp(self):
        super().setUp()
        self.authenticate_staff()

    def test_unused_assignment_can_be_removed(self):
        assignment = EventTeam.objects.create(event=self.event, team=self.other)
        response = self.client.delete(
            reverse("event-team-detail", args=[assignment.pk])
        )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(EventTeam.objects.filter(pk=assignment.pk).exists())

    def test_referenced_assignment_returns_controlled_conflict_and_remains(self):
        assignment = EventTeam.objects.get(event=self.event, team=self.home)
        response = self.client.delete(
            reverse("event-team-detail", args=[assignment.pk])
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["code"], "protected_resource")
        self.assertTrue(EventTeam.objects.filter(pk=assignment.pk).exists())


class MatchFixtureLockTests(FootballAPITestCase):
    def setUp(self):
        super().setUp()
        self.authenticate_staff()
        self.url = reverse("match-detail", args=[self.match.pk])

    def test_scheduled_fixture_metadata_can_be_edited(self):
        response = self.client.patch(self.url, {"venue": "New ground"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["venue"], "New ground")

    def test_live_and_finished_fixture_metadata_edits_are_rejected(self):
        for match_status in (MatchStatus.LIVE, MatchStatus.FINISHED):
            self.match.status = match_status
            self.match.save(update_fields=["status"])
            response = self.client.patch(self.url, {"venue": f"{match_status} ground"})
            self.assertEqual(response.status_code, 409)
            self.assertEqual(response.data["code"], "match_fixture_locked")

    def test_lifecycle_fields_remain_read_only_and_actions_still_work(self):
        response = self.client.patch(
            self.url,
            {"status": "finished", "home_score": 9},
        )
        self.assertEqual(response.status_code, 200)
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, MatchStatus.SCHEDULED)
        self.assertEqual(self.match.home_score, 0)
        self.assertEqual(
            self.client.post(reverse("match-start", args=[self.match.pk]), {}).status_code,
            200,
        )
