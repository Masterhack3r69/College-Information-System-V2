# Development Setup

## Required Software

- Java 21 and Maven 3.x for backend development.
- Node.js and npm compatible with the checked `package-lock.json`.
- Docker Desktop/Engine for PostgreSQL integration tests and the Compose stack.

## Environment Variables

Supported configuration includes `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, JWT expiration values, `CORS_ALLOWED_ORIGINS`, school identity fields, document/material/form/request storage roots, and `STUDENT_ACCOUNT_PROVISIONING_ENABLED`. The frontend supports `VITE_API_BASE_URL`.

Do not commit real secrets. Override all fallback credentials and JWT values outside local development.

## Database and Full Stack

```powershell
docker compose up --build
```

This exposes PostgreSQL on `5432`, backend on `8080`, and Nginx frontend on `3000`. Flyway migrations apply during backend startup.

## Frontend Development

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`; Vite proxies API requests to `http://localhost:8080`.

## Build and Test Commands

```powershell
mvn test
cd frontend
npm run build
npm run lint
npm run test:e2e
```

E2E tests require a running, seeded application and valid test credentials/configuration.

## Common Development Issues

- `PostgresMigrationTests` skips when Docker is unavailable.
- Existing Playwright artifacts are not proof of current failure or success; run the suite against the current stack.
- The frontend production build currently warns about a large main chunk.

## Related Notes

- [[System Architecture]]
- [[Known Issues]]
- [[MVP Completion Checklist]]

