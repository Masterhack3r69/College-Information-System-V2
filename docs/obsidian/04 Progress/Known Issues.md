# Known Issues

## Frontend Lint Fails

- Severity: Medium
- Module: Frontend / Testing
- Current behavior: `npm run lint` exits with 42 errors and 9 warnings across E2E specs, shared UI files, hooks, and large module pages.
- Expected behavior: ESLint exits successfully with no errors and an agreed warning policy.
- Suspected cause: Unused values, explicit `any` types, React fast-refresh export rules, effect-driven state updates, and related rule violations accumulated during MVP development.
- Temporary workaround: `npm run build` still succeeds; treat lint as a required cleanup gate rather than proof the application cannot run.
- Status: Open

## PostgreSQL Migration Test Skipped

- Severity: Medium
- Module: Database / Testing
- Current behavior: `mvn test` passes 75 tests and skips `PostgresMigrationTests` when Docker is unavailable.
- Expected behavior: Flyway `V1`–`V15` apply to PostgreSQL 16 and Hibernate validates the resulting schema.
- Suspected cause: Docker daemon unavailable to Testcontainers.
- Temporary workaround: Run `mvn test` on a machine with Docker enabled.
- Status: Open

## Existing Academic Setup E2E Failure Artifacts

- Severity: Medium
- Module: Academic Setup / Testing
- Current behavior: `frontend/test-results/` contains failure screenshots, traces, and videos for department, program, and curriculum tests.
- Expected behavior: A fresh configured Playwright run establishes current pass/fail status.
- Suspected cause: Not determined from artifacts alone; test environment or implementation may have changed.
- Temporary workaround: Start a clean stack and rerun the relevant specifications.
- Status: Verification needed

## Faculty Top-Level Routes Redirect

- Severity: Low
- Module: Faculty Portal
- Current behavior: `/faculty/attendance`, `/faculty/content`, and `/faculty/reports` redirect to `/faculty/classes`.
- Expected behavior: Product decision needed: redirect to class selection or provide dedicated index pages.
- Suspected cause: `FacultySectionIndex` intentionally returns a redirect.
- Temporary workaround: Select a class and use its workspace tabs/actions.
- Status: Open question

## Large Frontend Main Chunk

- Severity: Low
- Module: Frontend
- Current behavior: `npm run build` succeeds but emits a chunk-size warning; the main minified chunk is approximately 3.1 MB before gzip.
- Expected behavior: Keep initial bundles within an agreed performance budget.
- Suspected cause: Large administrative pages and shared imports remain in the main bundle.
- Temporary workaround: Current build is functional; use route/component code splitting when optimizing.
- Status: Open

## Local Development Defaults Are Unsafe for Production

- Severity: High if deployed unchanged
- Module: Security / Deployment
- Current behavior: Compose and application configuration include fallback database credentials and JWT secret for local use.
- Expected behavior: Production supplies unique secrets outside source control.
- Suspected cause: MVP local-development convenience.
- Temporary workaround: Override all credential/secret environment variables.
- Status: Must resolve before production

## Redis Is Provisioned but Unused

- Severity: Low
- Module: Deployment
- Current behavior: Compose starts Redis, but no verified application integration uses it.
- Expected behavior: Remove it from the MVP stack or document and implement its purpose.
- Suspected cause: Planned infrastructure was scaffolded before a use case was implemented.
- Temporary workaround: Redis may remain unused locally.
- Status: Open

## Related Notes

- [[In Progress]]
- [[Development Setup]]
- [[MVP Completion Checklist]]
