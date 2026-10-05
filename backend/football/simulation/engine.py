import random
import time
from collections.abc import Callable

from football.models import Event, Match, MatchEventType, MatchStatus
from football.services import add_goal, add_penalty, add_reward, finish_match, start_match

from .exceptions import (
    InvalidSimulationSpeed,
    MatchNotScheduled,
    SimulationEventNotFound,
    SimulationMatchNotFound,
)
from .generators import generate_match_plan
from .types import EventSimulationResult, PlannedEvent, SimulationPlan, SimulationResult


BASE_SECONDS_PER_MINUTE = 0.1
Reporter = Callable[[str], None]
Sleeper = Callable[[float], None]
PlanGenerator = Callable[..., SimulationPlan]


def validate_speed(speed: float) -> float:
    if speed <= 0:
        raise InvalidSimulationSpeed(speed)
    return speed


def _report(reporter: Reporter | None, message: str) -> None:
    if reporter is not None:
        reporter(message)


def _team_name(match: Match, team_id: int) -> str:
    return match.home_team.name if team_id == match.home_team_id else match.away_team.name


def _event_description(match: Match, event: PlannedEvent) -> str:
    team = _team_name(match, event.team_id)
    label = MatchEventType(event.event_type).label.upper()
    if event.event_type == MatchEventType.REWARD:
        return f"{event.minute}' {label} {event.points:+d} - {team} - {event.note}"
    player = f" - {event.player_name}" if event.player_name else ""
    return f"{event.minute}' {label} - {team}{player}"


def _execute_event(*, match_id: int, event: PlannedEvent) -> None:
    if event.event_type == MatchEventType.GOAL:
        add_goal(
            match_id=match_id,
            team_id=event.team_id,
            minute=event.minute,
            player_name=event.player_name,
            note=event.note,
        )
    elif event.event_type in {
        MatchEventType.YELLOW_CARD,
        MatchEventType.RED_CARD,
        MatchEventType.PENALTY_KICK,
    }:
        add_penalty(
            match_id=match_id,
            team_id=event.team_id,
            penalty_type=event.event_type,
            minute=event.minute,
            player_name=event.player_name,
            note=event.note,
        )
    elif event.event_type == MatchEventType.REWARD:
        add_reward(
            match_id=match_id,
            team_id=event.team_id,
            minute=event.minute,
            points=event.points,
            note=event.note,
        )
    else:
        raise ValueError(f"Unsupported simulation event type: {event.event_type}")


def simulate_match(
    *,
    match_id: int,
    speed: float = 5,
    rng: random.Random | None = None,
    sleeper: Sleeper = time.sleep,
    reporter: Reporter | None = None,
    plan_generator: PlanGenerator = generate_match_plan,
) -> SimulationResult:
    speed = validate_speed(speed)
    try:
        match = Match.objects.select_related("home_team", "away_team").get(pk=match_id)
    except Match.DoesNotExist as exc:
        raise SimulationMatchNotFound(match_id) from exc
    if match.status != MatchStatus.SCHEDULED:
        raise MatchNotScheduled(match.pk, match.status)

    rng = rng or random.Random()
    plan = plan_generator(match=match, rng=rng)
    _report(reporter, f"Simulating match {match.pk}: {match.home_team.name} vs {match.away_team.name}")
    start_match(match_id=match.pk)
    _report(reporter, "Started")

    current_minute = 0
    for event in plan.events:
        delay = (event.minute - current_minute) * BASE_SECONDS_PER_MINUTE / speed
        if delay > 0:
            sleeper(delay)
        _execute_event(match_id=match.pk, event=event)
        _report(reporter, _event_description(match, event))
        current_minute = event.minute

    remaining_delay = (90 - current_minute) * BASE_SECONDS_PER_MINUTE / speed
    if remaining_delay > 0:
        sleeper(remaining_delay)
    finish_match(match_id=match.pk)

    match.refresh_from_db()
    _report(
        reporter,
        f"Finished: {match.home_team.name} {match.home_score} - "
        f"{match.away_score} {match.away_team.name}",
    )
    return SimulationResult(
        match_id=match.pk,
        plan=plan,
        home_score=match.home_score,
        away_score=match.away_score,
    )


def simulate_event(
    *,
    event_id: int,
    speed: float = 5,
    seed: int | None = None,
    sleeper: Sleeper = time.sleep,
    reporter: Reporter | None = None,
    match_simulator=simulate_match,
) -> EventSimulationResult:
    validate_speed(speed)
    try:
        event = Event.objects.get(pk=event_id)
    except Event.DoesNotExist as exc:
        raise SimulationEventNotFound(event_id) from exc

    matches = Match.objects.filter(round__event=event).select_related(
        "round", "home_team", "away_team"
    ).order_by("round__order", "scheduled_at", "pk")
    master_rng = random.Random(seed)
    completed = skipped = failed = 0
    failures = []
    _report(reporter, f"Simulating event {event.pk}: {event.name}")

    for match in matches:
        if match.status != MatchStatus.SCHEDULED:
            skipped += 1
            _report(reporter, f"Skipped match {match.pk}: status is {match.status}")
            continue
        match_rng = random.Random(master_rng.randrange(0, 2**32))
        try:
            match_simulator(
                match_id=match.pk,
                speed=speed,
                rng=match_rng,
                sleeper=sleeper,
                reporter=reporter,
            )
            completed += 1
        except Exception as exc:
            failed += 1
            message = f"Match {match.pk} failed: {exc}"
            failures.append(message)
            _report(reporter, message)

    _report(
        reporter,
        f"Summary: completed={completed}, skipped={skipped}, failed={failed}",
    )
    return EventSimulationResult(
        event_id=event.pk,
        completed=completed,
        skipped=skipped,
        failed=failed,
        failures=tuple(failures),
    )
