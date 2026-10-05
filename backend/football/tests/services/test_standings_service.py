from datetime import date

from django.test import TestCase
from django.utils import timezone

from football.models import (
    Event,
    EventTeam,
    Match,
    MatchEvent,
    MatchEventType,
    MatchStatus,
    Round,
    Team,
)
from football.services import calculate_standings


class StandingsServiceTests(TestCase):
    def setUp(self):
        self.event = Event.objects.create(
            name="League",
            start_date=date(2026, 10, 10),
            end_date=date(2026, 10, 20),
        )
        self.alpha = Team.objects.create(name="Alpha", code="ALP")
        self.bravo = Team.objects.create(name="Bravo", code="BRA")
        self.charlie = Team.objects.create(name="Charlie", code="CHA")
        self.delta = Team.objects.create(name="Delta", code="DEL")
        for team in (self.alpha, self.bravo, self.charlie, self.delta):
            EventTeam.objects.create(event=self.event, team=team)
        self.round_one = Round.objects.create(
            event=self.event,
            name="Round 1",
            order=1,
        )
        self.round_two = Round.objects.create(
            event=self.event,
            name="Round 2",
            order=2,
        )

    def create_match(
        self,
        *,
        round_obj,
        home,
        away,
        status=MatchStatus.FINISHED,
        home_score=0,
        away_score=0,
    ):
        now = timezone.now()
        return Match.objects.create(
            round=round_obj,
            home_team=home,
            away_team=away,
            status=status,
            scheduled_at=now,
            started_at=now if status != MatchStatus.SCHEDULED else None,
            ended_at=now if status == MatchStatus.FINISHED else None,
            home_score=home_score,
            away_score=away_score,
        )

    def rows_by_team(self):
        return {
            row.team_id: row
            for row in calculate_standings(event_id=self.event.pk)
        }

    def test_finished_matches_calculate_results_and_goal_totals(self):
        self.create_match(
            round_obj=self.round_one,
            home=self.alpha,
            away=self.bravo,
            home_score=2,
            away_score=1,
        )
        self.create_match(
            round_obj=self.round_two,
            home=self.alpha,
            away=self.charlie,
            home_score=0,
            away_score=0,
        )

        rows = self.rows_by_team()

        alpha = rows[self.alpha.pk]
        self.assertEqual(alpha.played, 2)
        self.assertEqual(alpha.won, 1)
        self.assertEqual(alpha.drawn, 1)
        self.assertEqual(alpha.lost, 0)
        self.assertEqual(alpha.goals_for, 2)
        self.assertEqual(alpha.goals_against, 1)
        self.assertEqual(alpha.goal_difference, 1)
        self.assertEqual(alpha.match_points, 4)
        self.assertEqual(rows[self.bravo.pk].lost, 1)
        self.assertEqual(rows[self.charlie.pk].drawn, 1)

    def test_includes_registered_team_without_matches(self):
        rows = self.rows_by_team()

        self.assertEqual(set(rows), {
            self.alpha.pk,
            self.bravo.pk,
            self.charlie.pk,
            self.delta.pk,
        })
        self.assertEqual(rows[self.delta.pk].played, 0)

    def test_scheduled_and_live_matches_are_excluded(self):
        self.create_match(
            round_obj=self.round_one,
            home=self.alpha,
            away=self.bravo,
            status=MatchStatus.LIVE,
            home_score=5,
            away_score=0,
        )
        self.create_match(
            round_obj=self.round_two,
            home=self.alpha,
            away=self.charlie,
            status=MatchStatus.SCHEDULED,
            home_score=3,
            away_score=0,
        )

        rows = self.rows_by_team()

        self.assertEqual(rows[self.alpha.pk].played, 0)
        self.assertEqual(rows[self.alpha.pk].goals_for, 0)

    def test_finished_match_rewards_change_total_points(self):
        match = self.create_match(
            round_obj=self.round_one,
            home=self.alpha,
            away=self.bravo,
            home_score=1,
            away_score=1,
        )
        MatchEvent.objects.create(
            match=match,
            team=self.alpha,
            type=MatchEventType.REWARD,
            minute=90,
            points=2,
        )
        MatchEvent.objects.create(
            match=match,
            team=self.bravo,
            type=MatchEventType.REWARD,
            minute=90,
            points=-1,
        )

        rows = self.rows_by_team()

        self.assertEqual(rows[self.alpha.pk].match_points, 1)
        self.assertEqual(rows[self.alpha.pk].reward_points, 2)
        self.assertEqual(rows[self.alpha.pk].total_points, 3)
        self.assertEqual(rows[self.bravo.pk].total_points, 0)

    def test_rewards_from_unfinished_matches_are_excluded(self):
        match = self.create_match(
            round_obj=self.round_one,
            home=self.alpha,
            away=self.bravo,
            status=MatchStatus.LIVE,
        )
        MatchEvent.objects.create(
            match=match,
            team=self.alpha,
            type=MatchEventType.REWARD,
            minute=10,
            points=5,
        )

        self.assertEqual(self.rows_by_team()[self.alpha.pk].reward_points, 0)

    def test_penalty_events_do_not_affect_standings(self):
        match = self.create_match(
            round_obj=self.round_one,
            home=self.alpha,
            away=self.bravo,
        )
        MatchEvent.objects.create(
            match=match,
            team=self.alpha,
            type=MatchEventType.PENALTY_KICK,
            minute=25,
        )

        row = self.rows_by_team()[self.alpha.pk]
        self.assertEqual(row.goals_for, 0)
        self.assertEqual(row.reward_points, 0)

    def test_ordering_uses_points_goal_difference_goals_and_name(self):
        self.create_match(
            round_obj=self.round_one,
            home=self.alpha,
            away=self.bravo,
            home_score=2,
            away_score=0,
        )
        self.create_match(
            round_obj=self.round_one,
            home=self.charlie,
            away=self.delta,
            home_score=3,
            away_score=1,
        )

        standings = calculate_standings(event_id=self.event.pk)

        self.assertEqual(
            [row.team_id for row in standings],
            [self.charlie.pk, self.alpha.pk, self.delta.pk, self.bravo.pk],
        )

    def test_query_count_is_constant(self):
        with self.assertNumQueries(3):
            list(calculate_standings(event_id=self.event.pk))
