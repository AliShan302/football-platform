class FootballServiceError(Exception):
    """Base class for errors raised by the football service layer."""


class MatchNotFound(FootballServiceError):
    def __init__(self, match_id):
        self.match_id = match_id
        super().__init__(f"Match {match_id} does not exist.")


class InvalidMatchTransition(FootballServiceError):
    def __init__(self, *, current_status, target_status):
        self.current_status = current_status
        self.target_status = target_status
        super().__init__(
            f"Cannot transition match from {current_status} to {target_status}."
        )


class MatchNotLive(FootballServiceError):
    def __init__(self, *, match_id, current_status):
        self.match_id = match_id
        self.current_status = current_status
        super().__init__(
            f"Match {match_id} must be live; current status is {current_status}."
        )


class TeamNotInMatch(FootballServiceError):
    def __init__(self, *, match_id, team_id):
        self.match_id = match_id
        self.team_id = team_id
        super().__init__(f"Team {team_id} is not participating in match {match_id}.")


class InvalidEventMinute(FootballServiceError):
    def __init__(self, minute):
        self.minute = minute
        super().__init__("Match event minute must be a non-negative integer.")


class InvalidPenaltyType(FootballServiceError):
    def __init__(self, penalty_type):
        self.penalty_type = penalty_type
        super().__init__(
            "Penalty type must be yellow_card, red_card, or penalty_kick."
        )


class InvalidRewardPoints(FootballServiceError):
    def __init__(self, points):
        self.points = points
        super().__init__("Reward points must be a non-zero integer.")
