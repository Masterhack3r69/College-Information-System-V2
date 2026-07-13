# Backend Structure

## Framework

Java 21 and Spring Boot 3.3.7 with Spring MVC, Data JPA, Security, Validation, Flyway, PostgreSQL, JJWT, PDFBox, and mail support.

## Packages and Layers

- Domain packages: `auth`, `audit`, `setup`, `curriculum`, `student`, `schedule`, `enrollment`, `fee`, `grade`, `faculty`, `report`, and `storage`.
- Controllers expose `/api/v1` REST endpoints and method-level authorization.
- Services hold workflows and business rules; several newer portal workflows use `JdbcTemplate` for explicit queries.
- Repositories are Spring Data JPA interfaces; entities represent persistent domain objects.
- DTO records/classes carry validated requests and responses.

## Validation and Errors

Jakarta Bean Validation handles field constraints. Services throw `BusinessRuleException` or `NotFoundException`; `GlobalExceptionHandler` converts errors to the shared `ApiResponse` envelope and field-error format.

## Security

`SecurityConfig` creates a stateless filter chain, BCrypt encoder, JWT filter, CORS policy, JSON 401/403 responses, and method security. Only login and refresh are anonymous.

## Persistence and Migrations

Flyway applies `V1`–`V15`; Hibernate validates rather than creates schema. JPA auditing provides timestamps for many entities, while migrations add constraints and indexes.

## Other Services

- `FileStorageService` stores and reads documents, materials, forms, and fulfilled requests below configured roots with normalized-path checks.
- Report services generate PDFs and record generated-report metadata.
- Audit service records authentication and sensitive mutations.

## Current Limitations

- Local filesystem storage is unsuitable for multi-instance deployment.
- Redis is present in Compose but unused by verified backend code.
- PostgreSQL migration integration testing depends on Docker and was skipped in the latest local test run.

## Related Notes

- [[Database Overview]]
- [[Authentication and Roles]]
- [[System Architecture]]

