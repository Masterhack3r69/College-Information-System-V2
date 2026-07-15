# Change Log

## 2026-07-15

### Added

- Finance Manager role, granular permissions, immutable adjustment/refund/cancellation ledgers, installments, managed receipt series, cashier sessions, approval queue, reports, and student receipt access.
- Representative 15-item college fee catalog with active-year rules, BSIT overrides, and year-level charges.

### Changed

- Payments now require idempotency IDs, an open session, and server-allocated OR numbers; assessments derive gross/refund/net/balance/credit totals under lock.
- Enrollment cancellation now requires resolved Finance state when an assessment exists.
- Fee selection uses the enrollment year and most-specific rule per fee item.
- V17 intentionally resets all development Finance transactions and setup before installing the new fee catalog.

### Fixed

- Concurrent overpayment exposure, orphaned assessed-enrollment cancellation, mutable direct voiding, current-balance receipt output, and missing student receipt ownership checks.

### Documentation

- Updated [[Billing]], [[Enrollment]], [[Student Portal]], [[User Roles]], [[Database Overview]], [[Known Issues]], and [[MVP Dashboard]].
- Documented the V17 reset boundaries, seeded rates, and required production approval.
