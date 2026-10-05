# Football Event & Live Scoring Platform

Full-stack football tournament and live-scoring platform built with
**Django, Django REST Framework, Django Channels, PostgreSQL, Redis,
Next.js, and TypeScript**.

> Current status: Phases 1--3 completed/in progress through the domain
> models and tests.

## Setup

### Requirements

-   Python 3.11+
-   Node.js 20+
-   Docker / Docker Compose

### Start PostgreSQL and Redis

``` bash
docker compose up -d
```

### Backend

``` bash
cd backend
python -m venv .venv
```

Windows:

``` powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies and configure environment:

``` bash
pip install -r requirements.txt
```

Copy `.env.example` to `.env`, then run:

``` bash
python manage.py migrate
python manage.py runserver
```

Backend: `http://localhost:8000`

### Frontend

``` bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:3000`

> Currently Docker Compose starts PostgreSQL and Redis. The final
> version will aim to run the complete stack with `docker compose up`.

## Architecture

``` text
Next.js
   |
   +---- REST ----> Django REST Framework
   |                     |
   |                Service Layer
   |                     |
   |                 PostgreSQL
   |
   +-- WebSocket --> Django Channels
                         |
                       Redis
```

Core models:

``` text
Event
 ├── EventTeam ── Team
 └── Round
      └── Match
           └── MatchEvent
```

Current domain rules include:

-   Event end date cannot precede start date.
-   A team cannot be added twice to the same event.
-   Round order is unique per event.
-   A team cannot play itself.
-   Both match teams must belong to the event.
-   A team cannot play twice in the same round.
-   Match events must belong to a participating team.
-   Reward points are only allowed on reward events.

## Real-Time Flow

Planned real-time flow:

``` text
Admin / Simulator
       |
       v
Service Layer
       |
       v
PostgreSQL
       |
       v
Django Signal
       |
       v
Redis / Channels
       |
       v
WebSocket
       |
       v
Next.js UI
```

REST will provide initial/current state. WebSockets will push live
score, status, and timeline changes without polling.

Simulation commands and admin actions will use the **same service-layer
functions** so behavior remains consistent.

## Authentication

Public read operations will remain accessible without authentication.

Administrative write operations will use **JWT authentication with
SimpleJWT** and admin/staff permissions.

## Assumptions & Trade-offs

-   Match flow is strictly `scheduled -> live -> finished`.
-   `penalty_kick` does not automatically mean a goal.
-   Standings will initially be calculated from finished matches and
    reward points instead of stored in a separate table.
-   Business logic will live in a reusable service layer rather than
    views, serializers, or model `save()` methods.
-   Models are split into separate files for maintainability.
-   PostgreSQL and Redis currently run in Docker while Django and
    Next.js run locally for easier development/debugging.
-   Match minutes allow values above 90 so future extra-time support
    remains possible.

## Tests

Run:

``` bash
cd backend
python manage.py test football.tests
```

Phase 3 tests cover model creation, database constraints, match
scheduling rules, event-team validation, and MatchEvent validation.

## Progress

``` text
Phase 1  Architecture                         ✓
Phase 2  Infrastructure Setup                 ✓
Phase 3  Models, Constraints & Tests          ✓
Phase 4  Service Layer                        Next
Phase 5  REST API + JWT
Phase 6  WebSockets
Phase 7  Simulation
Phase 8  Next.js UI
Phase 9  Real-Time Frontend
Phase 10 Admin Controls
Phase 11 Integration Tests
Phase 12 Docker, README & Final Polish
```
