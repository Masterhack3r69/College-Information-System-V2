# MVP Decisions

## Modular Monolith with Shared Backend

- Status: Accepted
- Reason: All administrative and portal modules are implemented in one Spring Boot application with domain packages.
- Current impact: One deployment and database serve registrar, cashier, faculty, and student workflows.
- Future consideration: Split services only if measured operational needs justify it.

## Single React Application with Portal Shells

- Status: Accepted
- Reason: `/admin`, `/faculty`, and `/student` share components, authentication, and API infrastructure while retaining role-specific layouts.
- Current impact: Users with multiple available portals can switch without separate deployments.
- Future consideration: Revisit only if independent release/security boundaries become necessary.

## PostgreSQL with Flyway as Schema Authority

- Status: Accepted
- Reason: PostgreSQL supports constraints, JSONB audit values, indexing, and the relational workflows required by the MVP.
- Current impact: Flyway `V1`–`V20` is the physical schema source; Hibernate validates mapped entities against it.
- Future consideration: Maintain migration tests against real PostgreSQL.

## JWT Access Tokens and Persisted Refresh Tokens

- Status: Accepted
- Reason: Supports stateless API authentication while allowing refresh rotation and revocation.
- Current impact: Access tokens are bearer JWTs; refresh tokens are stored in the database and frontend `sessionStorage`.
- Future consideration: Evaluate hardened browser token strategies, MFA, and rate limiting for production.

## Permission and Ownership-Based Authorization

- Status: Accepted
- Reason: Roles alone are too coarse for registrar/cashier/faculty/student boundaries.
- Current impact: Seeded roles grant named permissions, controller methods enforce them, and faculty/student helpers enforce record ownership.
- Future consideration: Keep expanding permission/ownership tests as new role-scoped modules are added. `PROGRAM_HEAD` now has department-scoped academic evaluation and graduation-audit permissions.

## Local Files for MVP Uploads

- Status: Accepted for local MVP
- Reason: Simplifies development of student documents, class materials, forms, and fulfilled requests.
- Current impact: Files live below configured local roots with normalized path validation.
- Future consideration: Replace with durable shared storage before multi-instance or production deployment.

## Local Docker Compose Deployment

- Status: Accepted for development
- Reason: Provides a reproducible frontend/backend/database stack with minimal setup.
- Current impact: Not production hardened; Redis is currently unused.
- Future consideration: Define production target, secrets, HTTPS, backups, monitoring, and whether Redis is needed.

## Related Notes

- [[System Architecture]]
- [[Authentication and Roles]]
- [[MVP Scope]]
