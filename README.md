# Football Event & Live Scoring Platform

A tournament-management and live-scoring application. Staff can manage events,
teams, rounds and fixtures, then start matches and record goals, cards, penalty
kicks and reward points. Public users can browse tournaments, live scoreboards,
timelines and standings without signing in. Simulation commands drive the same
service layer and realtime flow as manual administration.

## Docker quick start

Requirements: Docker with Docker Compose.

```bash
docker compose up --build -d
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py seed_demo
```

Open the frontend at <http://localhost:3000>, the browser admin at
<http://localhost:3000/admin/login>, and the API at
<http://localhost:8000/api/>. Database migrations run automatically before the
ASGI backend starts. Demo data is never inserted automatically.

The Compose defaults are development-only. Set `DJANGO_SECRET_KEY` and
`POSTGRES_PASSWORD` in a root `.env` file to override them. Always use a strong,
unique Django secret and HTTPS cookie settings in production.

Useful Docker commands:

```bash
docker compose ps
docker compose logs -f backend frontend
docker compose down
```

Named volumes preserve PostgreSQL and uploaded team logos. `docker compose down`
does not delete them; adding `--volumes` deliberately removes that local data.

## Demo data and simulation

The idempotent seed command creates **Demo Championship**, four fictional teams,
three rounds and six valid scheduled fixtures. Running it again reports the
existing event without duplicating it.

```bash
# Docker
docker compose exec backend python manage.py seed_demo
docker compose exec backend python manage.py simulate_event <event_id> --speed 10 --seed 42

# Local backend
python manage.py seed_demo
python manage.py simulate_match <match_id> --speed 10 --seed 42
python manage.py simulate_event <event_id> --speed 10 --seed 42
```

Higher speed compresses the delay between simulated match minutes. A fixed seed
makes the generated event plan repeatable. Simulations call the normal atomic
match services, so connected public pages receive the same WebSocket messages as
they do for admin actions. Only scheduled matches are simulated; stopping with
Ctrl+C may leave the current match live with already-committed events intact.

## Technology

- Backend: Python, Django, Django REST Framework, SimpleJWT, Channels and Daphne
- Data and realtime transport: PostgreSQL and Redis (`channels_redis`)
- Frontend: Next.js App Router, React, TypeScript and Tailwind CSS
- Testing: Django test framework, Vitest and Testing Library
- Infrastructure: Docker and Docker Compose

## Architecture

```text
Next.js client/server -- REST --> DRF -- service layer --> PostgreSQL
Next.js client <-- WebSocket -- Channels <-- Redis channel layer
```

- PostgreSQL is the persistent source of truth.
- REST supplies initial state and authoritative reconnect recovery.
- WebSockets deliver ephemeral live changes without polling.
- Redis transports Channels messages; it does not store business state.
- Function-based services contain business rules shared by REST and simulation.
- Consumers are read-only and stateless; public reads need no authentication.

### Realtime flow

```text
Admin action or simulator
  -> DRF/management command
  -> atomic service operation
  -> PostgreSQL commit
  -> transaction.on_commit signal callback
  -> Redis channel group
  -> Channels consumer
  -> WebSocket client
  -> Next.js state update
```

`transaction.on_commit()` prevents clients from observing rolled-back or
uncommitted changes. On reconnect, the frontend fetches REST state and then
applies messages buffered during that synchronization. Finishing a match also
broadcasts a newly calculated authoritative standings snapshot to the open event
page.

WebSocket streams:

- `/ws/matches/{match_id}/` — status, score and timeline updates for one match
- `/ws/live-matches/` — additions, updates and removals on the live scoreboard
- `/ws/events/{event_id}/standings/` — standings after a match finishes

## Core business rules

- Match status is strictly `scheduled -> live -> finished`.
- A team cannot play itself or play twice in one round.
- Both match teams must be registered in the event.
- Only a goal increments the match score.
- Yellow cards, red cards and penalty-kick events do not change the score.
- A converted penalty is represented by a penalty event plus a goal event.
- Positive or negative non-zero rewards affect standings, never match score.
- Standings use finished matches, standard 3/1/0 result points and rewards.

