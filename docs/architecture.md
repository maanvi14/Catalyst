# Catalyst Architecture

Catalyst is split into an isolated frontend and backend so each feature can own its API, service, UI, and reusable components.

## Frontend

- Next.js App Router routes live under `frontend/src/app`.
- Enterprise shell components live in `frontend/src/components/layout` and `frontend/src/components/navigation`.
- KSAP theme tokens and context live in `frontend/src/theme` and `frontend/src/providers`.
- HTTP access is centralized in `frontend/src/services/api-client.ts`.
- Module pages are placeholders only. They establish route ownership without implementing business logic.

## Backend

- FastAPI entrypoint is `backend/app/main.py`.
- Configuration lives in `backend/app/core`.
- Database setup lives in `backend/app/database` and uses SQLAlchemy with a single connection string.
- Routers live in `backend/app/api/routers`.
- Services, graph engine, conflict engine, and fixture loader are separate packages.
- Pydantic schemas define API contracts.

## Database Portability

SQLite is the default via `DATABASE_URL=sqlite:///./catalyst.db`. PostgreSQL migration should only require changing the database URL and installing the target driver.

