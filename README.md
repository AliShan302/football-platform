# Football Event & Live Scoring Platform

Tournament management and live scoring built with Django, DRF, Channels,
PostgreSQL, Redis, Next.js, TypeScript, and JWT authentication.

## Setup

Requirements: Python 3.11+, Node.js 20+, and Docker Compose.

```bash
# PostgreSQL and Redis
docker compose up -d

# Backend
cd backend
python -m venv .venv
# Windows: .\.venv\Scripts\Activate.ps1
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver

# Frontend (separate terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

When Django runs locally against the Compose database, set
`POSTGRES_PORT=5433` in `backend/.env`. Also replace `SECRET_KEY` with a strong
random value. Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` in
`frontend/.env.local`. The API and frontend run at `http://localhost:8000/api/` and
`http://localhost:3000`.

Compose currently starts infrastructure only; Django and Next.js run locally.

## Architecture

```text
Next.js -> REST -> DRF -> service layer -> PostgreSQL
       -> WebSocket -> Channels -> Redis
```

- REST supplies initial and authoritative state.
- Public reads require no token; staff writes use SimpleJWT.
- Match actions and future simulation commands share the same atomic services.
- Match flow is strictly `scheduled -> live -> finished`.
- Only goals change scores; cards and penalty kicks are timeline events.
- Standings are calculated from finished matches plus reward points.

JWT tokens are available at `/api/auth/token/` and
`/api/auth/token/refresh/`. CRUD endpoints cover events, teams, assignments,
rounds, and matches; match-control endpoints expose start, goal, penalty,
reward, and finish operations.

## Real-time flow

Live updates use the following flow without polling:

```text
Admin/simulator -> service -> database -> post-save signal
               -> Channels group -> Redis -> WebSocket -> Next.js
```

The match and live-score pages fetch REST state first, then subscribe to
`ws/matches/<id>/` or `ws/live-matches/`. Groups are named `match_<id>` and
`live_matches`; broadcasts occur only after successful transaction commits.
After reconnecting, the frontend refreshes authoritative REST state and replays
messages received during that refresh. HTTPS deployments must configure a
`wss://` value for `NEXT_PUBLIC_WS_URL`.

## Assumptions and trade-offs

- PostgreSQL is authoritative; Redis is used only for the channel layer.
- Standings are calculated rather than persisted to avoid stale derived data.
- A penalty kick does not imply a goal; a scored penalty also needs a goal event.
- Match minutes may exceed 90 to allow extra time.
- Docker currently covers PostgreSQL and Redis, not the complete application.

## Tests

```bash
cd backend
python manage.py check
python manage.py test football.tests
python manage.py makemigrations --check --dry-run
```

The suite covers models, services, PostgreSQL concurrency, JWT permissions,
REST CRUD/actions, standings, query efficiency, WebSockets, simulation, and
frontend realtime state.

For a manual Redis check, start Compose and connect WebSocket clients to both
routes, then trigger match actions through REST. Updates should arrive only
after the REST mutation commits; reconnecting clients should re-fetch REST state.

## Simulation

```bash
cd backend
python manage.py simulate_match <match_id> --speed 5 --seed 42
python manage.py simulate_event <event_id> --speed 5 --seed 42
```

Simulation uses the same services and WebSocket flow as REST match controls.
Pressing Ctrl+C stops immediately and may leave the current match live with its
already-committed events and score intact.
