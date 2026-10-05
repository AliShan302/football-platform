class SimulationError(Exception):
    pass


class InvalidSimulationSpeed(SimulationError):
    def __init__(self, speed):
        super().__init__(f"Simulation speed must be greater than zero; received {speed}.")


class SimulationMatchNotFound(SimulationError):
    def __init__(self, match_id):
        super().__init__(f"Match {match_id} does not exist.")


class SimulationEventNotFound(SimulationError):
    def __init__(self, event_id):
        super().__init__(f"Event {event_id} does not exist.")


class MatchNotScheduled(SimulationError):
    def __init__(self, match_id, status):
        super().__init__(
            f"Match {match_id} cannot be simulated from status '{status}'."
        )
