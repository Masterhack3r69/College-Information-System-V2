# Frontend Structure

## Framework and Main Folders

- React 19 + TypeScript + Vite in `frontend/`.
- `src/pages`: administrative, setup, faculty, and student screens.
- `src/hooks`: TanStack Query hooks grouped by domain.
- `src/lib`: API client, authentication context, types, and utilities.
- `src/components/ui`: shadcn/ui primitives.

## Routing and Layouts

`App.tsx` defines three guarded areas:

- `/admin/*` uses the administrative sidebar and permission guards.
- `/faculty/*` requires the faculty portal permission and linked faculty ID.
- `/student/*` requires the student portal permission and linked student ID.

Legacy top-level admin paths redirect under `/admin`. Student forced-password-change routing is enforced before other student pages.

## State, Forms, and Validation

- TanStack Query handles remote queries, mutations, invalidation, and caching.
- Auth context handles user state, portal selection, token refresh, and permission checks.
- React Hook Form and Zod are used in complex forms; some compact portal screens use local state and server validation.
- Sonner toasts and API error envelopes surface feedback.

## API Communication

`src/lib/api.ts` uses `VITE_API_BASE_URL` or `/api/v1`, attaches bearer tokens, performs one refresh/retry after `401`, supports multipart data, PDF opening, and downloads.

## Role-Based Navigation

Administrative links are filtered by permission; route guards also block direct navigation. Faculty and student shells provide portal-specific menus and optional portal switching.

## Current Limitations

- The production build reports a main JavaScript chunk above 3 MB before gzip and warns about chunks over 500 kB.
- Faculty attendance/content/report top-level routes redirect to classes.
- Browser tests focus mainly on academic setup; current portal E2E coverage is limited.

## Related Notes

- [[System Architecture]]
- [[Authentication and Roles]]
- [[Development Setup]]

