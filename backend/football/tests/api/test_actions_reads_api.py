from django.urls import reverse

from football.models import Match, MatchEventType, MatchStatus

from .helpers import FootballAPITestCase


class MatchActionAPITests(FootballAPITestCase):
    def setUp(self):
        super().setUp()
        self.authenticate_staff()

    def start(self):
        return self.client.post(reverse("match-start", args=[self.match.pk]), {})

    def test_start_and_finish_match(self):
        self.assertEqual(self.start().status_code, 200)
        self.assertEqual(
            self.client.post(reverse("match-finish", args=[self.match.pk]), {}).status_code,
            200,
        )
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, MatchStatus.FINISHED)

    def test_invalid_transition_returns_409(self):
        response = self.client.post(reverse("match-finish", args=[self.match.pk]), {})
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["code"], "invalid_match_transition")

    def test_goal_creates_event_and_updates_score(self):
        self.start()
        response = self.client.post(
            reverse("match-goals", args=[self.match.pk]),
            {"team_id": self.home.pk, "minute": 10, "player_name": "Saka"},
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["event"]["type"], MatchEventType.GOAL)
        self.assertEqual(response.data["match"]["home_score"], 1)

    def test_all_penalty_types_leave_score_unchanged(self):
        self.start()
        for minute, penalty_type in enumerate(
            [
                MatchEventType.YELLOW_CARD,
                MatchEventType.RED_CARD,
                MatchEventType.PENALTY_KICK,
            ],
            start=1,
        ):
            response = self.client.post(
                reverse("match-penalties", args=[self.match.pk]),
                {
                    "team_id": self.home.pk,
                    "penalty_type": penalty_type,
                    "minute": minute,
                },
            )
            self.assertEqual(response.status_code, 201)
            self.assertEqual(response.data["event"]["type"], penalty_type)
            self.assertEqual(response.data["match"]["home_score"], 0)
            self.assertEqual(response.data["match"]["away_score"], 0)

    def test_invalid_penalty_type_returns_400(self):
        self.start()
        response = self.client.post(
            reverse("match-penalties", args=[self.match.pk]),
            {"team_id": self.home.pk, "penalty_type": "goal", "minute": 1},
        )
        self.assertEqual(response.status_code, 400)

    def test_reward_changes_points_not_score(self):
        self.start()
        response = self.client.post(
            reverse("match-rewards", args=[self.match.pk]),
            {"team_id": self.home.pk, "minute": 20, "points": 2},
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["event"]["points"], 2)
        self.assertEqual(response.data["match"]["home_score"], 0)

    def test_domain_errors_have_expected_http_status(self):
        self.start()
        not_participating = self.client.post(
            reverse("match-goals", args=[self.match.pk]),
            {"team_id": self.other.pk, "minute": 1},
        )
        negative_minute = self.client.post(
            reverse("match-goals", args=[self.match.pk]),
            {"team_id": self.home.pk, "minute": -1},
        )
        zero_reward = self.client.post(
            reverse("match-rewards", args=[self.match.pk]),
            {"team_id": self.home.pk, "minute": 1, "points": 0},
        )

        self.assertEqual(not_participating.status_code, 400)
        self.assertEqual(negative_minute.status_code, 400)
        self.assertEqual(zero_reward.status_code, 400)


class PublicReadAPITests(FootballAPITestCase):
    def test_match_detail_contains_ordered_timeline(self):
        self.authenticate_staff()
        self.client.post(reverse("match-start", args=[self.match.pk]), {})
        for minute in (20, 10):
            self.client.post(
                reverse("match-goals", args=[self.match.pk]),
                {"team_id": self.home.pk, "minute": minute},
            )
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse("match-detail", args=[self.match.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [event["minute"] for event in response.data["match_events"]], [10, 20]
        )

    def test_live_matches_returns_only_live_matches(self):
        self.match.status = MatchStatus.LIVE
        self.match.save(update_fields=["status"])
        Match.objects.create(
            round=self.round,
            home_team=self.home,
            away_team=self.away,
            scheduled_at=self.match.scheduled_at,
            status=MatchStatus.FINISHED,
        )

        response = self.client.get(reverse("live-match-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.match.pk)

    def test_standings_missing_and_empty_event_behavior(self):
        empty = type(self.event).objects.create(
            name="Empty",
            start_date=self.event.start_date,
            end_date=self.event.end_date,
        )
        existing = self.client.get(reverse("event-standings", args=[empty.pk]))
        missing = self.client.get(reverse("event-standings", args=[999999]))

        self.assertEqual(existing.status_code, 200)
        self.assertEqual(existing.data, [])
        self.assertEqual(missing.status_code, 404)

    def test_finished_match_and_reward_are_reflected_in_standings(self):
        self.authenticate_staff()
        self.client.post(reverse("match-start", args=[self.match.pk]), {})
        self.client.post(
            reverse("match-goals", args=[self.match.pk]),
            {"team_id": self.home.pk, "minute": 5},
        )
        self.client.post(
            reverse("match-rewards", args=[self.match.pk]),
            {"team_id": self.home.pk, "minute": 6, "points": 2},
        )
        self.client.post(reverse("match-finish", args=[self.match.pk]), {})

        response = self.client.get(reverse("event-standings", args=[self.event.pk]))
        self.assertEqual(response.data[0]["team_id"], self.home.pk)
        self.assertEqual(response.data[0]["total_points"], 5)


class QueryEfficiencyAPITests(FootballAPITestCase):
    def test_event_detail_has_bounded_query_count(self):
        with self.assertNumQueries(4):
            response = self.client.get(reverse("event-detail", args=[self.event.pk]))
            self.assertEqual(response.status_code, 200)

    def test_match_detail_has_bounded_query_count(self):
        with self.assertNumQueries(2):
            response = self.client.get(reverse("match-detail", args=[self.match.pk]))
            self.assertEqual(response.status_code, 200)

    def test_live_matches_query_count_does_not_grow_per_match(self):
        self.match.status = MatchStatus.LIVE
        self.match.save(update_fields=["status"])
        with self.assertNumQueries(2):
            response = self.client.get(reverse("live-match-list"))
            self.assertEqual(response.status_code, 200)
