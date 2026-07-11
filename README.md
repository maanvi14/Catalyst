# Catalyst

Catalyst is an AI-powered Workflow Intelligence Platform foundation for Oracle Transportation Management 26B.

This repository currently contains the production foundation only:

- `frontend/` Next.js 15 App Router application with KSAP theming, navigation, shared states, API client, and module routes.
- `backend/` FastAPI service skeleton with clean service boundaries, SQLAlchemy database configuration, routers, schemas, engines, and fixture loader.
- `fixtures/` Oracle OTM 26B CSV fixture files.
- `docker/` Docker and compose assets.
- `docs/` Architecture notes.

Business workflow features are intentionally stubbed until the architecture layer is complete.

