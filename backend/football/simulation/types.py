from dataclasses import dataclass

from football.models import MatchEventType


@dataclass(frozen=True)
class PlannedEvent:
    minute: int
    event_type: MatchEventType
    team_id: int
    player_name: str = ""
    points: int = 0
    note: str = ""


@dataclass(frozen=True)
class SimulationPlan:
    match_id: int
    events: tuple[PlannedEvent, ...]


@dataclass(frozen=True)
class SimulationResult:
    match_id: int
    plan: SimulationPlan
    home_score: int
    away_score: int


@dataclass(frozen=True)
class EventSimulationResult:
    event_id: int
    completed: int
    skipped: int
    failed: int
    failures: tuple[str, ...]
