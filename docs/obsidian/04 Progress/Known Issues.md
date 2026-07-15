# Known Issues

## Seeded Finance Rates Require Institutional Approval

- Severity: High before production
- Module: Finance / Fee Setup
- Current behavior: V17 seeds a coherent representative PHP college fee schedule for development and demonstrations.
- Expected behavior: Finance leadership replaces or formally approves every amount, applicability scope, installment date, and receipt assignment before production enrollment assessment.
- Status: Open operational decision; see [[Billing]].

## Finance Concurrency Suite Is Not Yet Automated

- Severity: Medium
- Module: Finance / Testing
- Current behavior: Assessment locking, unique request IDs, locked receipt allocation, and refund reservation are implemented and core service tests pass. Dedicated multi-thread PostgreSQL mutation tests remain to be added.
- Expected behavior: CI proves simultaneous payments cannot overpay, retries do not skip ORs, reservations cannot overcommit credit, and adjustment/payment races converge.
- Status: Test coverage gap; see [[Finance Test Cases]].

## Finance Browser Regression Suite Is Incomplete

- Severity: Medium
- Module: Finance / Frontend
- Current behavior: Production build passes and workspaces are implemented, but the complete cashier-through-closeout, approval, OR exhaustion, cancellation, and cross-student denial suite has not been automated.
- Expected behavior: Stable cross-role browser tests cover the modernized workflow.
- Status: Open verification work.

## Registrar Finance Resolution Display Needs Visual Verification

- Severity: Low
- Module: Enrollment / Finance
- Current behavior: The backend returns stable `FINANCE_RESOLUTION_REQUIRED` and the UI shows the blocking API message. A dedicated inline resolution-status panel is not yet present.
- Expected behavior: Registrar can see resolution state before attempting cancellation.
- Status: UI enhancement.

## Frontend Lint Fails

- Severity: Medium
- Module: Frontend / Testing
- Current behavior: Pre-existing repo-wide ESLint errors and warnings remain outside the Finance build gate.
- Expected behavior: ESLint exits successfully with an agreed warning policy.
- Status: Open.

## Existing Academic Setup E2E Failure Artifacts

- Severity: Medium
- Module: Academic Setup / Testing
- Current behavior: Stored failure artifacts require a fresh configured Playwright run.
- Status: Verification needed.

## Faculty Top-Level Routes Redirect

- Severity: Low
- Module: Faculty Portal
- Current behavior: `/faculty/attendance`, `/faculty/content`, and `/faculty/reports` redirect to class selection.
- Status: Product decision required.

## Large Frontend Main Chunk

- Severity: Low
- Module: Frontend
- Current behavior: `npm run build` passes but reports an approximately 3.1 MB pre-gzip main chunk. Finance itself is route-lazy.
- Status: Performance optimization.

## Local Development Defaults Are Unsafe for Production

- Severity: High if deployed unchanged
- Module: Security / Deployment
- Current behavior: Local fallback database credentials and JWT secret exist.
- Status: Must resolve before production.

## Redis Is Provisioned but Unused

- Severity: Low
- Module: Deployment
- Status: Open.

## Related Notes

- [[In Progress]]
- [[Finance Modernization]]
- [[Development Setup]]
