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

## Enrollment Final-Seat Race Is Not Yet an Automated CI Test

- Severity: Medium
- Module: Enrollment / Testing
- Current behavior: Confirmation pessimistically locks schedule rows and recounts confirmed seats. Service tests cover capacity rules and the live PostgreSQL schema is validated, but a repeatable multi-session final-seat race is not in CI.
- Expected behavior: Two concurrent confirmations for one remaining seat produce exactly one confirmation.
- Status: Automation gap; see [[Enrollment]].

## Academic Exception Cross-Role Browser Suite Is Incomplete

- Severity: Medium
- Module: Academic Exceptions / Testing
- Current behavior: API smoke testing verified the full evaluation-to-credit workflow and focused desktop/mobile UI checks passed. Separate Dean, Program Head, Registrar, and Student browser sessions are not automated.
- Expected behavior: CI proves department scoping, final approval separation, student-only visibility, returns/rejections, grouped-source reuse prevention, migration impact, and reversal authorization.
- Status: Automation gap; see [[Academic Exceptions]].

## Institutional Academic Policies Need Configuration

- Severity: High before production
- Module: Academic Setup / Enrollment
- Current behavior: Policy and elective-group engines are implemented but no institutional probation, leave, equivalency threshold, migration, or elective rules are seeded.
- Expected behavior: Academic leadership approves and configures production rules per school year/program.
- Status: Open operational decision.

## Deferred Student-Type Modules

- Severity: Product scope
- Module: Admissions / Student Records
- Current behavior: Admissions intake, special/non-degree enrollment, international compliance, bridging-plan administration, readmission administration, and institutional graduation clearance remain outside the academic-exception implementation.
- Expected behavior: Define each as a separate module without overloading student classification/status enums.
- Status: Future scope.

## Frontend Lint Fails

- Severity: Medium
- Module: Frontend / Testing
- Current behavior: Pre-existing repo-wide ESLint errors and warnings remain outside the Finance build gate.
- Expected behavior: ESLint exits successfully with an agreed warning policy.
- Status: Open.

## Existing Academic Setup E2E Failure Artifacts

- Severity: Medium
- Module: Academic Setup / Testing
- Current behavior: Stored full-suite failure artifacts remain. Focused eligibility/elective desktop and 375 px checks passed on 2026-07-16 without console errors or overflow.
- Status: Full-suite verification still needed.

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
