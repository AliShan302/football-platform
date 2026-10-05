import random

from football.models import Match, MatchEventType

from .types import PlannedEvent, SimulationPlan


PLAYER_NAMES = (
    "Alex Morgan",
    "Jamie Carter",
    "Sam Taylor",
    "Jordan Lee",
    "Chris Silva",
    "Robin Khan",
)
REWARD_OPTIONS = (
    (1, "Fair play bonus"),
    (2, "Team performance bonus"),
    (-1, "Disciplinary deduction"),
)
EVENT_ORDER = {
    MatchEventType.PENALTY_KICK: 0,
    MatchEventType.GOAL: 1,
    MatchEventType.YELLOW_CARD: 2,
    MatchEventType.RED_CARD: 3,
    MatchEventType.REWARD: 4,
}


def _team_id(match: Match, rng: random.Random) -> int:
    return rng.choice((match.home_team_id, match.away_team_id))


def _player_name(rng: random.Random) -> str:
    return rng.choice(PLAYER_NAMES)


def _sort_key(event: PlannedEvent):
    return (
        event.minute,
        EVENT_ORDER[event.event_type],
        event.team_id,
        event.player_name,
        event.points,
        event.note,
    )


def generate_match_plan(*, match: Match, rng: random.Random) -> SimulationPlan:
    events = []
    goal_count = rng.randint(0, 5)

    for _ in range(goal_count):
        events.append(PlannedEvent(
            minute=rng.randint(0, 90),
            event_type=MatchEventType.GOAL,
            team_id=_team_id(match, rng),
            player_name=_player_name(rng),
        ))

    for _ in range(rng.randint(0, 4)):
        events.append(PlannedEvent(
            minute=rng.randint(0, 90),
            event_type=MatchEventType.YELLOW_CARD,
            team_id=_team_id(match, rng),
            player_name=_player_name(rng),
        ))

    if rng.random() < 0.12:
        events.append(PlannedEvent(
            minute=rng.randint(0, 90),
            event_type=MatchEventType.RED_CARD,
            team_id=_team_id(match, rng),
            player_name=_player_name(rng),
        ))

    if rng.random() < 0.20:
        minute = rng.randint(0, 90)
        team_id = _team_id(match, rng)
        player_name = _player_name(rng)
        events.append(PlannedEvent(
            minute=minute,
            event_type=MatchEventType.PENALTY_KICK,
            team_id=team_id,
            player_name=player_name,
        ))
        if goal_count < 5 and rng.random() < 0.70:
            events.append(PlannedEvent(
                minute=minute,
                event_type=MatchEventType.GOAL,
                team_id=team_id,
                player_name=player_name,
                note="Converted penalty",
            ))

    if rng.random() < 0.15:
        points, note = rng.choice(REWARD_OPTIONS)
        events.append(PlannedEvent(
            minute=rng.randint(0, 90),
            event_type=MatchEventType.REWARD,
            team_id=_team_id(match, rng),
            points=points,
            note=note,
        ))

    return SimulationPlan(
        match_id=match.pk,
        events=tuple(sorted(events, key=_sort_key)),
    )
