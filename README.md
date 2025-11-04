# SlotSwapper

A small full-stack application for proposing and accepting timeslot swaps between users. It includes:

- A Node + Express + PostgreSQL backend with Socket.IO for realtime notifications.
- A React + Vite frontend (TypeScript) that connects to the backend and receives realtime updates.

This README explains the design choices, how to run the project locally, the available API endpoints, and a few implementation notes and assumptions.

## Design overview

- Backend: Express + pg. The backend exposes JSON REST endpoints and uses Socket.IO to push real-time events to connected clients. Authentication is JWT-based (stateless), and the server attaches a Socket.IO instance to the Express app so controllers can emit events.
- Frontend: React + Vite + TailwindCSS-style classes (already in code). The app listens to Socket.IO events to show notifications and refresh lists of swap requests.
- Database: PostgreSQL. The backend contains a small initializer that creates the necessary tables (`users`, `events`, `swap_requests`) on startup if they do not exist.

Design choices and rationale
- Keep the backend simple and dependency-light — plain SQL via `pg` and tiny helpers for transactions.
- Use JWT for quick auth that works well with both HTTP APIs and socket auth.
- Emit focused socket events (`swap_request_created`, `swap_request_updated`, `events_changed`) so clients can choose how to react (refresh data, show toasts, etc.).

## Repo structure (important files)

- `backend/` — backend source and Dockerfile
	- `src/app.ts` — express app and routes
	- `src/server.ts` — http server + socket.io initialization
	- `src/controllers/*` — controller logic (auth, events, swaps)
	- `src/models/index.ts` — database pool and schema initialization
- `frontend/` — react app
	- `public/screenshots/` — screenshots of the site (included for review)
	- `src/contexts/ToastContext.tsx` — global toast UI (used to show realtime messages)

## Quick setup (development)

Prerequisites
- Node.js 18+ (or latest LTS)
- npm or yarn
- PostgreSQL (or use the included docker-compose)

Recommended (quick) – run with Docker Compose (DB + backend):

1. From repository root run:

```bash
# from d:/Swapper
cd backend
docker-compose up --build
```

2. The compose file launches a Postgres DB and builds/starts the backend service on port `3000` (see `backend/docker-compose.yml`). You must still provide a correct `DATABASE_URL` (the compose file supplies a placeholder). For local testing you can instead set `DATABASE_URL` to `postgresql://user:pass@localhost:5432/slotswapper` if you used the compose DB settings.

Manual (no Docker)

1. Start PostgreSQL and create a database (or use the docker-compose DB configuration):

```bash
# Example (adjust credentials/host/port as needed)
export DATABASE_URL="postgresql://user:pass@localhost:5432/slotswapper"
export JWT_SECRET="a_strong_secret_here"
```

2. Backend

```bash
cd backend
npm install
# Start backend (TypeScript runtime)
npm run start
```

The backend will initialize required tables automatically on first run.

3. Frontend

```bash
cd frontend
npm install
npm run dev
# frontend default dev server: http://localhost:5173
```

4. Open the frontend in the browser and sign up / log in. The app authenticates with the backend and sets up a socket connection (the socket expects the JWT token in `auth` when connecting).

## Environment variables

- `DATABASE_URL` — PostgreSQL connection string (required by backend). Example: `postgresql://user:pass@localhost:5432/slotswapper`
- `JWT_SECRET` — server secret for signing JWTs.
- `PORT` — backend port (default: 3000).

If you run with `docker-compose.yml` in `backend/`, edit that file to set `DATABASE_URL` and `JWT_SECRET` as appropriate.

## API endpoints

All endpoints are prefixed with `/api` unless noted otherwise.

Auth
 - POST /api/auth/signup
	 - Body: { name, email, password }
	 - Response: { user, token }

 - POST /api/auth/login
	 - Body: { email, password }
	 - Response: { user, token }

 - GET /api/auth/me
	 - Headers: Authorization: Bearer <token>
	 - Response: { id, name, email }

Events (authenticated)
 - GET /api/events
	 - Returns events for the authenticated user.
 - POST /api/events
	 - Body: { title, startTime, endTime, status? }
 - PUT /api/events/:id
	 - Body: partial fields to update (title/startTime/endTime/status)
 - DELETE /api/events/:id

Swaps (authenticated)
 - GET /api/swappable-slots
	 - Returns other users' events with status `SWAPPABLE`.
 - POST /api/swap-request
	 - Body: { mySlotId, theirSlotId }
	 - Creates a swap request. Emits `swap_request_created` to the responder.
 - POST /api/swap-response/:requestId
	 - Body: { accept: boolean }
	 - If `accept: true`, swaps owners and emits `swap_request_updated` (ACCEPTED) and `events_changed` to both users.
	 - If `accept: false`, marks request `REJECTED`, resets events to `SWAPPABLE`, and emits `swap_request_updated` (REJECTED).
 - DELETE /api/swap-request/:id
	 - Cancel a pending request. Emits `swap_request_updated` (CANCELLED) and `events_changed`.
 - GET /api/swap-requests
	 - Returns swap requests related to the current user with associated event titles and requester name.

Utilities
 - POST /api/debug/emit
	 - Body: { userId, event, payload }
	 - Emits a socket event to a specific user (useful for testing socket behavior).
 - GET /api/health
	 - Health check endpoint.

Socket events (server -> client)
- `swap_request_created` — payload: created swap request object
- `swap_request_updated` — payload: { id, status }
- `events_changed` — payload: { updatedEventIds: number[] }

Socket auth
- Socket.IO connections must send the JWT in the handshake auth (example client):

```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:3000', { auth: { token: '<JWT_TOKEN>' } });
```

## Frontend

- The frontend uses a global `ToastContext` to show realtime toasts (located at `frontend/src/contexts/ToastContext.tsx`).
- Screenshots of the UI for review are available in `frontend/public/screenshots/`.

## Assumptions & known limitations

- No production-ready migrations: the backend uses an on-start initializer that creates tables. For production you should replace this with a proper migration system (Flyway, Liquibase, or node-migrate).
- JWT secrets and DB URLs must be provided via environment variables or docker-compose overrides; the example compose file contains placeholders.
- Error handling is basic and focused on clarity over user-friendly error messages.
- Authentication is minimal — there is no email verification or password reset flow.
- The frontend uses optimistic UI patterns in places; further QA could harden edge cases (slow networks, socket reconnects).

## Challenges encountered

- Keeping socket auth secure while being simple in a demo app — the server validates the JWT on socket handshake so events are scoped to user rooms.
- Coordinating atomic swap behavior: the controller uses SQL transactions and row-level locks to avoid race conditions when creating or responding to swap requests.

## Testing

- Backend tests (Jest) are present under `backend/tests` — run `cd backend && npm test` (requires test DB setup). The repo includes a simple test `tests/swaps.test.ts` as an example.

## Next steps / suggestions

- Add a migration system and seed data for easier CI testing.
- Move socket client initialization and token refresh into a reusable hook on the frontend.
- Improve toast theming to make error vs success clearer (this repo already includes a `variant` for toasts).

If anything is missing or you'd like a tweak to the README (more examples, sample `.env` file, or a Postman collection), tell me and I'll add it.

## Screenshots

Below are a few screenshots of the frontend UI for a quick visual review. The original image files live at `frontend/public/screenshots/`.

Dashboard

![Dashboard](./frontend/public/screenshots/Dashboard.png)

Marketplace

![Marketplace](./frontend/public/screenshots/Marketplace.png)

Notifications

![Notifications](./frontend/public/screenshots/Notification.png)