## Authentication and authorization

Public reads and WebSocket streams are anonymous. Writes require a staff user.
The browser admin stores short-lived access and refresh JWTs in HttpOnly cookies,
uses Django CSRF protection, refreshes access when required, and clears cookies
on logout. JavaScript never reads the tokens. Raw bearer-token acquisition and
refresh endpoints remain available for API clients.

Local Docker uses `SameSite=Lax` and non-secure cookies because it runs over
HTTP. Production must use HTTPS, `JWT_COOKIE_SECURE=True` and
`CSRF_COOKIE_SECURE=True`. Credentialed CORS uses explicit allowed origins,
never a wildcard.

## Local setup without Dockerized application services

Python 3.11+, Node.js 20+, PostgreSQL and Redis are required. Compose can run
only the dependencies with `docker compose up -d db redis`; PostgreSQL is then
available on host port `5433`.

```bash
cd backend
python -m venv .venv
# Windows: .\.venv\Scripts\Activate.ps1
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Set POSTGRES_PORT=5433 when using the Compose database from the host.
python manage.py migrate
python manage.py createsuperuser
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

In another terminal:

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Use `localhost` consistently rather than mixing it with `127.0.0.1`, since
origins and cookies are host-sensitive.

## Environment configuration

Backend variables are documented in `backend/.env.example`:

- `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`
- `REDIS_HOST`, `REDIS_PORT`
- `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`
- JWT and CSRF cookie names/security/SameSite/domain settings

Frontend variables are documented in `frontend/.env.example`:

- `NEXT_PUBLIC_API_URL` — browser-reachable REST base URL
- `API_INTERNAL_URL` — server-side Next.js REST URL (`backend` inside Compose)
- `NEXT_PUBLIC_WS_URL` — browser-reachable WebSocket base URL

Public `NEXT_PUBLIC_*` values are embedded during the frontend build. HTTPS
deployments must use HTTPS REST URLs and `wss://` WebSockets.

## Testing

Backend (requires the configured PostgreSQL service; concurrency tests use it):

```bash
cd backend
python manage.py check
python manage.py test football.tests -v 2
python manage.py makemigrations --check --dry-run
```

Frontend:

```bash
cd frontend
npm test
npm run lint
npm run build
```

## Project structure

```text
backend/
  config/                 Django settings, URLs and ASGI entrypoint
  football/
    api/                  DRF serializers, views, auth and permissions
    models/               domain models and validation
    services/             atomic match operations and standings
    realtime/             signals, payloads, consumers and routes
    simulation/           deterministic simulation engine
    management/commands/  simulation and demo-data commands
    tests/                 model, API, service, realtime and simulation tests
frontend/
  app/                    public and protected App Router pages
  components/             UI, admin, match, standings and realtime views
  contexts/               browser admin authentication state
  hooks/                  reconnecting WebSocket behavior
  lib/                    API clients, protocol, reducers and formatting
  public/                 local visual assets
```

## Assumptions and trade-offs

- Standings are derived rather than persisted, avoiding stale duplicate state.
- WebSocket messages have no replay log; reconnect recovery deliberately uses REST.
- Cookie JWTs protect browser credentials while bearer JWT remains available.
- Simulation reuses the service layer instead of maintaining separate rules.
- Rewards and penalty events are modeled separately from match score.
- There is no Player model or top-scorer feature; player names are event text.
- Daphne serves this evaluator setup directly. A production deployment would add
  TLS termination and dedicated static/media storage.

## Scaling note

For substantially more concurrent viewers, run multiple stateless ASGI instances
behind a load balancer with WebSocket support, sharing the Redis channel layer and
PostgreSQL source of truth. Group-specific messages already limit unrelated
broadcasts. At larger scale, Redis/realtime capacity could be separated and
observed independently. This take-home has not been load-tested for 10,000 users.
