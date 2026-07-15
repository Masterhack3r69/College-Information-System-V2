# Feature: Finance Modernization

#status/completed #type/feature #module/finance

## Status

Completed

## Purpose

Upgrade basic billing into a controlled finance suite with immutable history, concurrency protection, independent approvals, cashier accountability, reporting, and student self-service.

## Users and Roles

- `CASHIER`, `FINANCE_MANAGER`, `SUPER_ADMIN`, `REGISTRAR`, `STUDENT`

## Requirements and Business Rules

- Monetary values are PHP with two decimals; business dates use Asia/Manila.
- Client totals and receipt numbers are never trusted.
- Each financial write uses a unique UUID request ID.
- Sensitive requesters cannot approve their own records; refund approvers cannot disburse.
- Credits stay on the assessment and require refund; no cross-term transfer.
- Enrollment cancellation is separate from Finance resolution.

## Main Workflow

See [[Billing]] for payment, adjustment, cancellation/refund, installment, receipt, and closeout flows.

## Backend Tasks

- [x] V16 migration, role, permissions, backfill, constraints, indexes
- [x] V17 development finance reset and representative college fee catalog
- [x] Locked/recomputed assessment ledger and stable finance error codes
- [x] Adjustment, cancellation, refund, installment, receipt-series, and session services
- [x] Administrative API, collection exports, point-in-time receipts, student-owned receipt route
- [x] Enrollment Finance-resolution guard

## Frontend Tasks

- [x] Permission-aware Finance dashboard/workspaces
- [x] Server-managed OR payment form and request-based voiding
- [x] Adjustment/refund/cancellation/installment actions and approval queue
- [x] Session closeout, receipt series, templates, CSV/PDF reports
- [x] All-term student finance and receipt downloads

## Database Changes

- [x] Documented in [[Finance Data Dictionary]]

## API Endpoints

- [[Finance Endpoints]]

## Validation and Audit

- Stable codes include `FINANCE_RESOLUTION_REQUIRED`, `INSUFFICIENT_CREDIT`, `AMBIGUOUS_FEE_RULE`, `RECEIPT_SERIES_EXHAUSTED`, `CASHIER_SESSION_REQUIRED`, and `CONCURRENT_FINANCE_UPDATE`.
- Requests, decisions, execution, disbursement, reversal, OR allocation, plan override, session transition, exports, and student receipt access emit audit events.

## Test Cases

- [x] Core finance/enrollment service tests
- [x] Clean PostgreSQL 16 Flyway V1–V16 migration
- [x] Frontend production build
- [ ] Automated multi-thread PostgreSQL finance mutation tests
- [ ] Full cross-role browser suite

## Open Questions

- Select the operational process for assigning cashier UUIDs to receipt series in the UI.
- Define aging buckets and final finance dashboard KPIs beyond the current aggregate metrics/export.
- Replace the V17 representative rates with the institution-approved fee schedule before production use.

## Related Notes

- [[Billing]]
- [[Enrollment]]
- [[Student Portal]]
- [[ADR-002 Finance Ledger and Approval Controls]]
